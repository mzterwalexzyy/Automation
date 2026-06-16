from freqtrade.strategy import IStrategy, IntParameter, DecimalParameter
from pandas import DataFrame
import talib.abstract as ta


class BBStrategy(IStrategy):
    """
    Bollinger Bands mean-reversion strategy with RSI confirmation.
    Buys when price closes below lower band AND RSI < 35 (double confirmation).
    Sells when price closes above upper band AND RSI > 65.
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

    bb_period  = IntParameter(10, 30,  default=20,  space="buy", optimize=True)
    bb_std_dev = DecimalParameter(1.5, 3.0, default=2.0, decimals=1, space="buy", optimize=True)
    buy_rsi    = IntParameter(25, 40,  default=35,  space="buy",  optimize=True)
    sell_rsi   = IntParameter(60, 75,  default=65,  space="sell", optimize=True)

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        upper, middle, lower = ta.BBANDS(
            dataframe,
            timeperiod=self.bb_period.value,
            nbdevup=self.bb_std_dev.value,
            nbdevdn=self.bb_std_dev.value,
            matype=0,
        )
        dataframe["bb_upper"]  = upper
        dataframe["bb_middle"] = middle
        dataframe["bb_lower"]  = lower
        dataframe["bb_width"]  = (upper - lower) / middle
        dataframe["rsi"]       = ta.RSI(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] <= dataframe["bb_lower"]) &
            (dataframe["rsi"]   <  self.buy_rsi.value) &
            (dataframe["volume"] > 0),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] >= dataframe["bb_upper"]) &
            (dataframe["rsi"]   >  self.sell_rsi.value) &
            (dataframe["volume"] > 0),
            "exit_long",
        ] = 1
        return dataframe
