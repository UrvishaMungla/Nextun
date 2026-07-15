from dataclasses import dataclass
from datetime import datetime


@dataclass
class Position:

    ticket: int

    strategy: str

    symbol: str

    action: str

    volume: float

    entry: float

    sl: float

    tp: float

    opened_at: datetime