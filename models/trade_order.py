from dataclasses import dataclass


@dataclass
class TradeOrder:
    """
    Executable order.

    Generated after PortfolioManager
    applies risk management.
    """

    strategy: str

    symbol: str

    action: str

    volume: float

    entry: float

    sl: float

    tp: float