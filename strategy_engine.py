class StrategyEngine:
    def __init__(self):
        self.strategies = []
        self.cache = None
        self.portfolio = None

    def update_market(self, market_data):
        print(
            f"History cached: "
            f"{market_data['symbol']} "
            f"{market_data['timeframe']} "
            f"{market_data['time']}"
        )


    async def process(
        self,
        client_id,
        market_data
    ):

        """
        Called by bridge.py whenever
        MT5 streams new market data.
        """

        #
        # Update shared cache
        #

        self.update_market(

            market_data

        )


        orders = []


        for strategy in self.strategies:

            #
            # Symbol mismatch
            #

            if strategy.symbol != market_data["symbol"]:

                continue

            #
            # Required timeframe missing
            #

            if strategy.timeframe not in market_data["timeframes"]:

                continue


            candles = self.cache.get(
                strategy.symbol,
                strategy.timeframe
            )
        
            signal = await strategy.on_market_data(
                candles
            )

            if signal is None:

                continue


            order = self.portfolio.build_order(

                client_id,

                signal

            )

            if order is None:

                continue


            orders.append(

                order

            )


        return orders

    async def process_strategy(
        self,
        client_id,
        strategy,
        market_data
    ):

        signal = await strategy.on_market_data(

            market_data

        )

        if signal is None:

            return None

        return self.portfolio.build_order(

            client_id,

            signal

        )