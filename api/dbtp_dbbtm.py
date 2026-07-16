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


def detect_double_top(df, highs):

    if len(highs) < 2:
        return None

    h1 = highs[-2]
    h2 = highs[-1]

    if h2-h1 < 20 or h2-h1 > 30:
        return None

    p1 = df.close.iloc[h1]
    p2 = df.close.iloc[h2]

    if abs(p1-p2)/p1 > 0.003:
        return None

    return {
        "action":"SELL",
        "symbol":"EURUSD",
        "volume":0.01,
        "sl":150,
        "tp":300
    }


def detect_double_bottom(df, lows):

    if len(lows) < 2:
        return None

    l1 = lows[-2]
    l2 = lows[-1]

    if l2-l1 < 20 or l2-l1 > 30:
        return None

    p1 = df.close.iloc[l1]
    p2 = df.close.iloc[l2]

    if abs(p1-p2)/p1 > 0.003:
        return None

    return {
        "action":"BUY",
        "symbol":"EURUSD",
        "volume":0.01,
        "sl":150,
        "tp":300
    }


def get_signal(symbol, timeframe):

    if not initialize():
        return {"action":"NONE"}

    df = get_rates(symbol, timeframe)

    if df is None:
        shutdown()
        return {"action":"NONE"}

    highs, lows = find_swings(df)

    signal = detect_double_top(df, highs)

    if signal:
        shutdown()
        return signal

    signal = detect_double_bottom(df, lows)

    if signal:
        shutdown()
        return signal

    shutdown()

    return {
        "action":"NONE"
    }