import holidays
from datetime import time

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
        # Simplify holidays for Forex: we could check US/UK, but usually it trades unless it's a global major holiday.
        # For this scope, 24/5 is a sufficient proxy.
        return True

    elif market_type == 'INDIAN':
        # Indian Equities: Mon-Fri, 09:15 to 15:30 IST
        if weekday >= 5:
            return False
        
        # Check against Indian national holidays
        # The holidays package handles historical and future moving holidays
        in_holidays = holidays.India(years=date_obj.year)
        if date_obj in in_holidays:
            return False
            
        # Check time window
        start_time = time(9, 15)
        end_time = time(15, 30)
        if start_time <= time_obj <= end_time:
            return True
        return False
        
    elif market_type == 'US':
        # Basic US Market: Mon-Fri, 09:30 to 16:00 EST
        if weekday >= 5:
            return False
            
        us_holidays = holidays.US(years=date_obj.year)
        if date_obj in us_holidays:
            return False
            
        start_time = time(9, 30)
        end_time = time(16, 0)
        if start_time <= time_obj <= end_time:
            return True
        return False
        
    return True
