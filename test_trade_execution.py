import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nextun_project.settings')
django.setup()

from api.dbtp_dbbtm import place_real_mt5_trade
from django.contrib.auth import get_user_model

def run_test():
    print("=" * 60)
    print(" Nextun - Triggering Live Test Trade ")
    print("=" * 60)

    User = get_user_model()
    try:
        user = User.objects.get(email='nextun.kavya@gmail.com')
    except User.DoesNotExist:
        print("[-] User nextun.kavya@gmail.com not found in Django database.")
        return

    if not user.isExnessConnected:
        print("[-] Exness is not marked as connected in the user profile.")
        return

    print(f"[+] Loaded credentials for: {user.email}")
    print(f"[+] Exness Account ID: {user.exnessAccountId}")
    print(f"[+] Exness Server: {user.exnessServer}")
    print("\n[+] Triggering place_real_mt5_trade()...")

    success, msg, price = place_real_mt5_trade(
        symbol="EURUSDm",
        action="BUY",
        volume=0.01,
        sl_points=150,
        tp_points=300,
        user=user
    )

    if success:
        print(f"\n[SUCCESS] Test trade executed successfully!")
        print(f"[+] Placed BUY order of 0.01 lots on EURUSDm at price: {price}")
        print("[+] Check your MetaTrader 5 desktop application — you should see the trade open in the Trade tab!")
    else:
        print(f"\n[-] Execution failed: {msg}")

if __name__ == "__main__":
    run_test()
