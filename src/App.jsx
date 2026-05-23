import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { REGIONS } from './regions.js';
import { scoreToColor, scoreToLabel } from './colorScale.js';

function interpolateScore(data, region, year) {
  const regionData = data[region];
  if (!regionData) return 0;

  const years = Object.keys(regionData).map(Number).sort((a, b) => a - b);
  if (years.length === 0) return 0;
  if (year <= years[0]) return regionData[years[0]];
  if (year >= years[years.length - 1]) return regionData[years[years.length - 1]];

  const lo = years.filter((y) => y <= year).at(-1);
  const hi = years.filter((y) => y >= year)[0];
  if (lo === hi) return regionData[lo];

  const t = (year - lo) / (hi - lo);
  return regionData[lo] + t * (regionData[hi] - regionData[lo]);
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

  // Load JSON
  useEffect(() => {
    fetch('/habitat_suitability.json')
      .then((r) => r.json())
      .then((d) => {
        const allYears = Object.values(d).flatMap((v) => Object.keys(v).map(Number));
        const min = Math.min(...allYears);
        const max = Math.max(...allYears);
        setYearRange([min, max]);
        setYear(min);
        setData(d);
      });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [46.5, -62.5],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    REGIONS.forEach((region) => {
      const poly = L.polygon(region.coordinates, {
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.6,
        fillColor: '#888888',
        fillOpacity: 0.65,
      }).addTo(map);

      poly.on('click', () => {
        setActiveRegion((prev) => (prev === region.name ? null : region.name));
      });

      poly.on('mouseover', function () {
        this.setStyle({ weight: 2.5, opacity: 1 });
      });

      poly.on('mouseout', function () {
        this.setStyle({ weight: 1.5, opacity: 0.6 });
      });

      polygonsRef.current[region.name] = poly;

      const icon = L.divIcon({ className: '', html: '', iconSize: [0, 0] });
      const marker = L.marker(region.labelLatLng, { icon, interactive: false }).addTo(map);
      labelsRef.current[region.name] = marker;
    });

    leafletMap.current = map;
    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update polygon colors when data or year changes
  useEffect(() => {
    if (!data) return;
    const newScores = {};

    REGIONS.forEach((region) => {
      const score = interpolateScore(data, region.name, year);
      newScores[region.name] = score;

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
        const icon = L.divIcon({ className: '', html, iconSize: [0, 0] });
        marker.setIcon(icon);
      }
    });

    setScores(newScores);
  }, [data, year]);

  const activeRegionData = activeRegion ? REGIONS.find((r) => r.name === activeRegion) : null;
  const activeScore = activeRegion ? scores[activeRegion] : null;

  const yearStep = 1;

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

      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {/* Year Slider Overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[min(480px,90vw)]">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-6 py-4 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Year
                </span>
                <span className="text-2xl font-bold text-cyan-400 tabular-nums">{year}</span>
              </div>
              <input
                type="range"
                min={yearRange[0]}
                max={yearRange[1]}
                step={yearStep}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #22d3ee ${
                    ((year - yearRange[0]) / (yearRange[1] - yearRange[0])) * 100
                  }%, #334155 0%)`,
                }}
              />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>{yearRange[0]}</span>
                <span>{yearRange[1]}</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 z-[1000]">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-4 py-3 shadow-xl min-w-[160px]">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Habitat Suitability
              </p>
              <div className="space-y-1.5">
                {[
                  { label: 'High (75-100%)', score: 0.875 },
                  { label: 'Moderate (50-75%)', score: 0.625 },
                  { label: 'Low (25-50%)', score: 0.375 },
                  { label: 'Unviable (0-25%)', score: 0.125 },
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
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Region Scores — {year}
            </h2>
            <div className="space-y-2">
              {REGIONS.map((region) => {
                const score = scores[region.name] ?? 0;
                const pct = (score * 100).toFixed(0);
                const isActive = activeRegion === region.name;
                return (
                  <button
                    key={region.name}
                    onClick={() =>
                      setActiveRegion((prev) => (prev === region.name ? null : region.name))
                    }
                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors border ${
                      isActive
                        ? 'bg-slate-700 border-slate-500'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-200">{region.name}</span>
                      <span className="text-sm font-bold" style={{ color: scoreToColor(score) }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: scoreToColor(score) }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {scoreToLabel(score)} suitability
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {activeRegionData && activeScore !== null ? (
            <div className="p-4 flex-1">
              <h3 className="text-sm font-bold text-white mb-1">{activeRegionData.name}</h3>
              <div
                className="text-2xl font-bold mb-2 transition-colors duration-500"
                style={{ color: scoreToColor(activeScore) }}
              >
                {(activeScore * 100).toFixed(1)}% — {scoreToLabel(activeScore)}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {activeRegionData.description}
              </p>

              {data && (
                <>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Projected Trend
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(data[activeRegionData.name] ?? {})
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([y, s]) => (
                        <div key={y} className="flex items-center gap-2">
                          <span
                            className={`text-xs w-10 ${
                              Number(y) === year ? 'text-cyan-400 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {y}
                          </span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(s * 100).toFixed(0)}%`,
                                background: scoreToColor(s),
                              }}
                            />
                          </div>
                          <span
                            className="text-xs w-8 text-right"
                            style={{ color: scoreToColor(s) }}
                          >
                            {(s * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.5"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click a region on the map
                <br />
                or a card above to see
                <br />
                its detailed forecast
              </p>
            </div>
          )}

          <div className="p-4 border-t border-slate-800">
            <p className="text-xs text-slate-600 leading-relaxed">
              American lobster are thermally stressed above ~20°C. As the Gulf of Maine warms,
              suitable habitat is shifting northward toward Atlantic Canada.
            </p>
            <p className="text-xs text-slate-700 mt-2">Data: Prototype / fake scores for development</p>
          </div>
        </aside>
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
