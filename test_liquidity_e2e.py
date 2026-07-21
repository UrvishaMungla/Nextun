"""
test_liquidity_e2e.py
─────────────────────────────────────────────────────────────────────
End-to-End Test: Liquidity Trap & Inducement Strategy
Tests the FULL signal → trade placement pipeline using MT5 directly.

WHAT THIS DOES:
  1. Connects to your Exness MT5 account
  2. Scans all 10 symbols using the EXACT same logic as the live bot
  3. If a BUY/SELL signal is detected → places a REAL micro-lot trade (0.01)
  4. Prints the MT5 confirmation with ticket number
  5. Does NOT test Double Top — that logic is untouched

USAGE:
  python test_liquidity_e2e.py

To place a FORCED test trade (skip signal detection, just test order placement):
  python test_liquidity_e2e.py --force-trade
"""
import sys
import os
import time
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')

# ─── CREDENTIALS ───────────────────────────────────────────────────
ACCOUNT_ID   = 83109516
SERVER_NAME  = "Exness-MT5Trial12"
PASSWORD     = "Nextun@2026"

# Symbols to scan (same as live bot) — Exness Hedge account uses no suffix
SYMBOLS = [
    "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD",
    "USDCHF", "NZDUSD", "EURGBP", "XAUUSD", "BTCUSD",
]

TIMEFRAME = "M5"   # Execution timeframe
TEST_VOLUME = 0.01 # Micro-lot — smallest possible trade

def connect_mt5():
    """Connect to Exness MT5 with credentials."""
    import MetaTrader5 as mt5
    if not mt5.initialize():
        print(f"[FAIL] MT5 initialize() failed: {mt5.last_error()}")
        return False, mt5

    # Login with credentials
    if not mt5.login(ACCOUNT_ID, password=PASSWORD, server=SERVER_NAME):
        err = mt5.last_error()
        print(f"[FAIL] MT5 login failed: {err}")
        mt5.shutdown()
        return False, mt5

    # Pre-select all symbols so tick data is available immediately
    for sym in SYMBOLS:
        mt5.symbol_select(sym, True)
    time.sleep(0.5)  # Small wait for market data to load

    account = mt5.account_info()
    print(f"\n{'='*60}")
    print(f"  Connected to Exness MT5")
    print(f"  Account  : {account.login}")
    print(f"  Balance  : {account.balance:.2f} {account.currency}")
    print(f"  Equity   : {account.equity:.2f} {account.currency}")
    print(f"  Leverage : 1:{account.leverage}")
    print(f"{'='*60}\n")
    return True, mt5


def scan_signals():
    """
    Run the Liquidity Trap signal engine across all symbols.
    Uses the SAME get_signal() function as the live bot in views.py.
    Does NOT touch dbtp_dbbtm.py logic.
    """
    # Import from the api package
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nextun_project.settings')
    try:
        django.setup()
    except RuntimeError:
        pass  # Already set up

    from api.liquidity_trap_mt5 import get_signal

    print(f"[+] Scanning {len(SYMBOLS)} symbols on {TIMEFRAME}...\n")
    signals_found = []

    for sym in SYMBOLS:
        result = get_signal(sym, TIMEFRAME)
        action = result.get("action", "NONE")
        icon   = "✅" if action in ("BUY", "SELL") else "⚪"
        label  = f"[{action:^10}]"
        print(f"  {icon} {label} --> {sym}")

        if action in ("BUY", "SELL"):
            signals_found.append((sym, result))

    return signals_found


