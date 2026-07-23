import MetaTrader5 as mt5
import time
import threading

mt5_lock = threading.RLock()

def test_conn(account, password, server):
    with mt5_lock:
        t0 = time.time()
        print(f"Connecting to MT5...")
        if not mt5.initialize(path=r"C:\Program Files\MetaTrader 5\terminal64.exe", timeout=60000):
            print("init failed")
            return
        t1 = time.time()
        print(f"Init took {t1-t0:.2f}s")
        
        print(f"Logging in {account} on {server}...")
        authorized = mt5.login(
            login=account,
            password=password,
            server=server
        )
        t2 = time.time()
        print(f"Login took {t2-t1:.2f}s. Result: {authorized}")
        if not authorized:
            print(f"Error: {mt5.last_error()}")
        mt5.shutdown()

test_conn(198628771, "wrongpass", "Exness-MT5Trial11")
