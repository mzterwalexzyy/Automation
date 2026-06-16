from freqtrade.strategy import IStrategy, IntParameter
from pandas import DataFrame
import talib.abstract as ta


class MACrossStrategy(IStrategy):
    """
    EMA Golden/Death Cross strategy.
    Buys on fast EMA crossing above slow EMA, sells on the reverse.
    Trailing stop locks in profits as the trend extends.
    Timeframe: 1h | Pairs: BTC/USDT, ETH/USDT
    """

    INTERFACE_VERSION = 3
    timeframe = "1h"
    startup_candle_count: int = 200

    minimal_roi = {
        "120": 0.01,
        "60":  0.02,
        "0":   0.05
    }

    stoploss = -0.05
    trailing_stop = True
    trailing_stop_positive = 0.01
    trailing_stop_positive_offset = 0.02
    trailing_only_offset_is_reached = True

    process_only_new_candles = True
    use_exit_signal = True
    exit_profit_only = False

    fast_ema = IntParameter(10, 50,  default=20,  space="buy", optimize=True)
    slow_ema = IntParameter(50, 200, default=100, space="buy", optimize=True)

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        for period in self.fast_ema.range:
            dataframe[f"ema_fast_{period}"] = ta.EMA(dataframe, timeperiod=period)
        for period in self.slow_ema.range:
            dataframe[f"ema_slow_{period}"] = ta.EMA(dataframe, timeperiod=period)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        fast = f"ema_fast_{self.fast_ema.value}"
        slow = f"ema_slow_{self.slow_ema.value}"
        dataframe.loc[
            (dataframe[fast] > dataframe[slow]) &
            (dataframe[fast].shift(1) <= dataframe[slow].shift(1)) &
            (dataframe["volume"] > 0),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        fast = f"ema_fast_{self.fast_ema.value}"
        slow = f"ema_slow_{self.slow_ema.value}"
        dataframe.loc[
            (dataframe[fast] < dataframe[slow]) &
            (dataframe[fast].shift(1) >= dataframe[slow].shift(1)) &
            (dataframe["volume"] > 0),
            "exit_long",
        ] = 1
        return dataframe
