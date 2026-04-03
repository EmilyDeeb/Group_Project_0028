// src/components/WorldMap.jsx
// ─────────────────────────────────────────────────────
// Uses react-leaflet for the map.
// Loads countries.geojson from /public/data/
// Loads countries_supply.json and bilateral_trade.json
// ─────────────────────────────────────────────────────
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import CountryPanel from "./CountryPanel";
import TradeArcs from "./TradeArcs";

const CATEGORIES = ["All", "Cereals & Grains", "Oils", "Sugar", "Meat & Fish", "Dairy", "Fruits & Veg", "Other"];

// Dark map tile — CartoDB dark matter (free, no API key)
const DARK_TILE = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const DARK_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

export default function WorldMap({
  selectedCountry,
  onSelectCountry,
  selectedCategory,
  onSelectCategory,
  activeCrisis,
}) {
  const [geoData, setGeoData]       = useState(null);
  const [supplyData, setSupplyData] = useState({});
  const [tradeData, setTradeData]   = useState([]);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const geoJsonRef = useRef(null);

  // Load GeoJSON polygons
  useEffect(() => {
    fetch("/data/countries.geojson")
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => {
        // Placeholder — shows empty map until real GeoJSON is added
        console.warn("countries.geojson not found — add to /public/data/");
        setGeoData({ type: "FeatureCollection", features: [] });
      });
  }, []);

  // Load supply data
  useEffect(() => {
    fetch("/data/countries_supply.json")
      .then(r => r.json())
      .then(setSupplyData)
      .catch(() => setSupplyData({}));
  }, []);

  // Load bilateral trade arcs
  useEffect(() => {
    fetch("/data/bilateral_trade.json")
      .then(r => r.json())
      .then(setTradeData)
      .catch(() => setTradeData([]));
  }, []);

  // Style for country polygons
  const getStyle = (feature) => {
    const iso = feature?.properties?.ISO_A3 || feature?.properties?.iso3 || "";
    const isSelected = selectedCountry?.iso === iso;
    const isHovered  = hoveredCountry === iso;
    const hasData    = !!supplyData[iso];

    return {
      fillColor:   isSelected ? "#e63946" : isHovered ? "#ff8c00" : hasData ? "#1e3a5f" : "#0d1b2a",
      fillOpacity: isSelected ? 0.85 : isHovered ? 0.7 : hasData ? 0.5 : 0.3,
      color:       isSelected ? "#e63946" : "#2a4a6b",
      weight:      isSelected ? 2 : 0.5,
    };
  };

  // Events on each country polygon
  const onEachFeature = (feature, layer) => {
    const iso  = feature?.properties?.ISO_A3 || feature?.properties?.iso3 || "";
    const name = feature?.properties?.NAME || feature?.properties?.name || iso;

    layer.on({
      mouseover: () => setHoveredCountry(iso),
      mouseout:  () => setHoveredCountry(null),
      click: () => {
        onSelectCountry({ iso, name, data: supplyData[iso] || null });
        onSelectCategory("All");
      },
    });
  };

  return (
    <div className="map-wrapper">

      {/* Category filter bar */}
      <div className="category-bar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`cat-btn ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => onSelectCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={8}
        style={{ height: "100%", width: "100%", background: "#060d18" }}
        zoomControl={false}
      >
        <TileLayer url={DARK_TILE} attribution={DARK_ATTR} />

        {geoData && (
          <GeoJSON
            ref={geoJsonRef}
            data={geoData}
            style={getStyle}
            onEachFeature={onEachFeature}
            key={selectedCountry?.iso + selectedCategory}
          />
        )}

        {/* Trade flow arcs — Nadia's component */}
        <TradeArcs
          tradeData={tradeData}
          selectedCountry={selectedCountry}
          selectedCategory={selectedCategory}
          activeCrisis={activeCrisis}
        />
      </MapContainer>

      {/* Country side panel */}
      {selectedCountry && (
        <CountryPanel
          country={selectedCountry}
          category={selectedCategory}
          onClose={() => onSelectCountry(null)}
          onSelectCategory={onSelectCategory}
        />
      )}

      {/* Map legend */}
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#e63946" }} />
          Selected country
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#1e3a5f" }} />
          Has trade data
        </div>
        <div className="legend-item">
          <span className="legend-dot arc" style={{ background: "#ff8c00" }} />
          Trade flows
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredCountry && (
        <div className="hover-tooltip">
          {supplyData[hoveredCountry]?.name || hoveredCountry}
          {!supplyData[hoveredCountry] && " — no data"}
        </div>
      )}
    </div>
  );
}
