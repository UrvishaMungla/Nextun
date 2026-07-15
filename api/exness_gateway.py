import MetaTrader5 as mt5
import logging

logger = logging.getLogger(__name__)

# Default MT5 terminal path
MT5_TERMINAL_PATH = r"C:\Program Files\MetaTrader 5\terminal64.exe"


class ExnessDummyGateway:
    def __init__(
        self,
        account_id,
        password,
        server="Exness-MT5Trial15",
        terminal_path=MT5_TERMINAL_PATH,
    ):
        self.account_id = int(account_id)
        self.password = password
        self.server = server
        self.terminal_path = terminal_path
        self.connected = False

    def establish_session(self):
        """Initialize MT5 terminal and login to Exness."""

        mt5.shutdown()

        if not mt5.initialize(
            path=self.terminal_path,
            timeout=60000,
        ):
            logger.error(f"MT5 Initialization Failed: {mt5.last_error()}")
            return False

        print("MT5 Version:", mt5.version())
        print("Terminal Info:", mt5.terminal_info())

        authorized = mt5.login(
            login=self.account_id,
            password=self.password,
            server=self.server,
        )

        if not authorized:
            logger.error(f"MT5 Login Failed: {mt5.last_error()}")
            mt5.shutdown()
            return False

        account_info = mt5.account_info()

        if account_info is None:
            logger.error("Connected but unable to retrieve account information.")
            mt5.shutdown()
            return False

        logger.info(
            f"Connected | "
            f"Account: {account_info.login} | "
            f"Server: {account_info.server} | "
            f"Balance: {account_info.balance}"
        )

        self.connected = True
        return True

    def close_session(self):
        mt5.shutdown()
        self.connected = False

    def place_simulated_order(
        self,
        symbol,
        action_type,
        volume,
        stop_loss_points=150,
        take_profit_points=300,
    ):

        if not self.connected:
            if not self.establish_session():
                raise ConnectionError("Gateway connection offline.")

        symbol_info = mt5.symbol_info(symbol)

        if symbol_info is None:
            return {
                "status": "FAILED",
                "reason": f"Symbol '{symbol}' not found."
            }

        if not symbol_info.visible:
            mt5.symbol_select(symbol, True)

        tick = mt5.symbol_info_tick(symbol)

        if tick is None:
            return {
                "status": "FAILED",
                "reason": "Unable to retrieve market price."
            }

        action = action_type.upper()

        if action == "BUY":
            order_type = mt5.ORDER_TYPE_BUY
            execution_price = tick.ask
            sl_price = execution_price - (stop_loss_points * symbol_info.point)
            tp_price = execution_price + (take_profit_points * symbol_info.point)

        elif action == "SELL":
            order_type = mt5.ORDER_TYPE_SELL
            execution_price = tick.bid
            sl_price = execution_price + (stop_loss_points * symbol_info.point)
            tp_price = execution_price - (take_profit_points * symbol_info.point)

        else:
            return {
                "status": "FAILED",
                "reason": f"Unsupported action '{action_type}'"
            }

        trade_request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": float(volume),
            "type": order_type,
            "price": execution_price,
            "sl": sl_price,
            "tp": tp_price,
            "deviation": 20,
            "magic": 20260711,
            "comment": "Nextun Dummy System Execution Loop",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        result = mt5.order_send(trade_request)

        if result is None:
            logger.error(f"order_send() failed: {mt5.last_error()}")
            return None

        logger.info(
            f"Order Result | "
            f"Retcode: {result.retcode} | "
            f"Comment: {result.comment}"
        )

        return result