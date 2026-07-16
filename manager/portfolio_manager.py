from threading import Lock
from models.trade_signal import TradeSignal
from models.trade_order import TradeOrder
from models.position import Position

def build_order(
    self,
    client_id,
    signal: TradeSignal
):

    """
    Convert a TradeSignal into
    an executable TradeOrder.
    """

    strategy = self.strategy(

        client_id,

        signal.strategy

    )

    if strategy is None:

        return None

    #
    # Disabled?
    #

    if not strategy["enabled"]:

        return None

    #
    # Already in trade?
    #

    if strategy["position"] is not None:

        return None


    sl = self.calculate_sl(

        signal

    )

    tp = self.calculate_tp(

        signal,

        sl

    )

    volume = self.calculate_volume(

        client_id,

        signal.strategy,

        signal.entry,

        sl

    )

    return TradeOrder(

        strategy=signal.strategy,

        symbol=signal.symbol,

        action=signal.action,

        volume=volume,

        entry=signal.entry,

        sl=sl,

        tp=tp

    )

def calculate_sl(

    self,

    signal: TradeSignal

):

    """
    Strategy-independent stop loss.

    Uses the pattern information
    returned by the strategy.
    """

    pattern = signal.pattern

    if signal.action == "BUY":

        second_bottom = pattern["second_bottom"]

        return second_bottom * 0.9995

    second_top = pattern["second_top"]

    return second_top * 1.0005

def calculate_tp(

    self,

    signal: TradeSignal,

    sl

):

    """
    Risk Reward

    1 : 2
    """

    risk = abs(

        signal.entry-sl

    )

    if signal.action == "BUY":

        return signal.entry + (

            risk*2

        )

    return signal.entry - (

        risk*2

    )


class PortfolioManager:

    def __init__(self):

        """
        Structure

        self.users = {

            "client1": {

                "dbtp_dbbtm": {

                    "balance": 5000,

                    "risk_percent": 1.0,

                    "position": None,

                    "enabled": True,

                    "daily_profit": 0,

                    "daily_loss": 0,

                    "cooldown_until": None

                }

            }

        }
        """

        self.users = {}

        self.lock = Lock()


    def register_strategy(

        self,

        client_id,

        strategy_name,

        virtual_balance,

        risk_percent=1.0

    ):

        with self.lock:

            if client_id not in self.users:

                self.users[client_id] = {}

            self.users[client_id][strategy_name] = {

                "balance": virtual_balance,

                "risk_percent": risk_percent,

                "position": None,

                "enabled": True,

                "daily_profit": 0.0,

                "daily_loss": 0.0,

                "cooldown_until": None

            }


    def strategy(

        self,

        client_id,

        strategy_name

    ):

        if client_id not in self.users:

            return None

        return self.users[client_id].get(

            strategy_name

        )


    def strategy_enabled(

        self,

        client_id,

        strategy_name

    ):

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy is None:

            return False

        return strategy["enabled"]


    def enable(

        self,

        client_id,

        strategy_name

    ):

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy:

            strategy["enabled"] = True


    def disable(

        self,

        client_id,

        strategy_name

    ):

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy:

            strategy["enabled"] = False


    def has_position(

        self,

        client_id,

        strategy_name

    ):

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy is None:

            return False

        return strategy["position"] is not None


    def open_position(

        self,

        client_id,

        strategy_name,

        position

    ):

        """
        position example:

        {

            "ticket":12345,

            "symbol":"ETHUSDm",

            "action":"BUY",

            "entry":1800,

            "sl":1795,

            "tp":1810,

            "volume":0.12

        }

        """

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy is None:

            return

        strategy["position"] = position


    def close_position(

        self,

        client_id,

        strategy_name

    ):

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy is None:

            return

        strategy["position"] = None


    def current_position(

        self,

        client_id,

        strategy_name

    ):

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy is None:

            return None

        return strategy["position"]


    def update_balance(

        self,

        client_id,

        strategy_name,

        pnl

    ):

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy is None:

            return

        strategy["balance"] += pnl

        if pnl >= 0:

            strategy["daily_profit"] += pnl

        else:

            strategy["daily_loss"] += abs(pnl)


    def balance(

        self,

        client_id,

        strategy_name

    ):

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy is None:

            return 0

        return strategy["balance"]


    def calculate_volume(

        self,

        client_id,

        strategy_name,

        entry,

        sl,

        pip_value=1.0

    ):

        strategy = self.strategy(

            client_id,

            strategy_name

        )

        if strategy is None:

            return 0

        risk_amount = (

            strategy["balance"]

            *

            strategy["risk_percent"]

            /

            100

        )

        stop_distance = abs(

            entry-sl

        )

        if stop_distance <= 0:

            return 0

        volume = (

            risk_amount

            /

            (

                stop_distance

                *

                pip_value

            )

        )

        return round(

            volume,

            2

        )