from freqtrade.strategy import IStrategy, IntParameter
from pandas import DataFrame
import talib.abstract as ta


class RSIStrategy(IStrategy):
    """
    RSI mean-reversion strategy.
    Buys when RSI dips into oversold territory, sells when overbought.
    Timeframe: 1h | Pairs: BTC/USDT, ETH/USDT
    """

    INTERFACE_VERSION = 3
    timeframe = "1h"
    startup_candle_count: int = 30

    minimal_roi = {
        "60": 0.01,
        "30": 0.02,
        "0":  0.04
    }

    stoploss = -0.05
    trailing_stop = False

    process_only_new_candles = True
    use_exit_signal = True
    exit_profit_only = False
    ignore_roi_if_entry_signal = False

    buy_rsi  = IntParameter(20, 40, default=30, space="buy",  optimize=True)
    sell_rsi = IntParameter(60, 80, default=70, space="sell", optimize=True)

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["rsi"] < self.buy_rsi.value) &
            (dataframe["volume"] > 0),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["rsi"] > self.sell_rsi.value) &
            (dataframe["volume"] > 0),
            "exit_long",
        ] = 1
        return dataframe