def place_trade(mt5_lib, symbol, action, volume=TEST_VOLUME, sl_pts=100, tp_pts=200):
    """Place a real market order on Exness MT5."""
    tick = mt5_lib.symbol_info_tick(symbol)
    if not tick:
        return False, f"No tick data for {symbol}", 0.0

    sym_info = mt5_lib.symbol_info(symbol)
    if sym_info is None:
        return False, f"Symbol info unavailable for {symbol}", 0.0

    if not sym_info.visible:
        mt5_lib.symbol_select(symbol, True)
        time.sleep(0.2)
        tick = mt5_lib.symbol_info_tick(symbol)

    point  = sym_info.point
    digits = sym_info.digits

    if action == "BUY":
        order_type = mt5_lib.ORDER_TYPE_BUY
        price = tick.ask
        sl    = round(price - sl_pts * point, digits)
        tp    = round(price + tp_pts * point, digits)
    else:
        order_type = mt5_lib.ORDER_TYPE_SELL
        price = tick.bid
        sl    = round(price + sl_pts * point, digits)
        tp    = round(price - tp_pts * point, digits)

    request = {
        "action":      mt5_lib.TRADE_ACTION_DEAL,
        "symbol":      symbol,
        "volume":      float(volume),
        "type":        order_type,
        "price":       price,
        "sl":          sl,
        "tp":          tp,
        "deviation":   20,
        "magic":       202607,
        "comment":     "Nextun-LT-Test",
        "type_time":   mt5_lib.ORDER_TIME_GTC,
        "type_filling": mt5_lib.ORDER_FILLING_IOC,
    }

    result = mt5_lib.order_send(request)
    if result and result.retcode == mt5_lib.TRADE_RETCODE_DONE:
        return True, f"Trade opened! Ticket: {result.order}", result.price
    else:
        retcode = result.retcode if result else "None"
        comment = result.comment if result else "no result"
        return False, f"Order failed — retcode {retcode}: {comment}", 0.0


def force_test_trade(mt5_lib):
    """
    Bypass signal detection and place a micro-lot test trade on EURUSDm.
    Used to verify the order pipeline works end-to-end.
    """
    import MetaTrader5 as mt5_mod
    symbol = "EURUSD"
    action = "BUY"  # simple buy to test

    # Ensure the symbol is fully subscribed and tick data loaded
    mt5_mod.symbol_select(symbol, True)
    time.sleep(1.0)
    tick = mt5_mod.symbol_info_tick(symbol)

    ask_price = f"{tick.ask:.5f}" if tick else "unknown"
    print(f"\n{'─'*60}")
    print(f"  [FORCE-TRADE] Placing a {action} on {symbol} @ {ask_price}")
    print(f"  Volume: {TEST_VOLUME} lots")
    print(f"{'─'*60}")

    if not tick:
        print("  [FAIL] Could not get tick data. Is the market open and symbol visible in MT5?")
        return

    success, msg, price = place_trade(mt5_mod, symbol, action, volume=TEST_VOLUME, sl_pts=80, tp_pts=160)
    if success:
        print(f"\n  [SUCCESS] {msg}")
        print(f"  Entry Price: {price}")
        print(f"  >>> Check MT5 Trade tab — you should see the new position! <<<")
    else:
        print(f"\n  [FAIL] {msg}")


def main():
    parser = argparse.ArgumentParser(description="Liquidity Trap E2E Test")
    parser.add_argument("--force-trade", action="store_true",
                        help="Skip signal detection and place a test trade directly")
    args = parser.parse_args()

    print("=" * 60)
    print("  LIQUIDITY TRAP — END-TO-END TEST")
    print("=" * 60)

    import MetaTrader5 as mt5
    connected, mt5 = connect_mt5()
    if not connected:
        print("[ABORT] Cannot connect to MT5. Make sure MT5 is open and logged in.")
        sys.exit(1)

    try:
        if args.force_trade:
            # Force trade mode — tests the trade placement pipeline directly
            force_test_trade(mt5)
        else:
            # Normal mode — scan for real signals
            signals = scan_signals()

            print(f"\n{'='*60}")
            print(f"  SCAN SUMMARY")
            print(f"{'='*60}")
            print(f"  Symbols Scanned : {len(SYMBOLS)}")
            print(f"  Signals Found   : {len(signals)}")

            if signals:
                print(f"\n  [!] TRADING ON LIVE SIGNALS...\n")
                for sym, sig in signals:
                    action  = sig["action"]
                    sl_pts  = sig.get("sl", 100)
                    tp_pts  = sig.get("tp", 200)
                    print(f"  --> {action} on {sym}  SL={sl_pts}pts  TP={tp_pts}pts")
                    ok, msg, price = place_trade(mt5, sym, action, TEST_VOLUME, sl_pts, tp_pts)
                    status = "[OK]  " if ok else "[FAIL]"
                    print(f"      {status} {msg}")
                print(f"\n  >>> Check MT5 Trade tab for new positions! <<<")
            else:
                print(f"\n  No Liquidity Trap patterns right now. This is normal.")
                print(f"  Tip: Run with --force-trade to test the order pipeline.")

        print(f"\n{'='*60}")
        print(f"  TEST COMPLETE")
        print(f"{'='*60}\n")

    finally:
        mt5.shutdown()
        print("[+] MT5 session closed.")


if __name__ == "__main__":
    main()
