class BaseStrategy:

    async def on_market_data(self,data):
        raise NotImplementedError