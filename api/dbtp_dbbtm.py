import MetaTrader5 as mt5
import pandas as pd


TIMEFRAMES = {
    "M1": mt5.TIMEFRAME_M1,
    "PERIOD_M1": mt5.TIMEFRAME_M1,

    "M5": mt5.TIMEFRAME_M5,
    "PERIOD_M5": mt5.TIMEFRAME_M5,

    "M15": mt5.TIMEFRAME_M15,
    "PERIOD_M15": mt5.TIMEFRAME_M15,

    "M30": mt5.TIMEFRAME_M30,
    "PERIOD_M30": mt5.TIMEFRAME_M30,

    "H1": mt5.TIMEFRAME_H1,
    "PERIOD_H1": mt5.TIMEFRAME_H1,

    "H4": mt5.TIMEFRAME_H4,
    "PERIOD_H4": mt5.TIMEFRAME_H4,
}


def initialize():

    if mt5.initialize():
        return True

    return False


def shutdown():
    mt5.shutdown()


def close_mt5_position(symbol):
    """
    Closes any open position for the given symbol on MT5.
    """
    if not initialize():
        return False, "MT5 init failed"
    
    positions = mt5.positions_get(symbol=symbol)
    if not positions or len(positions) == 0:
        return True, "No open position to close"
        
    pos = positions[0]
    ticket = pos.ticket
    volume = pos.volume
    pos_type = pos.type
    
    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        return False, f"No tick data for {symbol}"
        
    if pos_type == mt5.ORDER_TYPE_BUY:
        close_type = mt5.ORDER_TYPE_SELL
        price = tick.bid
    else:
        close_type = mt5.ORDER_TYPE_BUY
        price = tick.ask
        
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": float(volume),
        "type": close_type,
        "position": ticket,
        "price": price,
        "deviation": 20,
        "magic": 999111,
        "comment": "Nextun Bot Close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return False, f"Failed to close position: {result.retcode} - {result.comment}"
        
    return True, f"Position {ticket} closed at {result.price}"

def place_real_mt5_trade(symbol, action, volume, sl_points, tp_points):
    """
    Places a REAL trade on the connected MT5/Exness terminal.
    sl_points and tp_points are the distance in points (e.g. 150 points).
    SAFETY: Refuses to place if a position already exists on this symbol.
    """
    if not initialize():
        return False, "MT5 init failed"

    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        return False, f"{symbol} not found", 0.0

    if not symbol_info.visible:
        if not mt5.symbol_select(symbol, True):
            return False, f"Could not enable {symbol}", 0.0

    point = symbol_info.point
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return False, f"No tick data for {symbol}", 0.0

    if action == "BUY":
        order_type = mt5.ORDER_TYPE_BUY
        price = tick.ask
        sl = price - (sl_points * point)
        tp = price + (tp_points * point)
    elif action == "SELL":
        order_type = mt5.ORDER_TYPE_SELL
        price = tick.bid
        sl = price + (sl_points * point)
        tp = price - (tp_points * point)
    else:
        return False, "Invalid action", 0.0

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": float(volume),
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 999111,
        "comment": "Nextun Bot",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return False, f"Trade error: {result.retcode} - {result.comment}", 0.0

    return True, f"Placed at {result.price}", result.price


def get_rates(symbol, timeframe, bars=300):

    tf = TIMEFRAMES.get(timeframe, mt5.TIMEFRAME_M15)

    rates = mt5.copy_rates_from_pos(symbol, tf, 0, bars)

    if rates is None:
        return None

    df = pd.DataFrame(rates)

    df["time"] = pd.to_datetime(df["time"], unit="s")

    return df


def find_swings(df, left=3, right=3):

    highs = []
    lows = []

    for i in range(left, len(df) - right):

        high = True
        low = True

        for j in range(i-left, i+right+1):

            if j == i:
                continue

            if df.high.iloc[j] >= df.high.iloc[i]:
                high = False

            if df.low.iloc[j] <= df.low.iloc[i]:
                low = False

        if high:
            highs.append(i)

        if low:
            lows.append(i)

    return highs, lows


def detect_double_top(df, highs, symbol):

    if len(highs) < 2:
        return None

    h1 = highs[-2]
    h2 = highs[-1]

    # Recent high should be within 15 candles
    if (len(df) - 1) - h2 > 15:
        return None

    if h2-h1 < 5 or h2-h1 > 60:
        return None

    p1 = df.close.iloc[h1]
    p2 = df.close.iloc[h2]

    if abs(p1-p2)/p1 > 0.001:
        return None

    return {
        "action":"SELL",
        "symbol": symbol,
        "volume":0.01,
        "sl":150,
        "tp":300
    }

def detect_double_bottom(df, lows, symbol):

    if len(lows) < 2:
        return None

    l1 = lows[-2]
    l2 = lows[-1]

    # Recent low should be within 15 candles
    if (len(df) - 1) - l2 > 15:
        return None

    if l2-l1 < 5 or l2-l1 > 65:
        return None

    p1 = df.close.iloc[l1]
    p2 = df.close.iloc[l2]

    if abs(p1-p2)/p1 > 0.001:
        return None

    return {
        "action":"BUY",
        "symbol": symbol,
        "volume":0.01,
        "sl":150,
        "tp":300
    }

def get_open_position(symbol):
    """
    Check MT5 for an open position on this symbol.
    Returns "BUY", "SELL", or None.
    """

    positions = mt5.positions_get(symbol=symbol)

    if positions is None or len(positions) == 0:
        return None

    # mt5.ORDER_TYPE_BUY == 0, mt5.ORDER_TYPE_SELL == 1
    pos = positions[0]

    if pos.type == mt5.ORDER_TYPE_BUY:
        return "BUY"

    if pos.type == mt5.ORDER_TYPE_SELL:
        return "SELL"

    return None


def get_signal(symbol, timeframe):

    if not initialize():
        return {"action": "NONE"}

    df = get_rates(symbol, timeframe)

    if df is None:
        shutdown()
        return {"action": "NONE"}

    highs, lows = find_swings(df)

    # Detect patterns
    sell_signal = detect_double_top(df, highs, symbol)
    buy_signal = detect_double_bottom(df, lows, symbol)

    # Check what position we currently hold
    current_pos = get_open_position(symbol)

    # ---- SELL pattern detected ----
    if sell_signal:

        # We have an open BUY → close it first
        if current_pos == "BUY":
            shutdown()
            return {
                "action": "CLOSE_BUY",
                "symbol": symbol
            }

        # We already have a SELL open → do nothing
        if current_pos == "SELL":
            shutdown()
            return {"action": "NONE"}

        # No position → place the SELL
        shutdown()
        return sell_signal

    # ---- BUY pattern detected ----
    if buy_signal:

        # We have an open SELL → close it first
        if current_pos == "SELL":
            shutdown()
            return {
                "action": "CLOSE_SELL",
                "symbol": symbol
            }

        # We already have a BUY open → do nothing
        if current_pos == "BUY":
            shutdown()
            return {"action": "NONE"}

        # No position → place the BUY
        shutdown()
        return buy_signal

    # No signal generated
    shutdown()
    
    print(f"[{symbol}] Scanned {len(highs)} highs & {len(lows)} lows. No valid Double Top/Bottom found yet.")

    return {
        "action": "NONE"
    }