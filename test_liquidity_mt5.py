import os
import sys
import MetaTrader5 as mt5

# Fix Windows terminal unicode encoding
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from api.exness_gateway import ExnessDummyGateway
from api.liquidity_trap_mt5 import get_signal

# ─── CONFIG ────────────────────────────────────────────────────────────────
ACCOUNT_ID   = "83109516"
SERVER_NAME  = "Exness-MT5Trial12"
PASSWORD     = "Nextun@2026"

# Timeframe to scan: M1, M5, M15, M30, H1, H4
TIMEFRAME = "M5"

# Most popular Exness symbols (with 'm' suffix = micro lots available)
SYMBOLS_TO_SCAN = [
    "EURUSDm", "GBPUSDm", "USDJPYm", "AUDUSDm", "USDCADm",
    "USDCHFm", "NZDUSDm", "EURGBPm", "XAUUSDm", "BTCUSDm",
]

# ─── MAIN ──────────────────────────────────────────────────────────────────
def test_liquidity_all_symbols():
    print("=" * 60)
    print(" MT5 LIQUIDITY TRAP STRATEGY — MULTI-SYMBOL SCAN ")
    print("=" * 60)
    print(f"Target Account : {ACCOUNT_ID}")
    print(f"Target Server  : {SERVER_NAME}")
    print(f"Timeframe      : {TIMEFRAME}")
    print(f"Symbols        : {', '.join(SYMBOLS_TO_SCAN)}")
    print("-" * 60)

    # 1. Connect to MT5
    print("\n[+] Connecting to MT5 Terminal...")
    gateway = ExnessDummyGateway(
        account_id=ACCOUNT_ID,
        password=PASSWORD,
        server=SERVER_NAME,
    )

    if not gateway.establish_session():
        print("\n[-] Connection FAILED.")
        print("Please ensure:")
        print("  1. MetaTrader 5 Desktop app is OPEN.")
        print("  2. You are logged into the correct account.")
        print("  3. Password is correct.")
        return

    print("\n[SUCCESS] Connected to Exness MT5!")
    info = mt5.account_info()
    if info:
        print(f"  Balance  : {info.balance} {info.currency}")
        print(f"  Equity   : {info.equity} {info.currency}")
        print(f"  Leverage : 1:{info.leverage}")
    print("-" * 60)

    symbols_to_scan = SYMBOLS_TO_SCAN
    print(f"\n[+] Scanning {len(symbols_to_scan)} symbol(s) on {TIMEFRAME}...\n")

    buy_signals  = []
    sell_signals = []
    errors       = []

    # 3. Scan every symbol
    for sym in symbols_to_scan:
        try:
            signal = get_signal(sym, TIMEFRAME)
            action = signal.get("action", "NONE")

            if action == "BUY":
                buy_signals.append((sym, signal))
                print(f"  [BUY]  SIGNAL --> {sym} | "
                      f"SL: {signal.get('sl')} pts | TP: {signal.get('tp')} pts")

            elif action == "SELL":
                sell_signals.append((sym, signal))
                print(f"  [SELL] SIGNAL --> {sym} | "
                      f"SL: {signal.get('sl')} pts | TP: {signal.get('tp')} pts")

            else:
                print(f"  [----] NONE   --> {sym}")

        except Exception as e:
            errors.append((sym, str(e)))
            print(f"  [ERR]          --> {sym} : {e}")

    # 4. Summary
    print("\n" + "=" * 60)
    print(" SCAN COMPLETE — SUMMARY ")
    print("=" * 60)
    print(f"  Total Symbols Scanned : {len(symbols_to_scan)}")
    print(f"  BUY  Signals Found    : {len(buy_signals)}")
    print(f"  SELL Signals Found    : {len(sell_signals)}")
    print(f"  Errors                : {len(errors)}")

    if buy_signals:
        print("\n  [+] BUY Setups:")
        for sym, sig in buy_signals:
            print(f"      --> {sym}  SL={sig.get('sl')} pts  TP={sig.get('tp')} pts")

    if sell_signals:
        print("\n  [+] SELL Setups:")
        for sym, sig in sell_signals:
            print(f"      --> {sym}  SL={sig.get('sl')} pts  TP={sig.get('tp')} pts")

    if not buy_signals and not sell_signals:
        print("\n  [i] No Liquidity Trap patterns detected right now.")
        print("      This is normal. Keep the dashboard bot ON and it will")
        print("      fire the moment a real pattern forms on ANY symbol!")

    print("\n[+] Closing MT5 Session...")
    gateway.close_session()
    print("[+] Done.")


if __name__ == "__main__":
    test_liquidity_all_symbols()
