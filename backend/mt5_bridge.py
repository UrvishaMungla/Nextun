import sys
import json
import MetaTrader5 as mt5
from datetime import datetime
import pytz

def main():
    if len(sys.argv) < 5:
        print(json.dumps({"success": False, "message": "Missing arguments"}))
        return

    action = sys.argv[1]
    login_id = int(sys.argv[2])
    password = sys.argv[3]
    server = sys.argv[4]

    # Initialize MT5 connection
    if not mt5.initialize():
        print(json.dumps({"success": False, "message": "Failed to initialize MT5. Ensure the terminal is installed.", "error": mt5.last_error()}))
        return

    # Log into the account
    authorized = mt5.login(login=login_id, password=password, server=server)
    if not authorized:
        print(json.dumps({"success": False, "message": f"Failed to login to account {login_id}. Check credentials.", "error": mt5.last_error()}))
        mt5.shutdown()
        return

    if action == "connect":
        print(json.dumps({
            "success": True, 
            "message": "Connected to Exness MT5 terminal successfully!"
        }))
    
    elif action == "dashboard":
        account_info = mt5.account_info()
        if account_info is None:
            print(json.dumps({"success": False, "message": "Failed to retrieve account info.", "error": mt5.last_error()}))
        else:
            # Calculate P&L
            timezone = pytz.timezone("Etc/UTC")
            today = datetime.now(timezone).replace(hour=0, minute=0, second=0, microsecond=0)
            all_deals = mt5.history_deals_get(datetime(2000, 1, 1), datetime.now(timezone))
            
            total_pl = 0
            today_pl = 0
            
            if all_deals:
                for deal in all_deals:
                    if deal.type == mt5.DEAL_TYPE_BALANCE:
                        continue
                    total_pl += deal.profit
                    if datetime.fromtimestamp(deal.time, tz=timezone) >= today:
                        today_pl += deal.profit
            
            # Open positions
            open_positions = mt5.positions_total()

            # Convert named tuple to dictionary
            info_dict = account_info._asdict()
            print(json.dumps({
                "success": True,
                "data": {
                    "balance": info_dict.get('balance', 0),
                    "equity": info_dict.get('equity', 0),
                    "margin": info_dict.get('margin', 0),
                    "freeMargin": info_dict.get('margin_free', 0),
                    "currency": info_dict.get('currency', 'USD'),
                    "positions": {
                        "openCount": open_positions,
                        "totalPnl": total_pl,
                        "todaysPnl": today_pl
                    }
                }
            }))
    elif action == "sync_history":
        timezone = pytz.timezone("Etc/UTC")
        all_deals = mt5.history_deals_get(datetime(2000, 1, 1), datetime.now(timezone))
        trades = []
        if all_deals:
            for deal in all_deals:
                if deal.type == mt5.DEAL_TYPE_BALANCE:
                    continue
                trade_type = "BUY" if deal.type == mt5.DEAL_TYPE_BUY else "SELL"
                trades.append({
                    "symbol": deal.symbol,
                    "type": trade_type,
                    "quantity": deal.volume,
                    "entryPrice": deal.price,
                    "currentPrice": deal.price,
                    "pnl": deal.profit,
                    "status": "CLOSED", # Simplification: all history deals are either closed trades or entries.
                    "time": deal.time
                })
        print(json.dumps({"success": True, "data": trades}))

    elif action == "execute_dummy":
        import time
        # Try both with and without 'm' suffix
        for sym in ["EURUSD", "GBPUSD"]:
            symbol = sym + "m"
            if not mt5.symbol_info(symbol):
                symbol = sym
            mt5.symbol_select(symbol, True)
            tick = mt5.symbol_info_tick(symbol)
            if tick:
                request = {
                    "action": mt5.TRADE_ACTION_DEAL,
                    "symbol": symbol,
                    "volume": 0.1,
                    "type": mt5.ORDER_TYPE_BUY,
                    "price": tick.ask,
                    "deviation": 20,
                    "magic": 234000,
                    "comment": "Nextun Test",
                    "type_time": mt5.ORDER_TIME_GTC,
                    "type_filling": mt5.ORDER_FILLING_IOC,
                }
                res = mt5.order_send(request)
                if res and res.retcode == mt5.TRADE_RETCODE_DONE:
                    # Close it immediately to generate a full closed deal
                    tick2 = mt5.symbol_info_tick(symbol)
                    close_request = {
                        "action": mt5.TRADE_ACTION_DEAL,
                        "symbol": symbol,
                        "volume": 0.1,
                        "type": mt5.ORDER_TYPE_SELL,
                        "price": tick2.bid,
                        "deviation": 20,
                        "magic": 234000,
                        "position": res.order,
                        "type_time": mt5.ORDER_TIME_GTC,
                        "type_filling": mt5.ORDER_FILLING_IOC,
                    }
                    mt5.order_send(close_request)
        print(json.dumps({"success": True, "message": "Dummy orders executed and closed!"}))

    else:
        print(json.dumps({"success": False, "message": "Unknown action"}))

    mt5.shutdown()

if __name__ == "__main__":
    main()
