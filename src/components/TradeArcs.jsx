// src/components/TradeArcs.jsx
// Two layers:
//   1. Maritime — solid lines, real port-pair geometries (~35MB GeoJSONs)
//   2. Land     — dashed lines, straight centroid-to-centroid lines (~0.4MB GeoJSONs)
//
// Smart limits:
//   - Countries WITH coast: top 10 maritime + top 5 land (transit neighbours)
//   - Countries WITHOUT coast: top 15 land only (no maritime data exists)
//
// Crisis highlighting:
//   - Ukraine War      → dims all arcs, highlights country_from UKR/RUS in orange
//   - Red Sea/Iran     → dims all arcs, highlights routes passing through Bab-el-Mandeb bbox
//   - Other crises     → dims all arcs, highlights by affected commodity category

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// ── Landlocked countries ──────────────────────────────────────────────────────
const LANDLOCKED = new Set([
  "AFG","AND","ARM","AUT","AZE","BDI","BFA","BGD","BLR","BOL","BTN","BWA",
  "CAF","CHE","CZE","ETH","HUN","KAZ","KGZ","LAO","LSO","LUX","MDA",
  "MKD","MLI","MNG","MWI","NER","NPL","PRY","RWA","SDN","SRB","SSD","SWZ",
  "TCD","TJK","TKM","UGA","UZB","ZMB","ZWE","LIE","SMR",
]);

// ── Limits ────────────────────────────────────────────────────────────────────
const MARITIME_TOP     = 10;
const MARITIME_ALL_TOP = 200;
const LAND_COASTAL     = 5;
const LAND_LANDLOCKED  = 15;
const MAX_LINES        = 300;

// ── Colors ────────────────────────────────────────────────────────────────────
const ALL_COLOR       = "#e0f0ff";
const ALL_OPACITY     = 0.45;
const LAND_COLOR      = "#90ee90";
const LAND_OPACITY    = 0.7;
const DISRUPTED_COLOR = "#ff4500";  // bright orange-red for disrupted routes
const DIM_OPACITY     = 0.10;       // opacity for non-disrupted arcs during a crisis

export const CATEGORY_COLORS = {
  "Cereals & Grains": "#ffd700",
  "Oils":             "#ff8c00",
  "Sugar":            "#ff69b4",
  "Meat & Fish":      "#ff4444",
  "Dairy":            "#87ceeb",
  "Fruits & Veg":     "#44ff88",
  "Other":            "#aaaaaa",
};

// ── File maps ─────────────────────────────────────────────────────────────────
const MARITIME_FILES = {
  "Cereals & Grains": "maritime_cereals_grains_by_port.geojson",
  "Oils":             "maritime_oils_by_port.geojson",
  "Sugar":            "maritime_sugar_by_port.geojson",
  "Meat & Fish":      "maritime_meat_fish_by_port.geojson",
  "Dairy":            "maritime_dairy_by_port.geojson",
  "Fruits & Veg":     "maritime_fruits_veg_by_port.geojson",
  "Other":            "maritime_other_by_port.geojson",
};

const LAND_FILES = {
  "Cereals & Grains": "land_cereals_grains_by_country.geojson",
  "Oils":             "land_oils_by_country.geojson",
  "Sugar":            "land_sugar_by_country.geojson",
  "Meat & Fish":      "land_meat_fish_by_country.geojson",
  "Dairy":            "land_dairy_by_country.geojson",
  "Fruits & Veg":     "land_fruits_veg_by_country.geojson",
  "Other":            "land_other_by_country.geojson",
};

// ── Cache ─────────────────────────────────────────────────────────────────────
const geoCache = {};

async function loadGeoJSON(filename) {
  if (geoCache[filename]) return geoCache[filename];
  const res = await fetch(`${import.meta.env.BASE_URL}data/${filename}`);
  if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
  const data = await res.json();
  geoCache[filename] = data;
  return data;
}

