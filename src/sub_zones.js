// Sub-regional zones within each Atlantic Canada lobster region
// Partitions each region into 3 sub-zones with distinct thermal characteristics

export const SUB_ZONES = {
  'Bay of Fundy': [
    {
      name: 'Upper Bay / Minas Basin',
      coordinates: [
        [45.3, -65.0],
        [45.8, -65.5],
        [45.7, -64.8],
        [45.2, -64.5],
        [45.3, -65.0],
      ],
      center: [45.5, -64.8],
      description: 'Warmest sub-zone; shallow, enclosed basin with rapid tidal mixing and thermal swings. Warms fastest; crosses stress threshold earlier.',
    },
    {
      name: 'Outer Bay / Grand Manan',
      coordinates: [
        [44.6, -66.8],
        [45.0, -66.9],
        [44.8, -65.5],
        [44.4, -65.3],
        [44.6, -66.8],
      ],
      center: [44.7, -66.1],
      description: 'Coolest sub-zone; SW-facing open shelf with Atlantic swell influence. Maintains suitability longer; protection zone.',
    },
    {
      name: 'Annapolis Basin',
      coordinates: [
        [44.9, -64.8],
        [45.2, -64.5],
        [45.5, -64.3],
        [45.3, -65.0],
        [44.9, -64.8],
      ],
      center: [45.2, -64.6],
      description: 'Intermediate warmth; western shelf break with Nova Scotia Current influence. Moderate warming trend.',
    },
  ],
  'Scotian Shelf': [
    {
      name: 'Halifax / Eastern Shore',
      coordinates: [
        [44.5, -61.5],
        [45.2, -61.5],
        [45.0, -59.5],
        [44.0, -59.5],
        [44.5, -61.5],
      ],
      center: [44.7, -60.5],
      description: 'Coolest sub-zone; eastern shelf exposed to Atlantic water influence and strong currents. Slowest warming.',
    },
    {
      name: 'South Shore (Lunenburg–Shelburne)',
      coordinates: [
        [43.5, -64.5],
        [44.5, -64.8],
        [44.5, -64.3],
        [43.2, -63.5],
        [43.5, -64.5],
      ],
      center: [44.0, -64.3],
      description: 'Primary fishing grounds; central-southern shelf with moderate exposure. High historical suitability; moderate warming.',
    },
    {
      name: 'Cape Breton / Sydney Bight',
      coordinates: [
        [44.5, -61.5],
        [44.5, -59.5],
        [45.2, -59.5],
        [45.5, -61.5],
        [44.5, -61.5],
      ],
      center: [44.9, -60.5],
      description: 'Northern shelf and semi-enclosed bight; Gulf of St. Lawrence outflow influence. Faster warming; suitability declining toward 2050.',
    },
  ],
  'Gulf of St. Lawrence': [
    {
      name: 'Northumberland Strait',
      coordinates: [
        [46.0, -63.5],
        [46.5, -63.0],
        [46.3, -62.5],
        [45.8, -63.0],
        [46.0, -63.5],
      ],
      center: [46.2, -63.0],
      description: 'Warmest and shallowest; inter-provincial strait with enclosed characteristics. Freshwater-driven; warms fastest.',
    },
    {
      name: 'Magdalen Shallows',
      coordinates: [
        [47.5, -61.5],
        [49.0, -61.5],
        [48.8, -59.8],
        [47.3, -59.8],
        [47.5, -61.5],
      ],
      center: [48.2, -60.7],
      description: 'Broad shallow plateau (50–100m); mixed salinity; moderate thermal stress but current refuge.',
    },
    {
      name: 'Cape Breton North Coast',
      coordinates: [
        [46.5, -64.0],
        [47.5, -61.5],
        [49.5, -63.5],
        [48.5, -64.5],
        [46.5, -64.0],
      ],
      center: [48.0, -63.4],
      description: 'Deepest and coolest; offshore with Atlantic water and Cabot Strait exchange. Slowest warming; long-term refuge potential.',
    },
  ],
};
