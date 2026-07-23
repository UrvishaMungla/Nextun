import MetaTrader5 as mt5
import pandas as pd
from .dbtp_dbbtm import initialize, shutdown, get_rates, get_open_position

def get_higher_timeframe(tf_string):
    """
    Returns the analysis timeframe based on the execution timeframe.
    Execution: 1M or 5M -> Analysis: 1H
    Execution: 15M, 30M, 1H -> Analysis: 4H
    """
    if "M1" in tf_string or "M5" in tf_string:
        return "H1"
    return "H4"

def get_signal(symbol, timeframe, user=None):
    if user:
        if not initialize(user=user):
            return {"action": "NONE"}
    else:
        if not initialize():
            return {"action": "NONE"}

    # Fetch Execution TF
    exec_df = get_rates(symbol, timeframe, bars=100)
    if exec_df is None or len(exec_df) < 8:
        shutdown()
        return {"action": "NONE"}

    # Fetch Higher TF
    higher_tf = get_higher_timeframe(timeframe)
    struct_df = get_rates(symbol, higher_tf, bars=100)
    
    if struct_df is None or len(struct_df) < 25:
        shutdown()
        return {"action": "NONE"}

    # Calculate Major Pools on Higher TF
    struct_window = 24 if higher_tf == "H1" else 6
    
    # Major Pools are calculated up to the previous unclosed candle to avoid lookahead
    struct_df['Major_High'] = struct_df['high'].rolling(window=struct_window).max().shift(1)
    struct_df['Major_Low'] = struct_df['low'].rolling(window=struct_window).min().shift(1)
    
    current_major_high = struct_df['Major_High'].iloc[-1]
    current_major_low = struct_df['Major_Low'].iloc[-1]
    
    if pd.isna(current_major_high) or pd.isna(current_major_low):
        shutdown()
        return {"action": "NONE"}
        
    reclaim = exec_df.iloc[-2] # Last closed candle
    
    buy_signal = None
    sell_signal = None
    
    # Check BUY SETUP (LONG CONDITIONS)
    # The reclaim candle must be bullish and close above the major low
    if reclaim['close'] > reclaim['open'] and reclaim['close'] > current_major_low:
        # Look back at the 5 candles preceding the reclaim candle to find a sweep
        recent_lows = exec_df.iloc[-7:-2]['low']
        lowest_recent = recent_lows.min()
        
        if lowest_recent < current_major_low: # A sweep occurred recently!
            lowest_low = min(lowest_recent, reclaim['low'])
            symbol_info = mt5.symbol_info(symbol)
            if symbol_info:
                point = symbol_info.point
                if point > 0:
                    sl_dist = (reclaim['close'] - lowest_low)
                    sl_points = int(sl_dist / point) + 20 # SL slightly below the sweep
                    
                    tp_dist = (current_major_high - reclaim['close'])
                    tp_points = int(tp_dist / point)
                    
                    if sl_points > 10 and tp_points > 10:
                        buy_signal = {
                            "action": "BUY",
                            "symbol": symbol,
                            "volume": 0.01,
                            "sl": sl_points,
                            "tp": tp_points
                        }
                    
    # Check SELL SETUP (SHORT CONDITIONS)
    # The reclaim candle must be bearish and close below the major high
    if reclaim['close'] < reclaim['open'] and reclaim['close'] < current_major_high:
        # Look back at the 5 candles preceding the reclaim candle to find a sweep
        recent_highs = exec_df.iloc[-7:-2]['high']
        highest_recent = recent_highs.max()
        
        if highest_recent > current_major_high: # A sweep occurred recently!
            highest_high = max(highest_recent, reclaim['high'])
            symbol_info = mt5.symbol_info(symbol)
            if symbol_info:
                point = symbol_info.point
                if point > 0:
                    sl_dist = (highest_high - reclaim['close'])
                    sl_points = int(sl_dist / point) + 20 # SL slightly above the sweep
                    
                    tp_dist = (reclaim['close'] - current_major_low)
                    tp_points = int(tp_dist / point)
                    
                    if sl_points > 10 and tp_points > 10:
                        sell_signal = {
                            "action": "SELL",
                            "symbol": symbol,
                            "volume": 0.01,
                            "sl": sl_points,
                            "tp": tp_points
                        }
                    
    # Check what position we currently hold
    current_pos = get_open_position(symbol)

    # ---- SELL pattern detected ----
    if sell_signal:
        if current_pos == "BUY":
            shutdown()
            return {"action": "CLOSE_BUY", "symbol": symbol}
        if current_pos == "SELL":
            shutdown()
            return {"action": "NONE"}
        shutdown()
        return sell_signal

    # ---- BUY pattern detected ----
    if buy_signal:
        if current_pos == "SELL":
            shutdown()
            return {"action": "CLOSE_SELL", "symbol": symbol}
        if current_pos == "BUY":
            shutdown()
            return {"action": "NONE"}
        shutdown()
        return buy_signal

    shutdown()
    return {"action": "NONE"}
