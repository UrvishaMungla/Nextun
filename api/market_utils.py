import holidays
from datetime import time
from functools import lru_cache

# ─── Global Caches for Massive Performance Gains ──────────────────────────────
US_HOLIDAYS = holidays.US()
IN_HOLIDAYS = holidays.India()

IN_START_TIME = time(9, 15)
IN_END_TIME = time(15, 30)

US_START_TIME = time(9, 30)
US_END_TIME = time(16, 0)

@lru_cache(maxsize=128)
def get_market_type(symbol):
    """
    Determine the market type from the Yahoo Finance symbol suffix.
    """
    symbol = symbol.upper()
    if symbol.endswith('.NS') or symbol.endswith('.BO'):
        return 'INDIAN'
    elif symbol.endswith('=X'):
        return 'FOREX'
    elif symbol.endswith('-USD'):
        return 'CRYPTO'
    else:
        # Default to US equities or general market if suffix isn't matched
        return 'US'

def is_market_open(timestamp, symbol):
    """
    Check if the given timestamp falls within active trading hours for the symbol's market,
    accounting for weekends and national holidays.
    """
    market_type = get_market_type(symbol)
    date_obj = timestamp.date()
    time_obj = timestamp.time()
    weekday = timestamp.weekday() # 0 is Monday, 6 is Sunday

    if market_type == 'CRYPTO':
        # Crypto is 24/7, no holidays
        return True

    elif market_type == 'FOREX':
        # Forex is typically 24/5 (Mon-Fri)
        if weekday >= 5: # Saturday or Sunday
            return False
        return True

    elif market_type == 'INDIAN':
        # Indian Equities: Mon-Fri, 09:15 to 15:30 IST
        if weekday >= 5:
            return False
        
        # O(1) lookup on global cached holidays
        if date_obj in IN_HOLIDAYS:
            return False
            
        if IN_START_TIME <= time_obj <= IN_END_TIME:
            return True
        return False
        
    elif market_type == 'US':
        # Basic US Market: Mon-Fri, 09:30 to 16:00 EST
        if weekday >= 5:
            return False
            
        # O(1) lookup on global cached holidays
        if date_obj in US_HOLIDAYS:
            return False
            
        if US_START_TIME <= time_obj <= US_END_TIME:
            return True
        return False
        
    return True
