// src/components/TradeArcs.jsx
// ─────────────────────────────────────────────────────
// PLACEHOLDER — This is Nadia's component
// ─────────────────────────────────────────────────────
// Props:
//   tradeData       — array from bilateral_trade.json
//   selectedCountry — { iso, name } of clicked country
//   selectedCategory — "All" | "Cereals & Grains" | etc.
//   activeCrisis    — crisis event object or null
//
// This component should draw trade flow arcs on the Leaflet map
// from origin countries → selectedCountry, filtered by selectedCategory.
//
// Suggested approach:
//   - Use react-leaflet Polyline or a custom SVG overlay
//   - Filter tradeData where row.to === selectedCountry.iso
//   - If selectedCategory !== "All", filter by row.category === selectedCategory
//   - Use country-centroids.json for lat/lon of each ISO code
//   - Arc thickness = row.qty (normalised)
//   - Arc colour = category colour
//   - On activeCrisis, highlight arcs for affected commodities
//
// Country centroids JSON (free):
//   https://raw.githubusercontent.com/gavinr/world-countries-centroids/master/dist/countries.geojson
// ─────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Category colours — match these in your arc styling
export const CATEGORY_COLORS = {
  "Cereals & Grains": "#ffd700",
  "Oils":             "#ff8c00",
  "Sugar":            "#ff69b4",
  "Meat & Fish":      "#ff4444",
  "Dairy":            "#87ceeb",
  "Fruits & Veg":     "#44ff88",
  "Other":            "#aaaaaa",
  "All":              "#ffffff",
};

export default function TradeArcs({
  tradeData,
  selectedCountry,
  selectedCategory,
  activeCrisis,
}) {
  const map = useMap();
  const [centroids, setCentroids] = useState({});

  // Load country centroids
  useEffect(() => {
    fetch("/data/country-centroids.json")
      .then(r => r.json())
      .then(data => {
        // Build lookup: ISO -> [lat, lng]
        const lookup = {};
        (data.features || data).forEach(f => {
          const iso = f.properties?.ISO_A3 || f.properties?.iso3 || f.iso;
          const coords = f.geometry?.coordinates || f.coords;
          if (iso && coords) lookup[iso] = [coords[1], coords[0]];
        });
        setCentroids(lookup);
      })
      .catch(() => console.warn("country-centroids.json not found — add to /public/data/"));
  }, []);

  // Draw arcs when country or category changes
  useEffect(() => {
    if (!selectedCountry || !tradeData.length || !Object.keys(centroids).length) return;

    // Clear existing arc layers
    map.eachLayer(layer => {
      if (layer._isTradeArc) map.removeLayer(layer);
    });

    // Filter flows TO the selected country
    let flows = tradeData.filter(d => d.to === selectedCountry.iso);

    // Filter by category
    if (selectedCategory !== "All") {
      flows = flows.filter(d => d.category === selectedCategory);
    }

    // If active crisis, highlight affected categories
    const affectedCats = activeCrisis?.commodities || [];

    // Draw each arc
    const destCoord = centroids[selectedCountry.iso];
    if (!destCoord) return;

    flows.forEach(flow => {
      const originCoord = centroids[flow.from];
      if (!originCoord) return;

      const isAffected = affectedCats.includes(flow.category);
      const color = isAffected
        ? "#ff2222"
        : CATEGORY_COLORS[flow.category] || "#ffffff";

      // Normalise thickness by quantity
      const maxQty = Math.max(...flows.map(f => f.qty));
      const weight = Math.max(0.5, (flow.qty / maxQty) * 4);

      // Draw curved arc using intermediate point
      const midLat = (originCoord[0] + destCoord[0]) / 2 + 15;
      const midLng = (originCoord[1] + destCoord[1]) / 2;

      const arc = L.polyline(
        [originCoord, [midLat, midLng], destCoord],
        {
          color,
          weight,
          opacity: isAffected ? 0.95 : 0.6,
          smoothFactor: 1,
          dashArray: isAffected ? "6 4" : null,
        }
      );

      arc._isTradeArc = true;
      arc.addTo(map);

      // Tooltip on hover
      arc.bindTooltip(
        `${flow.from_name} → ${flow.to_name}<br/>${flow.category}: ${(flow.qty / 1000).toFixed(0)}K tonnes`,
        { sticky: true, className: "arc-tooltip" }
      );
    });

    // Cleanup on unmount
    return () => {
      map.eachLayer(layer => {
        if (layer._isTradeArc) map.removeLayer(layer);
      });
    };
  }, [selectedCountry, selectedCategory, activeCrisis, tradeData, centroids, map]);

  return null; // Renders directly onto map canvas
}