// ── Chaikin smoothing ─────────────────────────────────────────────────────────
function chaikin(pts, passes = 2) {
  if (pts.length < 3) return pts;
  let out = pts;
  for (let p = 0; p < passes; p++) {
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const [x0, y0] = out[i];
      const [x1, y1] = out[i + 1];
      next.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1]);
      next.push([0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

function geomToLines(geom, smooth = false) {
  if (!geom) return [];
  const raw = geom.type === "LineString"
    ? [geom.coordinates]
    : geom.type === "MultiLineString"
    ? geom.coordinates
    : [];
  return raw
    .map(ring => ring.map(([lng, lat]) => [lat, lng]))
    .filter(pts => pts.length >= 2)
    .map(pts => smooth ? chaikin(pts, 2) : pts);
}

function fmtTonnes(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M t`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K t`;
  return `${Math.round(n)} t`;
}

// ── Geo disruption helpers ────────────────────────────────────────────────────

// Check if a geometry passes through a bounding box (Red Sea / Hormuz)
function geometryPassesThroughBbox(geometry, bbox) {
  if (!geometry) return false;
  const coords = geometry.type === "MultiLineString"
    ? geometry.coordinates.flat()
    : geometry.coordinates || [];
  return coords.some(([lng, lat]) =>
    lat >= bbox.minLat && lat <= bbox.maxLat &&
    lng >= bbox.minLng && lng <= bbox.maxLng
  );
}

// Returns true if this feature is disrupted given the active crisis
function isFeatureDisrupted(countryFrom, group, geometry, activeCrisis) {
  if (!activeCrisis) return false;
  const { geoFilter, commodities = [] } = activeCrisis;

  // Ukraine War: filter by country_from
  if (geoFilter?.type === "country_from") {
    return geoFilter.isos.includes(countryFrom);
  }

  // Red Sea / Iran: filter by bbox
  if (geoFilter?.type === "bbox") {
    return geometryPassesThroughBbox(geometry, geoFilter);
  }

  // All other crises: commodity-based
  return commodities.includes(group);
}

// ── Maritime aggregation ──────────────────────────────────────────────────────
function aggregateMaritimeByPortPair(featuresByGroup, isoTo) {
  const map = {};
  for (const [group, features] of Object.entries(featuresByGroup)) {
    for (const f of features) {
      const p = f.properties;
      if (p.country_to !== isoTo) continue;
      const key = `${p.port_from}__${p.port_to}`;
      if (!map[key]) {
        map[key] = {
          name_from: p.name_from, name_to: p.name_to,
          country_from: p.country_from, group,
          flow_tonnes: 0, geometry: f.geometry,
        };
      }
      map[key].flow_tonnes += p.flow_tonnes || 0;
    }
  }
  return Object.values(map);
}

function aggregateMaritimeBySingleCat(features, isoTo) {
  const map = {};
  for (const f of features) {
    const p = f.properties;
    if (p.country_to !== isoTo) continue;
    const key = p.country_from;
    if (!map[key]) {
      map[key] = {
        country_from: key, name_from: p.name_from, name_to: p.name_to,
        group: p.group, flow_tonnes: 0, portPairs: new Set(), geometries: [],
      };
    }
    const portKey = `${p.port_from}__${p.port_to}`;
    if (!map[key].portPairs.has(portKey)) {
      map[key].portPairs.add(portKey);
      map[key].geometries.push({ geom: f.geometry, flow: p.flow_tonnes || 0 });
    }
    map[key].flow_tonnes += p.flow_tonnes || 0;
  }
  return Object.values(map);
}

// ── Draw maritime ─────────────────────────────────────────────────────────────
function drawMaritime(layerGroup, features, isoTo, category, activeCrisis, topN) {
  const hasCrisis = !!activeCrisis;
  let lineCount = 0;

  if (category === "All") {
    const pairs = aggregateMaritimeByPortPair(features, isoTo);
    pairs.sort((a, b) => b.flow_tonnes - a.flow_tonnes);
    const top = pairs.slice(0, topN);
    const maxFlow = top[0]?.flow_tonnes || 1;

    for (const pair of top) {
      if (lineCount >= MAX_LINES) break;

      const disrupted = isFeatureDisrupted(
        pair.country_from, pair.group, pair.geometry, activeCrisis
      );

      const color   = disrupted ? DISRUPTED_COLOR : ALL_COLOR;
      const weight  = Math.max(0.6, (pair.flow_tonnes / maxFlow) * 4);
      const opacity = hasCrisis ? (disrupted ? 1.0 : DIM_OPACITY) : ALL_OPACITY;

      for (const line of geomToLines(pair.geometry, true)) {
        if (lineCount >= MAX_LINES) break;
        const pl = L.polyline(line, {
          color, weight, opacity, smoothFactor: 1,
          dashArray: disrupted ? "8 4" : null,
        });
        pl.bindTooltip(
          `🚢 <b>${pair.name_from}</b> → ${pair.name_to}<br/>` +
          `Total: <span style="color:${color}">${fmtTonnes(pair.flow_tonnes)}</span>` +
          (disrupted ? `<br/><span style="color:${DISRUPTED_COLOR}">⚠️ Disrupted route</span>` : ""),
          { sticky: true, className: "arc-tooltip" }
        );
        layerGroup.addLayer(pl);
        lineCount++;
      }
    }

  } else {
    const origins = aggregateMaritimeBySingleCat(features, isoTo);
    origins.sort((a, b) => b.flow_tonnes - a.flow_tonnes);
    const top = origins.slice(0, topN);
    const maxFlow = top[0]?.flow_tonnes || 1;

    for (const origin of top) {
      if (lineCount >= MAX_LINES) break;
      const weight = Math.max(0.6, (origin.flow_tonnes / maxFlow) * 4);

      origin.geometries.sort((a, b) => b.flow - a.flow);

      for (const { geom } of origin.geometries) {
        if (lineCount >= MAX_LINES) break;

        const disrupted = isFeatureDisrupted(
          origin.country_from, origin.group, geom, activeCrisis
        );

        const color   = disrupted ? DISRUPTED_COLOR : (CATEGORY_COLORS[origin.group] || "#fff");
        const opacity = hasCrisis ? (disrupted ? 1.0 : DIM_OPACITY) : 0.6;

        for (const line of geomToLines(geom, true)) {
          if (lineCount >= MAX_LINES) break;
          const pl = L.polyline(line, {
            color, weight, opacity, smoothFactor: 1,
            dashArray: disrupted ? "8 4" : null,
          });
          pl.bindTooltip(
            `🚢 <b>${origin.name_from}</b> → ${origin.name_to}<br/>` +
            `${origin.group}: <span style="color:${color}">${fmtTonnes(origin.flow_tonnes)}</span>` +
            (disrupted ? `<br/><span style="color:${DISRUPTED_COLOR}">⚠️ Disrupted route</span>` : ""),
            { sticky: true, className: "arc-tooltip" }
          );
          layerGroup.addLayer(pl);
          lineCount++;
        }
      }
    }
  }
}

// ── Draw land ─────────────────────────────────────────────────────────────────
function drawLand(layerGroup, features, isoTo, category, activeCrisis, topN) {
  const flow = f => f.properties.flow_tonnes || f.properties.flow_value || 0;
  const hasCrisis = !!activeCrisis;

  const relevant = features
    .filter(f => f.properties.iso_to === isoTo)
    .sort((a, b) => flow(b) - flow(a))
    .slice(0, topN);

  if (relevant.length === 0) return;
  const maxFlow = flow(relevant[0]);

  for (const f of relevant) {
    const p = f.properties;
    const val = flow(f);

    const disrupted = isFeatureDisrupted(
      p.iso_from, p.group, f.geometry, activeCrisis
    );

    const group = p.group || (category !== "All" ? category : null);
    const color = disrupted ? DISRUPTED_COLOR
      : (CATEGORY_COLORS[group] || CATEGORY_COLORS[category] || LAND_COLOR);

    const weight  = Math.max(0.8, (val / maxFlow) * 3.5);
    const opacity = hasCrisis ? (disrupted ? 0.95 : DIM_OPACITY) : LAND_OPACITY;

    for (const line of geomToLines(f.geometry, false)) {
      const pl = L.polyline(line, {
        color, weight, opacity, smoothFactor: 1,
        dashArray: disrupted ? "6 3" : "7 6",
      });
      pl.bindTooltip(
        `🚛 <b>${p.name_from}</b> → ${p.name_to}<br/>` +
        `${p.group || category}: <span style="color:${color}">${fmtTonnes(val)}</span>` +
        (disrupted ? `<br/><span style="color:${DISRUPTED_COLOR}">⚠️ Disrupted route</span>` : ""),
        { sticky: true, className: "arc-tooltip" }
      );
      layerGroup.addLayer(pl);
    }
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TradeArcs({ selectedCountry, selectedCategory, activeCrisis }) {
  const map = useMap();
  const layerGroupRef = useRef(null);
  const abortRef      = useRef(null);

  useEffect(() => {
    layerGroupRef.current = L.layerGroup().addTo(map);
    return () => {
      layerGroupRef.current.clearLayers();
      map.removeLayer(layerGroupRef.current);
    };
  }, [map]);

  useEffect(() => {
    // Events without geoFilter (Global Food Crisis, Sustained Price Shock, COVID)
    // have no geographic flow data — hide all arcs
    if (!selectedCountry || (activeCrisis && !activeCrisis.geoFilter)) {
      layerGroupRef.current?.clearLayers();
      return;
    }

    if (abortRef.current) abortRef.current.cancelled = true;
    const token = { cancelled: false };
    abortRef.current = token;

    const iso          = selectedCountry.iso;
    const isLandlocked = LANDLOCKED.has(iso);
    const landLimit    = isLandlocked ? LAND_LANDLOCKED : LAND_COASTAL;
    const catKeys      = selectedCategory === "All"
      ? Object.keys(MARITIME_FILES)
      : [selectedCategory];

    async function fetchAndDraw() {
      try {
        layerGroupRef.current.clearLayers();

        // ── Maritime (skip for landlocked) ──────────────────────────────────
        if (!isLandlocked) {
          const results = await Promise.all(
            catKeys.map(async cat => {
              const data = await loadGeoJSON(MARITIME_FILES[cat]);
              return { cat, features: data.features.filter(f => f.properties.country_to === iso) };
            })
          );
          if (token.cancelled) return;

          if (selectedCategory === "All") {
            const grouped = Object.fromEntries(results.map(({ cat, features }) => [cat, features]));
            drawMaritime(layerGroupRef.current, grouped, iso, "All", activeCrisis, MARITIME_ALL_TOP);
          } else {
            const features = results[0]?.features || [];
            drawMaritime(layerGroupRef.current, features, iso, selectedCategory, activeCrisis, MARITIME_TOP);
          }
        }

        // ── Land (always) ───────────────────────────────────────────────────
        const landResults = await Promise.all(
          catKeys.map(async cat => {
            const data = await loadGeoJSON(LAND_FILES[cat]);
            return data.features.filter(f => f.properties.iso_to === iso);
          })
        );
        if (token.cancelled) return;

        const allLandFeatures = landResults.flat();
        drawLand(layerGroupRef.current, allLandFeatures, iso, selectedCategory, activeCrisis, landLimit);

      } catch (err) {
        if (!token.cancelled) console.error("TradeArcs fetch error:", err);
      }
    }

    fetchAndDraw();
  }, [selectedCountry, selectedCategory, activeCrisis, map]);

  return null;
}

// ── Export for CountryPanel ───────────────────────────────────────────────────
export async function getTopImports(iso, category, topN = 5) {
  try {
    const catKeys      = category === "All" ? Object.keys(MARITIME_FILES) : [category];
    const isLandlocked = LANDLOCKED.has(iso);
    const totals = {};

    // Maritime
    if (!isLandlocked) {
      await Promise.all(catKeys.map(async cat => {
        const data = await loadGeoJSON(MARITIME_FILES[cat]);
        for (const f of data.features) {
          const p = f.properties;
          if (p.country_to !== iso) continue;
          const key = `sea__${p.country_from}`;
          if (!totals[key]) totals[key] = { country_from: p.country_from, name_from: p.name_from,
            flow_tonnes: 0, groups: {}, type: "maritime" };
          totals[key].flow_tonnes += p.flow_tonnes || 0;
          totals[key].groups[cat] = (totals[key].groups[cat] || 0) + (p.flow_tonnes || 0);
        }
      }));
    }

    // Land
    await Promise.all(catKeys.map(async cat => {
      const data = await loadGeoJSON(LAND_FILES[cat]);
      for (const f of data.features) {
        const p = f.properties;
        if (p.iso_to !== iso) continue;
        const flow = p.flow_tonnes || p.flow_value || 0;
        const key = `land__${p.iso_from}`;
        if (!totals[key]) totals[key] = { country_from: p.iso_from, name_from: p.name_from,
          flow_tonnes: 0, groups: {}, type: "land" };
        totals[key].flow_tonnes += flow;
        totals[key].groups[cat] = (totals[key].groups[cat] || 0) + flow;
      }
    }));

    return Object.values(totals)
      .sort((a, b) => b.flow_tonnes - a.flow_tonnes)
      .slice(0, topN);
  } catch (err) {
    console.error("getTopImports error:", err);
    return [];
  }
}
