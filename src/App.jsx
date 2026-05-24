import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { REGIONS } from "./regions.js";
import { scoreToColor, scoreToLabel } from "./colorScale.js";
import LobsterMigration from "./LobsterMigration.jsx";

function getSuitabilityValue(entry) {
  if (entry == null) return 0;

  // New JSON shape: { temperature: 8.5, suitability: 0.49 }
  if (typeof entry === "object") return Number(entry.suitability ?? 0);

  // Old JSON shape: 0.49
  return Number(entry);
}

function getTemperatureValue(entry) {
  if (entry == null || typeof entry !== "object") return null;
  const temperature = Number(entry.temperature);
  return Number.isFinite(temperature) ? temperature : null;
}

function interpolateMetric(data, region, year, getValue) {
  const regionData = data[region];
  if (!regionData) return null;

  const years = Object.keys(regionData)
    .map(Number)
    .sort((a, b) => a - b);
  if (years.length === 0) return null;

  const firstValue = getValue(regionData[years[0]]);
  const lastValue = getValue(regionData[years[years.length - 1]]);

  if (year <= years[0]) return firstValue;
  if (year >= years[years.length - 1]) return lastValue;

  const lo = years.filter((y) => y <= year).at(-1);
  const hi = years.filter((y) => y >= year)[0];

  const loValue = getValue(regionData[lo]);
  const hiValue = getValue(regionData[hi]);

  if (lo === hi) return loValue;
  if (loValue == null || hiValue == null) return null;

  const t = (year - lo) / (hi - lo);
  return loValue + t * (hiValue - loValue);
}

function interpolateScore(data, region, year) {
  return interpolateMetric(data, region, year, getSuitabilityValue) ?? 0;
}

function interpolateTemperature(data, region, year) {
  return interpolateMetric(data, region, year, getTemperatureValue);
}

