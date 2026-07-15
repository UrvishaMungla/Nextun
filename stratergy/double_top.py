from strategies.base import BaseStrategy
from models.trade_signal import TradeSignal
class Strategy(BaseStrategy):
    def __init__(self, cfg):
        #
        # Configuration
        #
        self.name = cfg["name"]
        self.symbol = cfg["symbol"]
        self.timeframe = cfg["timeframe"]
        #
        # Pattern Parameters
        #
        self.swing_window = 3
        self.min_spacing = 20
        self.max_spacing = 30
        self.equal_level_tolerance = 0.001
        #
        # Confirmation
        #
        self.confirmation_window = 5
async def on_market_data(
    self,
    candles
):
    """
    Entry point called by StrategyEngine.
    Receives only candles for the configured
    symbol and timeframe.
    """
    if candles is None:
        return None
    if len(candles) < 100:
        return None
    return self.analyze(candles)
    def analyze(
        self,
        candles
    ):
        if len(candles) < 100:
            return None
        swings = self.detect_swings(
            candles
        )
        if len(swings) < 3:
            return None
        # SELL
        signal = self.detect_pattern(
            candles,
            swings,
            "SELL"
        )
        if signal:
            return signal
        # BUY
        signal = self.detect_pattern(
            candles,
            swings,
            "BUY"
        )
        return signal
    def detect_pattern(
        self,
        candles,
        swings,
        direction
    ):
        #
        # Required Pattern
        #
        if direction == "SELL":
            first_type = "HIGH"
            middle_type = "LOW"
            second_type = "HIGH"
        else:
            first_type = "LOW"
            middle_type = "HIGH"
            second_type = "LOW"
        for i in range(len(swings) - 2):
            first = swings[i]
            middle = swings[i + 1]
            second = swings[i + 2]
            if first["type"] != first_type:
                continue
            if middle["type"] != middle_type:
                continue
            if second["type"] != second_type:
                continue
            valid, reason = self.validate_pattern(
                candles,
                first,
                middle,
                second,
                direction
            )
            if not valid:
                continue
            self.debug_pattern(
                direction,
                first,
                middle,
                second
            )
            return TradeSignal(
                strategy=self.name,
                symbol=self.symbol,
                action=direction,
                entry=entry,
                pattern=pattern
            )
        return None
    def detect_swings(
        self,
        candles
    ):
        """
        Detect swing highs and swing lows.
        Returns
        [
            {
                "type":"HIGH",
                "index":25,
                "price":1824.45
            },
            {
                "type":"LOW",
                "index":38,
                "price":1808.20
            }
        ]
        """
        swings = []
        window = self.swing_window
        total = len(candles)
        for i in range(window, total-window):
            current = candles[i]
            high = current["high"]
            low = current["low"]
            # Swing High
            is_high = True
            for j in range(i-window, i+window+1):
                if j == i:
                    continue
                if candles[j]["high"] >= high:
                    is_high = False
                    break
            if is_high:
                swings.append(
                    {
                        "type":"HIGH",
                        "index":i,
                        "price":high
                    }
                )
                continue
            # Swing Low
            is_low = True
            for j in range(i-window, i+window+1):
                if j == i:
                    continue
                if candles[j]["low"] <= low:
                    is_low = False
                    break
            if is_low:
                swings.append(
                    {
                        "type":"LOW",
                        "index":i,
                        "price":low
                    }
                )
        return swings
    def validate_pattern(
        self,
        candles,
        first,
        middle,
        second,
        direction
    ):
        valid, reason = self.validate_spacing(
            first["index"],
            second["index"]
        )
        if not valid:
            return False, reason
        valid, reason = self.validate_equal_levels(
            first["price"],
            second["price"]
        )
        if not valid:
            return False, reason
        valid, reason = self.validate_momentum(
            candles,
            first["index"],
            direction
        )
        if not valid:
            return False, reason
        valid, reason = self.confirmation_candle(
            candles,
            second,
            direction
        )
        if not valid:
            return False, reason
        return True, "VALID"
    def validate_spacing(
        self,
        first_index,
        second_index
    ):
        spacing = second_index-first_index
        if spacing < self.min_spacing:
            return False, "LESS_THAN_MIN_SPACING"
        if spacing > self.max_spacing:
            return False, "MORE_THAN_MAX_SPACING"
        return True, "VALID"
    def validate_equal_levels(
        self,
        level1,
        level2
    ):
        difference = abs(
            level1-level2
        )
        percentage = difference/level1
        if percentage > self.equal_level_tolerance:
            return False, "UNEQUAL_LEVELS"
        return True, "VALID"
    def validate_momentum(
        self,
        candles,
        first_index,
        direction
    ):
        """
        Validate strong momentum before
        the first top/bottom.
        """
        lookback = 6
        if first_index < lookback:
            return False, "NOT_ENOUGH_HISTORY"
        bullish = 0
        bearish = 0
        start = candles[first_index - lookback]
        end = candles[first_index]
        for i in range(first_index - lookback, first_index):
            candle = candles[i]
            if candle["close"] > candle["open"]:
                bullish += 1
            elif candle["close"] < candle["open"]:
                bearish += 1
        # SELL
        if direction == "SELL":
            if bullish < 5:
                return False, "WEAK_BULLISH_MOMENTUM"
            move = (
                end["high"] - start["close"]
            ) / start["close"]
            if move < 0.01:
                return False, "SMALL_MOVE"
        # BUY
        else:
            if bearish < 5:
                return False, "WEAK_BEARISH_MOMENTUM"
            move = (
                start["close"] - end["low"]
            ) / start["close"]
            if move < 0.01:
                return False, "SMALL_MOVE"
        return True, "VALID"
    def confirmation_candle(
        self,
        candles,
        second,
        direction
    ):
        """
        Search for confirmation within the
        next confirmation_window candles.
        """
        second_index = second["index"]
        end = min(
            second_index +
            self.confirmation_window +
            1,
            len(candles)
        )
        for i in range(second_index + 1, end):
            candle = candles[i]
            # SELL
            if direction == "SELL":
                #
                # Must close below second top low
                #
                if candle["close"] >= second["price"]:
                    continue
                if self.body_percentage(candle) < 0.70:
                    continue
                total = (
                    candle["high"]
                    -
                    candle["low"]
                )
                if total == 0:
                    continue
                momentum = (
                    candle["close"]
                    <
                    candle["open"]
                    and
                    body / total >= 0.70
                )
                if momentum:
                    return True, "VALID"
            # BUY
            else:
                if candle["close"] <= second["price"]:
                    continue
                body = abs(
                    candle["close"]
                    -
                    candle["open"]
                )
                total = (
                    candle["high"]
                    -
                    candle["low"]
                )
                if total == 0:
                    continue
                momentum = (
                    candle["close"]
                    >
                    candle["open"]
                    and
                    body / total >= 0.70
                )
                if momentum:
                    return True, "VALID"
        return False, "NO_CONFIRMATION"
    def debug_pattern(
        self,
        direction,
        first,
        middle,
        second
    ):
        """
        Print pattern details.
        Can be disabled in production.
        """
        print()
        print("=" * 60)
        print(self.name)
        print(direction)
        print()
        print(
            "First :",
            first
        )
        print(
            "Middle:",
            middle
        )
        print(
            "Second:",
            second
        )
        print("=" * 60)
    def log_rejection(
        self,
        reason
    ):
        """
        Pattern rejected.
        Useful while tuning the strategy.
        """
        print(
            f"[{self.name}] Rejected -> {reason}"
        )
    def is_bullish(
        self,
        candle
    ):
        self.is_bullish(candle)
    def is_bearish(
        self,
        candle
    ):
        self.is_bearish(candle)
    def body_size(
        self,
        candle
    ):
        return abs(
        candle["close"]
        -
        candle["open"]
        )
    def candle_range(
        self,
        candle
    ):
        return (
        candle["high"]
        -
        candle["low"]
        )
    def body_percentage(
        self,
        candle
    ):
        rng = self.candle_range(candle)
        if rng == 0:
        return 0
        return self.body_size(candle) / rng