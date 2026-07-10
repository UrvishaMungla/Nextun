import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from .market_utils import is_market_open

# ─── Timeframe Configuration ──────────────────────────────────────────────────
# Maps UI timeframe → (yfinance_interval, yfinance_period, resample_from)
# Note: yfinance caps intraday data:
#   15m / 30m → max 60 days  |  1h+ → up to 6 months
TIMEFRAME_CONFIG = {
    '15m': {'interval': '15m',  'period': '60d',  'resample': None},
    '30m': {'interval': '30m',  'period': '60d',  'resample': None},
    '45m': {'interval': '15m',  'period': '60d',  'resample': '45min'},
    '1h':  {'interval': '60m',  'period': '730d', 'resample': None},
    '2h':  {'interval': '60m',  'period': '730d', 'resample': '2h'},
    '4h':  {'interval': '60m',  'period': '730d', 'resample': '4h'},
    '1d':  {'interval': '1d',   'period': '5y',   'resample': None},
}


# ─── Data Fetcher ─────────────────────────────────────────────────────────────
def fetch_ohlcv(symbol, timeframe):
    """Fetch OHLCV from Yahoo Finance with resampling for unsupported intervals."""
    cfg = TIMEFRAME_CONFIG.get(timeframe)
    if not cfg:
        return None, f'Unsupported timeframe: {timeframe}'

    try:
        df = yf.download(
            symbol,
            period=cfg['period'],
            interval=cfg['interval'],
            progress=False,
            auto_adjust=True
        )
    except Exception as e:
        return None, str(e)

    if df is None or df.empty:
        return None, f'No data for {symbol}. Check the ticker symbol.'

    # Flatten MultiIndex columns (yfinance quirk)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] for c in df.columns]

    # Normalise column names
    df.rename(columns={
        'open': 'Open', 'high': 'High', 'low': 'Low',
        'close': 'Close', 'volume': 'Volume'
    }, inplace=True)

    # Resample for non-native intervals (45m, 2h, 4h)
    if cfg['resample']:
        df = df.resample(cfg['resample']).agg({
            'Open': 'first', 'High': 'max',
            'Low': 'min',   'Close': 'last',
            'Volume': 'sum'
        }).dropna()

    df.dropna(inplace=True)
    return df, None


# ─── ATR Calculator ───────────────────────────────────────────────────────────
def compute_atr(df, period=14):
    h = df['High']
    l = df['Low']
    c = df['Close'].shift(1)
    tr = pd.concat([h - l, (h - c).abs(), (l - c).abs()], axis=1).max(axis=1)
    return tr.rolling(period).mean()


# ─── Swing High / Low Detection (using actual High/Low prices) ────────────────
def find_swing_highs(high_series, order=3):
    """Swing highs detected from the HIGH prices of candles."""
    peaks = []
    n = len(high_series)
    for i in range(order, n - order):
        candidate = high_series.iloc[i]
        left  = high_series.iloc[i - order:i]
        right = high_series.iloc[i + 1:i + order + 1]
        if (candidate >= left.max()) and (candidate >= right.max()):
            # Avoid duplicate adjacent peaks
            if not peaks or (i - peaks[-1]) >= 2:
                peaks.append(i)
    return peaks


def find_swing_lows(low_series, order=3):
    """Swing lows detected from the LOW prices of candles."""
    valleys = []
    n = len(low_series)
    for i in range(order, n - order):
        candidate = low_series.iloc[i]
        left  = low_series.iloc[i - order:i]
        right = low_series.iloc[i + 1:i + order + 1]
        if (candidate <= left.min()) and (candidate <= right.min()):
            if not valleys or (i - valleys[-1]) >= 2:
                valleys.append(i)
    return valleys