export default function App() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const polygonsRef = useRef({});
  const labelsRef = useRef({});

  const [data, setData] = useState(null);
  const [year, setYear] = useState(2024);
  const [yearRange, setYearRange] = useState([2024, 2050]);
  const [activeRegion, setActiveRegion] = useState(null);
  const [scores, setScores] = useState({});
  const [temperatures, setTemperatures] = useState({});
  const [mapInstance, setMapInstance] = useState(null);
  const [showMigration, setShowMigration] = useState(true);
  const [yearInputValue, setYearInputValue] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const playbackIntervalMs = 450;

  // Load JSON
  useEffect(() => {
    fetch("/habitat_suitability.json")
      .then((r) => r.json())
      .then((d) => {
        const allYears = Object.values(d).flatMap((v) =>
          Object.keys(v).map(Number),
        );
        const min = Math.min(...allYears);
        const max = Math.max(...allYears);
        setYearRange([min, max]);
        setYear(min);
        setYearInputValue(String(min));
        setData(d);
      });
  }, []);

  // Sync text input with year slider
  useEffect(() => {
    setYearInputValue(String(year));
  }, [year]);

  // Advance the selected year while playback is active.
  // The interval is intentionally short so the animation moves quickly.
  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setInterval(() => {
      setYear((currentYear) => {
        if (currentYear >= yearRange[1]) {
          setIsPlaying(false);
          return currentYear;
        }

        const nextYear = currentYear + 1;
        if (nextYear >= yearRange[1]) {
          setIsPlaying(false);
          return yearRange[1];
        }

        return nextYear;
      });
    }, playbackIntervalMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, playbackIntervalMs, yearRange]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [46.5, -62.5],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);

    REGIONS.forEach((region) => {
      const poly = L.polygon(region.coordinates, {
        color: "#ffffff",
        weight: 1.5,
        opacity: 0.6,
        fillColor: "#888888",
        fillOpacity: 0.65,
      }).addTo(map);

      poly.on("click", () => {
        setActiveRegion((prev) => (prev === region.name ? null : region.name));
      });

      poly.on("mouseover", function () {
        this.setStyle({ weight: 2.5, opacity: 1 });
      });

      poly.on("mouseout", function () {
        this.setStyle({ weight: 1.5, opacity: 0.6 });
      });

      polygonsRef.current[region.name] = poly;

      const icon = L.divIcon({ className: "", html: "", iconSize: [0, 0] });
      const marker = L.marker(region.labelLatLng, {
        icon,
        interactive: false,
      }).addTo(map);
      labelsRef.current[region.name] = marker;
    });

    leafletMap.current = map;
    setMapInstance(map);
    return () => {
      map.remove();
      leafletMap.current = null;
      setMapInstance(null);
    };
  }, []);

  // Update polygon colors when data or year changes
  useEffect(() => {
    if (!data) return;
    const newScores = {};
    const newTemperatures = {};

    REGIONS.forEach((region) => {
      const score = interpolateScore(data, region.name, year);
      const temperature = interpolateTemperature(data, region.name, year);
      newScores[region.name] = score;
      newTemperatures[region.name] = temperature;

      const poly = polygonsRef.current[region.name];
      if (poly) {
        poly.setStyle({
          fillColor: scoreToColor(score),
          fillOpacity: 0.7,
        });
      }

      const marker = labelsRef.current[region.name];
      if (marker) {
        const label = scoreToLabel(score);
        const html = `
          <div style="
            background: rgba(10,20,30,0.82);
            border: 1px solid rgba(255,255,255,0.18);
            border-radius: 6px;
            padding: 4px 9px;
            pointer-events: none;
            white-space: nowrap;
            transform: translate(-50%, -50%);
            font-family: system-ui, sans-serif;
          ">
            <div style="color:#e2e8f0;font-size:11px;font-weight:600;letter-spacing:0.04em;">${region.name}</div>
            <div style="color:${scoreToColor(score)};font-size:13px;font-weight:700;">${(score * 100).toFixed(0)}% · ${label}</div>
          </div>`;
        const icon = L.divIcon({ className: "", html, iconSize: [0, 0] });
        marker.setIcon(icon);
      }
    });

    setScores(newScores);
    setTemperatures(newTemperatures);
  }, [data, year]);

  const activeRegionData = activeRegion
    ? REGIONS.find((r) => r.name === activeRegion)
    : null;
  const activeScore = activeRegion ? scores[activeRegion] : null;
  const activeTemperature = activeRegion ? temperatures[activeRegion] : null;

  const yearStep = 1;

  const handlePlayToggle = () => {
    if (year >= yearRange[1]) return;
    setIsPlaying((playing) => !playing);
  };

  // Handle slider change
  const handleSliderChange = (e) => {
    setIsPlaying(false);
    setYear(Number(e.target.value));
  };

  // Handle text input change
  const handleYearInputChange = (e) => {
    setYearInputValue(e.target.value);
  };

  // Handle text input blur and validation
  const handleYearInputBlur = () => {
    const parsed = parseInt(yearInputValue, 10);
    if (isNaN(parsed) || parsed < yearRange[0] || parsed > yearRange[1]) {
      // Invalid — revert to current year
      setYearInputValue(String(year));
    } else {
      // Valid
      setIsPlaying(false);
      setYear(parsed);
    }
  };

  // Handle Enter key in text input
  const handleYearInputKeyDown = (e) => {
    if (e.key === "Enter") {
      handleYearInputBlur();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12c0-5 3-9 9-9s9 4 9 9" />
              <path d="M3 12c0 3 1.5 5 4 6s5.5 1 5.5 1" />
              <path d="M21 12c0 3-1.5 5-4 6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-wide">
              Blue Lobster
            </h1>
            <p className="text-xs text-slate-400 leading-tight">
              Atlantic Canada Habitat Suitability Forecast
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500 hidden sm:block">
          Gulf of Maine is warming faster than 99% of the global ocean
        </div>
      </header>

      <div className="flex flex-col flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
          {showMigration && (
            <LobsterMigration map={mapInstance} scores={scores} isPlaying={isPlaying} />
          )}

          {/* Year Slider Overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[min(420px,90vw)]">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Year</span>
                <span className="text-lg font-bold text-cyan-400 tabular-nums">{year}</span>
              </div>
              <div className="flex items-center gap-3 mb-1">
                <button
                  type="button"
                  onClick={handlePlayToggle}
                  disabled={year >= yearRange[1]}
                  aria-label={isPlaying ? "Pause year animation" : "Play year animation"}
                  title={isPlaying ? "Pause" : "Play"}
                  className={`w-9 h-9 flex-shrink-0 rounded-full grid place-items-center transition-all border shadow-lg ${
                    year >= yearRange[1]
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                      : isPlaying
                        ? "bg-orange-500/20 border-orange-400/50 text-orange-300 hover:bg-orange-500/30 hover:scale-105"
                        : "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 hover:scale-105"
                  }`}
                >
                  {isPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6.5" y="5" width="4" height="14" rx="1" />
                      <rect x="13.5" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <polygon points="9.5,6.5 18,12 9.5,17.5" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={yearRange[0]}
                  max={yearRange[1]}
                  step={yearStep}
                  value={year}
                  onChange={handleSliderChange}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #22d3ee ${
                      ((year - yearRange[0]) / (yearRange[1] - yearRange[0])) *
                      100
                    }%, #334155 0%)`,
                  }}
                />
              </div>
              <div className="flex justify-between mb-2 text-xs text-slate-500 pl-12">
                <span>{yearRange[0]}</span>
                <span>{yearRange[1]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Or type:</span>
                <input
                  type="text"
                  value={yearInputValue}
                  onChange={handleYearInputChange}
                  onBlur={handleYearInputBlur}
                  onKeyDown={handleYearInputKeyDown}
                  className="w-16 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-cyan-400 font-mono text-center text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  placeholder="YYYY"
                />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 z-[1000]">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-4 py-3 shadow-xl w-[190px]">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Habitat Suitability
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "High (75-100%)", score: 0.875 },
                  { label: "Moderate (50-75%)", score: 0.625 },
                  { label: "Low (25-50%)", score: 0.375 },
                  { label: "Unviable (0-25%)", score: 0.125 },
                ].map(({ label, score }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-sm flex-shrink-0 border border-white/10"
                      style={{ background: scoreToColor(score) }}
                    />
                    <span className="text-xs text-slate-300">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-500 leading-snug">
                  Scores interpolated from
                  <br />
                  temperature model output
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-700">
                <button
                  onClick={() => setShowMigration((v) => !v)}
                  className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    showMigration
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300"
                      : "bg-slate-800 border border-slate-700 text-slate-500"
                  }`}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      showMigration
                        ? "bg-cyan-400 animate-pulse"
                        : "bg-slate-600"
                    }`}
                  />
                  Migration Flow
                </button>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-600 leading-snug">Data: CSV-derived sea surface temperatures and modeled suitability scores</p>
              </div>
            </div>
          </div>
          {/* Detail panel — floating top-left overlay */}
          {activeRegionData && activeScore !== null && (
            <div className="absolute top-20 left-4 z-[1000] w-52">
              <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 shadow-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300 truncate">{activeRegionData.name}</span>
                  <button onClick={() => setActiveRegion(null)} className="text-slate-600 hover:text-slate-300 ml-2 text-base leading-none" aria-label="Close">×</button>
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: scoreToColor(activeScore) }}>{(activeScore * 100).toFixed(0)}%</span>
                  <span className="text-xs text-slate-500">{scoreToLabel(activeScore)}</span>
                  {activeTemperature !== null && (
                    <span className="text-xs text-slate-500 ml-auto">{activeTemperature.toFixed(1)}°C</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-2">{activeRegionData.description}</p>
                {data && (() => {
                  const entries = Object.entries(data[activeRegionData.name] ?? {}).sort(([a], [b]) => Number(a) - Number(b));
                  const keyYears = new Set([entries[0]?.[0], String(year), entries[entries.length - 1]?.[0]].filter(Boolean));
                  return (
                    <div className="space-y-0.5 pt-1 border-t border-slate-800">
                      {entries.filter(([y]) => keyYears.has(y)).map(([y, entry]) => {
                        const temperature = getTemperatureValue(entry);
                        const suitability = getSuitabilityValue(entry);
                        return (
                          <div key={y} className="flex items-center gap-1.5">
                            <span className={`text-xs w-9 tabular-nums ${Number(y) === year ? "text-cyan-400 font-bold" : "text-slate-600"}`}>{y}</span>
                            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(suitability * 100).toFixed(0)}%`, background: scoreToColor(suitability) }} />
                            </div>
                            <span className="text-xs w-10 text-right text-slate-500">{temperature === null ? "—" : `${temperature.toFixed(1)}°`}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Region strip */}
        <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 grid grid-cols-3 divide-x divide-slate-800">
          {REGIONS.map((region) => {
            const score = scores[region.name] ?? 0;
            const pct = (score * 100).toFixed(0);
            const isActive = activeRegion === region.name;
            return (
              <button
                key={region.name}
                onClick={() => setActiveRegion((prev) => prev === region.name ? null : region.name)}
                className={`text-left px-4 py-3 transition-colors ${isActive ? "bg-slate-800" : "hover:bg-slate-800/50"}`}
              >
                <div
                  className="h-0.5 w-full mb-2 rounded-full transition-all duration-500"
                  style={{ background: scoreToColor(score) }}
                />
                <div className="text-xs text-slate-400 mb-0.5 truncate">{region.name}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tabular-nums" style={{ color: scoreToColor(score) }}>{pct}%</span>
                  <span className="text-xs text-slate-600">{scoreToLabel(score)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .leaflet-container { background: #0d1117; }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
          border: 2px solid #0e7490;
          box-shadow: 0 0 0 3px rgba(34,211,238,0.15);
        }
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
          border: 2px solid #0e7490;
        }
        input[type='range'] { outline: none; }
        .hover\\:bg-slate-750:hover { background-color: rgb(37 47 63); }
      `}</style>
    </div>
  );
}
