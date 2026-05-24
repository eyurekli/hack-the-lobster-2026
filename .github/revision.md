
**FEATURE REVISION: Replace sub-zone polygons with glowing coastline highlights**

**Context:** Blue Lobster project — React + Vite + Leaflet map showing lobster habitat suitability across three Atlantic Canada regions (Bay of Fundy, Scotian Shelf, Gulf of St. Lawrence), colored 0–100% on a green(high)→red(unviable) scale, with a year slider (1982–2050). There's a "Show sub-zones" toggle already in place.

**The problem with the current sub-zone implementation:** Right now, turning on sub-zones draws additional small *polygons* on top of the big region polygons. This looks cluttered and doesn't communicate the intent. The goal is to show a fisherman *which stretch of coast* to head for — that should read as a highlighted coastline, not more filled shapes.

**What to build instead — glowing coastline highlights:**

1. **Represent each sub-zone as a colored line (polyline) tracing the actual coastline**, NOT a filled polygon. Think of it as highlighting segments of the shore. Each coastline segment is colored by its suitability score using the SAME existing green→red scale (green = most suitable / "go here", red = unviable). Do not invert the colors.

2. **Add a glow effect to the lines** so they read as glowing highlights, not thin flat strokes. Achieve this with a bright colored line plus a softer, wider, blurred/semi-transparent line of the same color underneath (a halo/shadow). The most suitable coasts should visually "pop."

3. **The "Show sub-zones" toggle should SWAP views, not stack them:**
   - Toggle OFF (default): show the three big region polygons as now.
   - Toggle ON: HIDE the three big region polygons, and show ONLY the glowing coastline highlights.
   - One clean view at a time — never both at once.

**Sub-zone coastline segments (≈3 per region, 9 total):**
- Bay of Fundy: Upper Bay / Minas Basin, Outer Bay / Grand Manan, Annapolis Basin
- Scotian Shelf: Halifax / Eastern Shore, South Shore (Lunenburg–Shelburne), Cape Breton / Sydney Bight
- Gulf of St. Lawrence: Northumberland Strait, Magdalen Shallows, Cape Breton North Coast

**Coastline coordinates:** Each highlight is a polyline that should roughly follow the real shoreline of its stretch. Use a handful of hand-placed lat/lng points per segment that trace the coast — they don't need to be perfectly precise, just visually hug the shore so the glow looks like it's lighting up a coastline. (We can refine points later.)

**Data:** We'll provide a mock sub-zone dataset (representative values — the real granular data is DFO-owned and access-gated, unavailable over the weekend). Structure it parallel to the existing data: each sub-zone has a suitability score per year, so it responds to the year slider exactly like the main regions.

**Keep these behaviors:**
- The glowing coastlines must respond to the existing **year slider** — colors shift over time like the main regions.
- Keep a visible **honesty label** whenever sub-zones are shown: "Representative sub-regional data — see methodology."
- Graceful fallback if the sub-zone data fails to load.
- Don't break the existing region view or the year slider.

**Design intent (important):** The end result should look like the attached sketch — colored glowing lines lighting up different stretches of coast, where a user can instantly see which coastline is greenest (best) and which is reddest (worst). It should feel like "follow the green coast," not "here are more boxes."

**Constraints:** Keep it scoped to the 9 segments. This replaces the polygon sub-zones — remove or disable that polygon rendering when in coastline mode.

---