# ─── Main Backtest Engine ─────────────────────────────────────────────────────
def backtest_strategy(symbol, timeframe='1h', use_market_hours=False):
    """
    Double Top / Double Bottom backtest engine.

    Rules (from PDF):
    ─────────────────────────────────────────────────────────────────────
    Pattern  │ Two peaks (Double Top) or troughs (Double Bottom)
             │ within 10–60 candles, price diff < 1.5%
    Entry    │ Close of the neckline-break candle (momentum close)
    SL       │ Above/below both pattern extremes + 0.15% buffer
    TP1      │ Risk × 1.0  → close 50% of position (partial)
    TP2      │ Risk × 2.0  → close remaining 50%
    After TP1│ Move SL to breakeven
    ─────────────────────────────────────────────────────────────────────
    """
    df, err = fetch_ohlcv(symbol, timeframe)
    if err:
        return {'error': err}

    n = len(df)
    if n < 50:
        return {'error': f'Not enough bars ({n}) for {symbol}/{timeframe}.'}

    highs  = df['High'].squeeze()
    lows   = df['Low'].squeeze()
    opens  = df['Open'].squeeze()
    closes = df['Close'].squeeze()
    atr    = compute_atr(df, period=14).squeeze()

    # Adaptive window: smaller for daily/4h (fewer bars), larger for 15m
    order = 2 if timeframe in ('1d', '4h') else 3

    peaks   = find_swing_highs(highs, order)
    valleys = find_swing_lows(lows, order)

    # Convert to NumPy arrays for fast lookup in the main loop
    highs_val  = highs.values
    lows_val   = lows.values
    opens_val  = opens.values
    closes_val = closes.values
    atr_val    = atr.values
    times_val  = df.index

    trades       = []
    total_pnl    = 0.0
    wins = partials = losses = 0

    in_trade     = False
    trade_type   = None
    entry_price  = sl = tp1 = tp2 = 0.0
    entry_time   = None
    partial_done = False
    pattern_type = None   # 'DOUBLE_TOP' or 'DOUBLE_BOTTOM'
    
    peak_ptr = 0
    valley_ptr = 0
    num_peaks = len(peaks)
    num_valleys = len(valleys)

    for idx in range(n):
        curr_time  = times_val[idx]
        curr_high  = float(highs_val[idx])
        curr_low   = float(lows_val[idx])
        curr_open  = float(opens_val[idx])
        curr_close = float(closes_val[idx])
        
        # Check market hours if enabled (only applies to new entries)
        if use_market_hours and not is_market_open(curr_time, symbol):
            continue

        # ── Manage open trade ──────────────────────────────────────────
        if in_trade:
            if trade_type == 'SHORT':
                # SL hit (price goes above SL)
                if curr_high >= sl:
                    if partial_done:
                        pnl = (entry_price - tp1) * 0.5 + (entry_price - sl) * 0.5
                        partials += 1
                        status = 'PARTIAL'
                    else:
                        pnl = entry_price - sl   # negative
                        losses += 1
                        status = 'LOSS'
                    total_pnl += pnl
                    trades.append(_make_trade(trade_type, pattern_type, entry_time,
                                              curr_time, entry_price, sl, pnl, status, symbol))
                    in_trade = partial_done = False

                elif not partial_done and curr_low <= tp1:
                    # TP1 hit → close half, trail SL to breakeven
                    partial_done = True
                    sl = entry_price  # breakeven

                elif partial_done and curr_low <= tp2:
                    # TP2 hit → close remaining half → full WIN
                    pnl = (entry_price - tp1) * 0.5 + (entry_price - tp2) * 0.5
                    total_pnl += pnl
                    wins += 1
                    trades.append(_make_trade(trade_type, pattern_type, entry_time,
                                              curr_time, entry_price, tp2, pnl, 'WIN', symbol))
                    in_trade = partial_done = False

            elif trade_type == 'LONG':
                # SL hit
                if curr_low <= sl:
                    if partial_done:
                        pnl = (tp1 - entry_price) * 0.5 + (sl - entry_price) * 0.5
                        partials += 1
                        status = 'PARTIAL'
                    else:
                        pnl = sl - entry_price   # negative
                        losses += 1
                        status = 'LOSS'
                    total_pnl += pnl
                    trades.append(_make_trade(trade_type, pattern_type, entry_time,
                                              curr_time, entry_price, sl, pnl, status, symbol))
                    in_trade = partial_done = False

                elif not partial_done and curr_high >= tp1:
                    partial_done = True
                    sl = entry_price  # breakeven

                elif partial_done and curr_high >= tp2:
                    pnl = (tp1 - entry_price) * 0.5 + (tp2 - entry_price) * 0.5
                    total_pnl += pnl
                    wins += 1
                    trades.append(_make_trade(trade_type, pattern_type, entry_time,
                                              curr_time, entry_price, tp2, pnl, 'WIN', symbol))
                    in_trade = partial_done = False

            continue  # Skip entry scan while in a trade

        # Skip if ATR not yet available
        curr_atr = float(atr_val[idx]) if not np.isnan(atr_val[idx]) else 0
        if curr_atr == 0:
            continue

        # ── Scan for Double Top ────────────────────────────────────────
        while peak_ptr < num_peaks and peaks[peak_ptr] < idx:
            peak_ptr += 1

        if peak_ptr >= 2:
            p2, p1 = peaks[peak_ptr - 1], peaks[peak_ptr - 2]
            dist = p2 - p1

            if 10 <= dist <= 60 and (idx - p2) <= 15:
                # Use HIGH prices for the two tops
                p1_high = float(highs_val[p1])
                p2_high = float(highs_val[p2])
                pdiff = abs(p1_high - p2_high) / p1_high

                if pdiff <= 0.015:  # Within 1.5%
                    # Neckline = lowest low between the two tops
                    neckline = float(np.min(lows_val[p1:p2 + 1]))

                    # Confirmation: bearish candle that CLOSES below neckline
                    if curr_close < curr_open and curr_close < neckline:
                        ep   = curr_close
                        sl_  = max(p1_high, p2_high) * 1.002  # 0.2% above higher top
                        risk = sl_ - ep

                        # Validate risk is at least 0.3× ATR (filter noise)
                        if risk >= 0.3 * curr_atr and risk > 0 and ep > 0:
                            tp1_ = ep - risk          # 1:1
                            tp2_ = ep - 2.0 * risk    # 1:2
                            entry_price  = ep
                            sl = sl_; tp1 = tp1_; tp2 = tp2_
                            in_trade     = True
                            partial_done = False
                            trade_type   = 'SHORT'
                            pattern_type = 'DOUBLE_TOP'
                            entry_time   = curr_time
                            continue

        # ── Scan for Double Bottom ─────────────────────────────────────
        while valley_ptr < num_valleys and valleys[valley_ptr] < idx:
            valley_ptr += 1

        if valley_ptr >= 2:
            v2, v1 = valleys[valley_ptr - 1], valleys[valley_ptr - 2]
            dist = v2 - v1

            if 10 <= dist <= 60 and (idx - v2) <= 15:
                # Use LOW prices for the two bottoms
                v1_low = float(lows_val[v1])
                v2_low = float(lows_val[v2])
                vdiff = abs(v1_low - v2_low) / v1_low

                if vdiff <= 0.015:
                    # Neckline = highest high between the two bottoms
                    neckline = float(np.max(highs_val[v1:v2 + 1]))

                    # Confirmation: bullish candle that CLOSES above neckline
                    if curr_close > curr_open and curr_close > neckline:
                        ep   = curr_close
                        sl_  = min(v1_low, v2_low) * 0.998  # 0.2% below lower bottom
                        risk = ep - sl_

                        if risk >= 0.3 * curr_atr and risk > 0 and ep > 0:
                            tp1_ = ep + risk          # 1:1
                            tp2_ = ep + 2.0 * risk    # 1:2
                            entry_price  = ep
                            sl = sl_; tp1 = tp1_; tp2 = tp2_
                            in_trade     = True
                            partial_done = False
                            trade_type   = 'LONG'
                            pattern_type = 'DOUBLE_BOTTOM'
                            entry_time   = curr_time
                            continue

    # ── Compute final statistics ───────────────────────────────────────────────
    total_trades = wins + partials + losses
    win_rate = round((wins + partials) / total_trades * 100, 2) if total_trades > 0 else 0

    # ── Daily PnL breakdown (for calendar) ────────────────────────────────────
    daily_pnl = {}
    for t in trades:
        try:
            dt = t['exit_time'][:10]   # 'YYYY-MM-DD'
            daily_pnl[dt] = round(daily_pnl.get(dt, 0) + t['pnl'], 6)
        except Exception:
            pass

    # ── Recent candles for chart (last 200) ───────────────────────────────────
    recent = df.tail(200).copy()
    candles = []
    for ts, row in recent.iterrows():
        candles.append({
            'time':  int(ts.timestamp()),
            'open':  round(float(row['Open']),  5),
            'high':  round(float(row['High']),  5),
            'low':   round(float(row['Low']),   5),
            'close': round(float(row['Close']), 5),
        })

    return {
        'symbol':       symbol,
        'timeframe':    timeframe,
        'period':       TIMEFRAME_CONFIG[timeframe]['period'],
        'total_bars':   n,
        'total_trades': total_trades,
        'wins':         wins,
        'partials':     partials,
        'losses':       losses,
        'win_rate':     win_rate,
        'total_pnl':    round(total_pnl, 6),
        'daily_pnl':    daily_pnl,
        'trades':       trades,
        'candles':      candles,
    }


def _make_trade(type_, pattern, entry_time, exit_time,
                entry_price, exit_price, pnl, status, symbol):
    return {
        'type':         type_,           # 'LONG' / 'SHORT'
        'pattern':      pattern,         # 'DOUBLE_TOP' / 'DOUBLE_BOTTOM'
        'symbol':       symbol,
        'entry_time':   str(entry_time),
        'exit_time':    str(exit_time),
        'entry_price':  round(float(entry_price), 5),
        'exit_price':   round(float(exit_price),  5),
        'pnl':          round(float(pnl),         6),
        'status':       status,          # 'WIN' / 'PARTIAL' / 'LOSS'
    }
