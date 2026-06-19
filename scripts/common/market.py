"""
Робастная статистика по ЖИВОЙ выборке цен и определение «ниже рынка».

Ключевая идея переделки: «низ рынка» считается не по замороженному снимку базы
(где min_price — самое дешёвое из ~5 устаревших сэмплов), а по тому, что
ВЫСТАВЛЕНО ПРЯМО СЕЙЧАС на странице выдачи. Так бот сравнивает лот с актуальным
распределением цен сопоставимых аппаратов — и не зовёт «низом рынка» обычный лот,
ниже которого на той же странице висит десяток дешевле.

Чистые функции, без сети — тестируются офлайн.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class MarketStats:
    n: int            # сколько живых сопоставимых учтено
    median: int       # медиана текущих цен
    p20: int          # 20-й перцентиль («дёшево среди текущих»)
    p10: int          # 10-й перцентиль (граница «подозрительно дёшево»)
    low: int          # минимальная цена в выборке
    high: int         # максимальная цена в выборке


def _percentile(sorted_vals: List[int], q: float) -> int:
    """Линейная интерполяция перцентиля q∈[0,1]."""
    n = len(sorted_vals)
    if n == 1:
        return sorted_vals[0]
    idx = q * (n - 1)
    lo = int(idx)
    frac = idx - lo
    if lo + 1 >= n:
        return sorted_vals[-1]
    return int(round(sorted_vals[lo] + (sorted_vals[lo + 1] - sorted_vals[lo]) * frac))


def robust_stats(prices: List[int]) -> Optional[MarketStats]:
    """
    Считает статистику по живой выборке цен.
    При n>=8 отсекает выбросы по IQR (битые/скам-цены не должны портить медиану).
    Возвращает None, если выборка пуста.
    """
    vals = sorted(p for p in prices if p and p > 0)
    if not vals:
        return None

    if len(vals) >= 8:
        q1 = _percentile(vals, 0.25)
        q3 = _percentile(vals, 0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        clean = [p for p in vals if lower <= p <= upper]
        if len(clean) >= 5:
            vals = clean

    return MarketStats(
        n=len(vals),
        median=int(statistics.median(vals)),
        p20=_percentile(vals, 0.20),
        p10=_percentile(vals, 0.10),
        low=vals[0],
        high=vals[-1],
    )


@dataclass
class DealAssessment:
    is_deal: bool          # ниже рынка с достаточным запасом маржи
    is_suspicious: bool    # слишком дёшево (вероятен скрытый дефект/скам)
    margin: float          # (median - price) / median — доля ниже медианы
    reason: str


def assess_deal(
    price: int,
    stats: MarketStats,
    *,
    min_margin: float,
    scam_floor: float,
) -> DealAssessment:
    """
    Оценивает лот против ЖИВОЙ статистики рынка.

    - margin = насколько ниже медианы (доля).
    - is_deal: margin >= min_margin (есть запас для перепродажи) и НЕ в зоне скама.
    - is_suspicious: цена ниже scam_floor * median — слишком хорошо, чтобы быть правдой.
    """
    if stats.median <= 0:
        return DealAssessment(False, False, 0.0, "нет медианы рынка")

    margin = (stats.median - price) / stats.median
    suspicious = price < stats.median * scam_floor

    if margin < min_margin:
        return DealAssessment(False, suspicious, margin,
                              f"запас {margin*100:.0f}% < порога {min_margin*100:.0f}%")

    if suspicious:
        return DealAssessment(False, True, margin,
                              f"подозрительно дёшево ({margin*100:.0f}% ниже медианы)")

    return DealAssessment(True, False, margin, f"ниже рынка на {margin*100:.0f}%")
