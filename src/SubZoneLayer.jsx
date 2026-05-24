import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { SUB_ZONES } from './sub_zones.js';
import { scoreToColor, scoreToLabel } from './colorScale.js';

function interpolateScore(data, region, subZone, year) {
  const subZoneData = data?.[region]?.[subZone];
  if (!subZoneData) return 0;

  const years = Object.keys(subZoneData).map(Number).sort((a, b) => a - b);
  if (years.length === 0) return 0;
  if (year <= years[0]) return subZoneData[years[0]];
  if (year >= years[years.length - 1]) return subZoneData[years[years.length - 1]];

  const lo = years.filter((y) => y <= year).at(-1);
  const hi = years.filter((y) => y >= year)[0];
  if (lo === hi) return subZoneData[lo];

  const t = (year - lo) / (hi - lo);
  return subZoneData[lo] + t * (subZoneData[hi] - subZoneData[lo]);
}

export default function SubZoneLayer({
  data,
  year,
  visible,
  activeSubZone,
  onSubZoneClick,
  leafletMap,
}) {
  const polygonsRef = useRef({});
  const layerGroupRef = useRef(null);

  // Initialize sub-zone polygons on map
  useEffect(() => {
    if (!leafletMap || !visible) return;

    // Create layer group if it doesn't exist
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(leafletMap);
    }

    // Render all sub-zones
    Object.entries(SUB_ZONES).forEach(([region, subZones]) => {
      subZones.forEach((subZone) => {
        const key = `${region}|${subZone.name}`;

        // Remove old polygon if exists
        if (polygonsRef.current[key]) {
          layerGroupRef.current.removeLayer(polygonsRef.current[key]);
        }

        // Create new polygon
        const poly = L.polygon(subZone.coordinates, {
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.8,
          fillColor: '#888888',
          fillOpacity: 0.65,
        });

        // Add interactivity
        poly.on('click', () => {
          onSubZoneClick(region, subZone.name);
        });

        poly.on('mouseover', function () {
          this.setStyle({ weight: 2.5, opacity: 1, fillOpacity: 0.75 });
        });

        poly.on('mouseout', function () {
          this.setStyle({ weight: 1.5, opacity: 0.8, fillOpacity: 0.65 });
        });

        layerGroupRef.current.addLayer(poly);
        polygonsRef.current[key] = poly;
      });
    });

    return () => {
      // Cleanup is handled by toggling visible
    };
  }, [leafletMap, visible]);

  // Update polygon colors when data or year changes
  useEffect(() => {
    if (!data || !visible) return;

    Object.entries(SUB_ZONES).forEach(([region, subZones]) => {
      subZones.forEach((subZone) => {
        const key = `${region}|${subZone.name}`;
        const poly = polygonsRef.current[key];

        if (poly) {
          const score = interpolateScore(data, region, subZone.name, year);
          poly.setStyle({
            fillColor: scoreToColor(score),
            fillOpacity: activeSubZone?.region === region && activeSubZone?.zone === subZone.name ? 0.8 : 0.65,
          });
        }
      });
    });
  }, [data, year, visible, activeSubZone]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (layerGroupRef.current) {
        Object.values(polygonsRef.current).forEach((poly) => {
          layerGroupRef.current.removeLayer(poly);
        });
      }
    };
  }, []);

  return null; // This component only manages Leaflet layers, no JSX output
}
