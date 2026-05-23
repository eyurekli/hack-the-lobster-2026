// Approximate polygons for each Atlantic Canada sub-region
// [lat, lng] pairs tracing the maritime boundaries

export const REGIONS = [
  {
    name: 'Bay of Fundy',
    labelLatLng: [45.0, -65.5],
    description:
      'Enclosed bay between Nova Scotia and New Brunswick. Known for extreme tidal range. Historically productive lobster ground now facing thermal stress.',
    coordinates: [
      [44.6, -66.8],
      [45.3, -66.9],
      [45.8, -65.5],
      [45.5, -64.5],
      [44.9, -64.3],
      [44.5, -64.8],
      [44.2, -66.0],
      [44.6, -66.8],
    ],
  },
  {
    name: 'Scotian Shelf',
    labelLatLng: [43.5, -62.0],
    description:
      'Broad continental shelf extending from Nova Scotia into the Northwest Atlantic. A major commercial lobster zone currently experiencing warming-driven habitat compression.',
    coordinates: [
      [44.5, -64.8],
      [44.9, -64.3],
      [45.2, -61.5],
      [44.5, -59.5],
      [43.2, -59.0],
      [42.5, -60.5],
      [42.8, -63.0],
      [43.5, -64.5],
      [44.5, -64.8],
    ],
  },
  {
    name: 'Gulf of St. Lawrence',
    labelLatLng: [48.0, -62.0],
    description:
      'Semi-enclosed sea north of the Maritimes. Cooler temperatures are making this an emerging refuge for northward-shifting lobster populations.',
    coordinates: [
      [46.0, -64.5],
      [46.5, -64.0],
      [47.5, -61.5],
      [49.5, -63.5],
      [50.5, -59.5],
      [49.5, -57.5],
      [47.5, -59.5],
      [46.5, -61.5],
      [46.0, -64.5],
    ],
  },
];
