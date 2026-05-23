# Blue Lobster — Project Context for Copilot

**Project: Blue Lobster — Atlantic Canada Lobster Habitat Suitability Forecaster**

A hackathon project (theme: Water). It forecasts *where and when* suitable American lobster habitat is emerging across Atlantic Canada as the Gulf of Maine warms. The core insight: lobsters are thermally stressed above ~20°C (optimal ~12–18°C), so as southern waters warm, suitable habitat shifts northward. Existing tools (NOAA DisMAP, GMRI forecasts, DFO stock assessments) show *how many* lobsters and *that* they're shifting, but none predict *where* suitable habitat will emerge across specific Atlantic Canadian sub-regions. This project does.

## Architecture — a three-stage pipeline:

1. **Data (Python):** Temperature data prepared into a CSV with columns `region, year, mean_temp`.
2. **Model (Python) — `suitability_score.py`:** Reads the CSV, scores each region/year for habitat suitability (0–1) using a piecewise-linear function of temperature against the lobster thermal range, fits a per-region linear warming trend (numpy.polyfit), projects to 2030/2040/2050, and writes `habitat_suitability.json`. The model is intentionally transparent (no ML) so every number is defensible.
3. **Web (React + Vite + Leaflet) — `src/`:** Fetches `/habitat_suitability.json` from the `public/` folder, draws three regions as colored polygons on a Leaflet map, with a year slider, a per-region side panel with trend bars, a color legend, and a click-to-expand detail panel. Dark theme, Tailwind CSS. Deployed on Firebase Hosting (serves from `dist/`).

## The two fixed contracts — do not change these, all three stages depend on them:

- Region names, exact strings: `Bay of Fundy`, `Scotian Shelf`, `Gulf of St. Lawrence`
- Model→map JSON shape:
```json
{ "Bay of Fundy": { "2000": 0.65, "2024": 0.70, "2050": 0.89 }, "Scotian Shelf": { } }
```
Suitability scores are floats 0.0–1.0. Year keys are strings.

## Key files:

- `suitability_score.py` — the model + suitability curve (anchor points: 5°C→0, 12–18°C→1.0, 20°C→0.5, 24°C→0).
- `src/App.jsx` — main map component.
- `src/regions.js` — region names, coordinates, label positions, descriptions.
- `src/colorScale.js` — score-to-color and score-to-label helpers.
- `public/habitat_suitability.json` — the data the map reads (must live in `public/` so Vite serves and bundles it).
- `firebase.json` — Firebase hosting config, deploys `dist/`.

## Conventions / things to respect:

- The data file MUST be in `public/` — Vite only serves and builds files from there. A copy at repo root won't be served in production.
- Keep the suitability model transparent and explainable; don't introduce ML or hidden state.
- The web layer should degrade gracefully if the JSON fails to load (fallback, not a blank map).
- Surface temperature is used as a proxy for bottom temperature — an accepted simplification at this scope.
- `node_modules/` is gitignored and NOT tracked; regenerate with `npm install` after cloning.
- Standard workflow: edit model → `python suitability_score.py` → confirm JSON lands in `public/` → `npm run build` → deploy.

## Current status:

Model complete and working. Map built, deployed, and functional. Real temperature data is being integrated (replacing earlier sample data). Remaining polish: optional intermediate projection years for smoother slider animation, graceful JSON-load error handling, and final README/data-source documentation.
