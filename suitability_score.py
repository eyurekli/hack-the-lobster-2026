"""
Blue Lobster — habitat suitability scorer & projector
-----------------------------------------------------
Input : CSV with columns [region, year, mean_temp]
Output: JSON of {region: {year: suitability_score}}

Model (kept deliberately simple & defensible):
  - Suitability is a piecewise-linear function of temperature based on
    the American lobster thermal range:
        <  5 °C        -> 0.0   (too cold, larvae/adults stressed)
        5–12 °C        -> ramps 0.0 -> 1.0
        12–18 °C       -> 1.0   (optimal band)
        18–20 °C       -> ramps 1.0 -> 0.5  (sub-optimal, warming stress begins)
        20–24 °C       -> ramps 0.5 -> 0.0  (acute thermal stress)
        > 24 °C        -> 0.0
  - Future temperatures are projected with a per-region linear OLS fit
    of mean_temp vs. year (numpy.polyfit, deg=1). No ML, no hidden state.
  - Surface temperature is used as a proxy for bottom temperature
    (accepted simplification at this scope).
"""

from __future__ import annotations

import csv
import io
import json
from collections import defaultdict
from pathlib import Path

import numpy as np


# ---------------------------------------------------------------------------
# 1. Suitability curve
# ---------------------------------------------------------------------------

# Anchor points: (temperature_C, suitability_0_to_1)
# np.interp will linearly interpolate between these and clamp at the ends.
_SUITABILITY_ANCHORS = [
    (0.0,  0.0),
    (5.0,  0.0),   # below 5 °C: too cold
    (12.0, 1.0),   # lower edge of optimal
    (18.0, 1.0),   # upper edge of optimal
    (20.0, 0.5),   # stress threshold
    (24.0, 0.0),   # acute stress
    (40.0, 0.0),
]
_ANCHOR_T = np.array([t for t, _ in _SUITABILITY_ANCHORS])
_ANCHOR_S = np.array([s for _, s in _SUITABILITY_ANCHORS])


def suitability(temp_c: float) -> float:
    """Map a temperature in °C to a 0–1 habitat suitability score."""
    return float(np.clip(np.interp(temp_c, _ANCHOR_T, _ANCHOR_S), 0.0, 1.0))


# ---------------------------------------------------------------------------
# 2. Per-region linear warming trend
# ---------------------------------------------------------------------------

def fit_trend(years: list[int], temps: list[float]) -> tuple[float, float]:
    """Return (slope_per_year, intercept) from a degree-1 polyfit."""
    slope, intercept = np.polyfit(np.array(years, dtype=float),
                                  np.array(temps, dtype=float), 1)
    return float(slope), float(intercept)


def project_temp(year: int, slope: float, intercept: float) -> float:
    return slope * year + intercept


# ---------------------------------------------------------------------------
# 3. Pipeline
# ---------------------------------------------------------------------------

PROJECTION_YEARS = (2030, 2040, 2050)
EXPECTED_REGIONS = ("Bay of Fundy", "Scotian Shelf", "Gulf of St. Lawrence")


def load_csv(source) -> dict[str, list[tuple[int, float]]]:
    """
    Accepts a file path or any text iterable. Returns:
        { region: [(year, mean_temp), ...] sorted by year }
    """
    if isinstance(source, (str, Path)):
        f = open(source, "r", newline="", encoding="utf-8")
        close = True
    else:
        f = source
        close = False

    try:
        reader = csv.DictReader(f)
        by_region: dict[str, list[tuple[int, float]]] = defaultdict(list)
        for row in reader:
            region = row["region"].strip()
            year = int(row["year"])
            temp = float(row["mean_temp"])
            by_region[region].append((year, temp))
    finally:
        if close:
            f.close()

    for region in by_region:
        by_region[region].sort(key=lambda yt: yt[0])
    return by_region


def build_output(by_region: dict[str, list[tuple[int, float]]]) -> dict:
    out: dict[str, dict[str, float]] = {}

    for region, series in by_region.items():
        years = [y for y, _ in series]
        temps = [t for _, t in series]

        # Historical: score each observed year directly.
        region_out = {str(y): round(suitability(t), 3)
                      for y, t in zip(years, temps)}

        # Projections: linear fit -> projected temp -> suitability.
        if len(years) >= 2:
            slope, intercept = fit_trend(years, temps)
            for fy in PROJECTION_YEARS:
                proj_t = project_temp(fy, slope, intercept)
                region_out[str(fy)] = round(suitability(proj_t), 3)
        else:
            # Not enough points to fit a line; skip projections rather
            # than fabricate a trend.
            pass

        out[region] = region_out

    # Warn (not fail) if a contracted region is missing — keeps the
    # JSON contract loud without crashing during partial datasets.
    missing = [r for r in EXPECTED_REGIONS if r not in out]
    if missing:
        print(f"[warn] missing expected regions in input: {missing}")

    return out


def run(csv_source, json_path: str | Path) -> dict:
    by_region = load_csv(csv_source)
    output = build_output(by_region)
    Path(json_path).write_text(json.dumps(output, indent=2))
    return output


# ---------------------------------------------------------------------------
# 4. Sample run with embedded CSV
# ---------------------------------------------------------------------------

SAMPLE_CSV = """region,year,mean_temp
Bay of Fundy,2000,9.2
Bay of Fundy,2005,9.5
Bay of Fundy,2010,9.9
Bay of Fundy,2015,10.4
Bay of Fundy,2020,10.9
Bay of Fundy,2024,11.3
Scotian Shelf,2000,10.1
Scotian Shelf,2005,10.5
Scotian Shelf,2010,11.0
Scotian Shelf,2015,11.6
Scotian Shelf,2020,12.2
Scotian Shelf,2024,12.7
Gulf of St. Lawrence,2000,7.8
Gulf of St. Lawrence,2005,8.1
Gulf of St. Lawrence,2010,8.6
Gulf of St. Lawrence,2015,9.2
Gulf of St. Lawrence,2020,9.8
Gulf of St. Lawrence,2024,10.3
"""


if __name__ == "__main__":
    # Quick sanity check on the suitability curve
    print("Suitability curve check:")
    for t in [3, 5, 10, 15, 19, 21, 23, 25]:
        print(f"  {t}°C -> {suitability(t):.2f}")
    print()

    # Main pipeline
    result = run(io.StringIO(SAMPLE_CSV), "habitat_suitability.json")
    print(json.dumps(result, indent=2))
