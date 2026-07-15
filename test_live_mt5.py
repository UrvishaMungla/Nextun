import os
import sys
import getpass

from api.exness_gateway import ExnessDummyGateway

def test_connection_only():
    print("=" * 60)
    print(" MT5 EXNESS CONNECTION TEST ONLY ")
    print("=" * 60)
    
    account_id = "474037077"
    server_name = "Exness-MT5Trial15"
    
    print(f"Target Account: {account_id}")
    print(f"Target Server: {server_name}")
    print("\nNo trades will be placed. This script only tests terminal authentication.")
    print("-" * 60)
    
    password = getpass.getpass(prompt='Enter MT5 Password (hidden): ')
    
    print("\n[+] Attempting to hook into MT5 Terminal...")
    gateway = ExnessDummyGateway(account_id=account_id, password=password, server=server_name)
    
    if gateway.establish_session():
        print("\n[SUCCESS] Connection to Exness established perfectly!")
        print("[+] Your Python environment is successfully communicating with the MT5 Terminal.")
        
        # We can pull some account info just to prove it works
        import MetaTrader5 as mt5
        info = mt5.account_info()
        if info:
            print(f"[+] Account Balance: {info.balance} {info.currency}")
            print(f"[+] Account Equity: {info.equity}")
            print(f"[+] Leverage: 1:{info.leverage}")
    else:
        print("\n[-] Connection FAILED.")
        print("Please ensure:")
        print(" 1. The MT5 Desktop application is currently open.")
        print(" 2. You typed the password correctly.")
            
    print("\n[+] Closing MT5 Session...")
    gateway.close_session()
    print("[+] Done.")

if __name__ == "__main__":
    test_connection_only()
