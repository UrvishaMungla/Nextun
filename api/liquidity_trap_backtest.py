import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, time

# ─── Configuration ────────────────────────────────────────────────────────────
# Execution timeframe mapping to structure timeframe and yfinance periods
# yfinance limit: 1m max 7d, 5m max 60d
EXECUTION_CONFIG = {
    '1m': {'exec_interval': '1m', 'exec_period': '7d', 'struct_interval': '1h', 'struct_period': '1mo'},
    '5m': {'exec_interval': '5m', 'exec_period': '60d', 'struct_interval': '1h', 'struct_period': '3mo'},
    '15m': {'exec_interval': '15m', 'exec_period': '60d', 'struct_interval': '4h', 'struct_period': '3mo'},
}

from .market_utils import is_market_open

def fetch_data(symbol, period, interval):
    try:
        df = yf.download(symbol, period=period, interval=interval, progress=False, auto_adjust=True)
        if df is None or df.empty:
            return None, f"No data for {symbol} at {interval}."
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [c[0] for c in df.columns]
        df.rename(columns={'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'}, inplace=True)
        df.dropna(inplace=True)
        return df, None
    except Exception as e:
        return None, str(e)

def backtest_liquidity_trap(symbol, timeframe='5m', use_market_hours=False):
    cfg = EXECUTION_CONFIG.get(timeframe)
    if not cfg:
        return {'error': f'Unsupported timeframe for Liquidity Trap: {timeframe}'}

    # Fetch Execution Data
    exec_df, err = fetch_data(symbol, cfg['exec_period'], cfg['exec_interval'])
    if err: return {'error': err}
    
    # Fetch Structure Data (1H or 4H)
    struct_df, err = fetch_data(symbol, cfg['struct_period'], cfg['struct_interval'])
    if err: return {'error': err}

    if len(exec_df) < 50 or len(struct_df) < 24:
        return {'error': f'Not enough data bars for {symbol}.'}

    # Map Major Liquidity Pools (Rolling 24-hour High/Low)
    # Assuming struct_interval is 1h (1 bar = 1 hour), 24 window = 24 hours
    # If 4h, window = 6 bars
    struct_window = 24 if cfg['struct_interval'] == '1h' else 6
    struct_df['Major_High'] = struct_df['High'].rolling(window=struct_window).max().shift(1)
    struct_df['Major_Low'] = struct_df['Low'].rolling(window=struct_window).min().shift(1)
    struct_df.dropna(inplace=True)

    trades = []
    total_pnl = 0.0
    wins = partials = losses = 0

    in_trade = False
    trade_type = None
    entry_price = sl = tp1 = tp2 = 0.0
    entry_time = None
    partial_done = False
    pattern_type = None

    # Merge Structure levels onto Execution bars using merge_asof (no lookahead)
    temp_struct = pd.DataFrame({
        'Major_High': struct_df['Major_High'],
        'Major_Low': struct_df['Major_Low'],
    }, index=struct_df.index)

    # Align timezone info
    if exec_df.index.tz is not None and temp_struct.index.tz is None:
        temp_struct.index = temp_struct.index.tz_localize(exec_df.index.tz)
    elif exec_df.index.tz is None and temp_struct.index.tz is not None:
        temp_struct.index = temp_struct.index.tz_convert(None)

    exec_df = pd.merge_asof(
        exec_df.sort_index(),
        temp_struct.sort_index(),
        left_index=True,
        right_index=True,
        direction='backward'
    )

    for i in range(1, len(exec_df)):
        curr_time = exec_df.index[i]
        
        # Check market hours if enabled
        if use_market_hours and not is_market_open(curr_time, symbol):
            continue

        curr_open = exec_df['Open'].iloc[i]
        curr_high = exec_df['High'].iloc[i]
        curr_low = exec_df['Low'].iloc[i]
        curr_close = exec_df['Close'].iloc[i]
        
        prev_open = exec_df['Open'].iloc[i-1]
        prev_high = exec_df['High'].iloc[i-1]
        prev_low = exec_df['Low'].iloc[i-1]
        prev_close = exec_df['Close'].iloc[i-1]

        major_high = exec_df['Major_High'].iloc[i]
        major_low = exec_df['Major_Low'].iloc[i]

        if pd.isna(major_high) or pd.isna(major_low):
            continue

        if in_trade:
            # Manage trade
            if trade_type == 'LONG':
                if curr_low <= sl:
                    if partial_done:
                        pnl = (tp1 - entry_price) * 0.5 + (sl - entry_price) * 0.5
                        partials += 1
                        status = 'PARTIAL'
                    else:
                        pnl = sl - entry_price
                        losses += 1
                        status = 'LOSS'
                    total_pnl += pnl
                    trades.append(_make_trade(trade_type, pattern_type, entry_time, curr_time, entry_price, sl, pnl, status, symbol))
                    in_trade = False
                elif not partial_done and curr_high >= tp1:
                    partial_done = True
                    sl = entry_price # Move SL to breakeven
                elif partial_done and curr_high >= tp2:
                    pnl = (tp1 - entry_price) * 0.5 + (tp2 - entry_price) * 0.5
                    total_pnl += pnl
                    wins += 1
                    trades.append(_make_trade(trade_type, pattern_type, entry_time, curr_time, entry_price, tp2, pnl, 'WIN', symbol))
                    in_trade = False
            elif trade_type == 'SHORT':
                if curr_high >= sl:
                    if partial_done:
                        pnl = (entry_price - tp1) * 0.5 + (entry_price - sl) * 0.5
                        partials += 1
                        status = 'PARTIAL'
                    else:
                        pnl = entry_price - sl
                        losses += 1
                        status = 'LOSS'
                    total_pnl += pnl
                    trades.append(_make_trade(trade_type, pattern_type, entry_time, curr_time, entry_price, sl, pnl, status, symbol))
                    in_trade = False
                elif not partial_done and curr_low <= tp1:
                    partial_done = True
                    sl = entry_price
                elif partial_done and curr_low <= tp2:
                    pnl = (entry_price - tp1) * 0.5 + (entry_price - tp2) * 0.5
                    total_pnl += pnl
                    wins += 1
                    trades.append(_make_trade(trade_type, pattern_type, entry_time, curr_time, entry_price, tp2, pnl, 'WIN', symbol))
                    in_trade = False
            continue

        # Look for Setup
        # BUY Setup: Sweep below 1H Low, Reclaim (close above)
        if prev_low < major_low and curr_close > major_low:
            # Bullish reclaim candle
            if curr_close > curr_open:
                if i + 1 < len(exec_df):
                    ep = exec_df['Open'].iloc[i+1]
                    sl_ = min(prev_low, curr_low) * 0.999 # Stop loss slightly below sweep wick
                    tp2_ = major_high # Final TP at opposing swing
                    risk = ep - sl_
                    if risk > 0:
                        tp1_ = ep + risk # 1:1 TP for partial
                        
                        entry_price = ep
                        sl = sl_
                        tp1 = tp1_
                        tp2 = tp2_
                        in_trade = True
                        partial_done = False
                        trade_type = 'LONG'
                        pattern_type = 'LIQUIDITY_TRAP_BUY'
                        entry_time = exec_df.index[i+1]
                        continue

        # SELL Setup: Sweep above 1H High, Reject (close below)
        if prev_high > major_high and curr_close < major_high:
            # Bearish rejection candle
            if curr_close < curr_open:
                if i + 1 < len(exec_df):
                    ep = exec_df['Open'].iloc[i+1]
                    sl_ = max(prev_high, curr_high) * 1.001 # Stop loss slightly above sweep wick
                    tp2_ = major_low # Final TP at opposing swing
                    risk = sl_ - ep
                    if risk > 0:
                        tp1_ = ep - risk # 1:1 TP for partial
                        
                        entry_price = ep
                        sl = sl_
                        tp1 = tp1_
                        tp2 = tp2_
                        in_trade = True
                        partial_done = False
                        trade_type = 'SHORT'
                        pattern_type = 'LIQUIDITY_TRAP_SELL'
                        entry_time = exec_df.index[i+1]
                        continue

    total_trades = wins + partials + losses
    win_rate = round((wins + partials) / total_trades * 100, 2) if total_trades > 0 else 0

    daily_pnl = {}
    for t in trades:
        try:
            dt = t['exit_time'][:10]
            daily_pnl[dt] = round(daily_pnl.get(dt, 0) + t['pnl'], 6)
        except:
            pass

    recent = exec_df.tail(200).copy()
    candles = []
    for ts, row in recent.iterrows():
        candles.append({
            'time': int(ts.timestamp()),
            'open': round(float(row['Open']), 5),
            'high': round(float(row['High']), 5),
            'low': round(float(row['Low']), 5),
            'close': round(float(row['Close']), 5),
        })

    return {
        'symbol': symbol,
        'timeframe': timeframe,
        'period': cfg['exec_period'],
        'total_bars': len(exec_df),
        'total_trades': total_trades,
        'wins': wins,
        'partials': partials,
        'losses': losses,
        'win_rate': win_rate,
        'total_pnl': round(total_pnl, 6),
        'daily_pnl': daily_pnl,
        'trades': trades,
        'candles': candles,
    }

def _make_trade(type_, pattern, entry_time, exit_time, entry_price, exit_price, pnl, status, symbol):
    return {
        'type': type_,
        'pattern': pattern,
        'symbol': symbol,
        'entry_time': str(entry_time),
        'exit_time': str(exit_time),
        'entry_price': round(float(entry_price), 5),
        'exit_price': round(float(exit_price), 5),
        'pnl': round(float(pnl), 6),
        'status': status,
    }
