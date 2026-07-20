import sys
import os
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextun_project.settings")
django.setup()

from api.dbtp_dbbtm import get_rates, find_swings, detect_double_top, initialize, shutdown

if not initialize():
    print("MT5 init failed")
    sys.exit(1)

symbol = "EURUSDm"
timeframe = "H1"
df = get_rates(symbol, timeframe)

if df is None:
    print("Failed to get rates")
    sys.exit(1)

highs, lows = find_swings(df)
print(f"Total candles: {len(df)}")
print(f"Last candle index: {len(df) - 1}")

print("\n--- Highs ---")
if len(highs) >= 2:
    h1 = highs[-2]
    h2 = highs[-1]
    p1 = df.close.iloc[h1]
    p2 = df.close.iloc[h2]
    
    print(f"h1 index: {h1}, price: {p1}")
    print(f"h2 index: {h2}, price: {p2}")
    
    print(f"Distance between h1 and h2: {h2 - h1}")
    print(f"Distance from h2 to now: {(len(df) - 1) - h2}")
    print(f"Price diff %: {abs(p1 - p2) / p1}")
    
    signal = detect_double_top(df, highs, symbol)
    print(f"detect_double_top returned: {signal}")
else:
    print("Not enough highs found")

shutdown()
