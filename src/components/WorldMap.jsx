// src/components/WorldMap.jsx
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import CountryPanel from "./CountryPanel";
import TradeArcs from "./TradeArcs";

const CATEGORIES = ["All", "Cereals & Grains", "Oils", "Sugar", "Meat & Fish", "Dairy", "Fruits & Veg", "Other"];

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
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const geoJsonRef     = useRef(null);
  const supplyDataRef  = useRef({});

  // Load GeoJSON country polygons
  useEffect(() => {
    fetch("/data/countries.geojson")
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => {
        console.warn("countries.geojson not found — add to /public/data/");
        setGeoData({ type: "FeatureCollection", features: [] });
      });
  }, []);

  // Load supply data
  useEffect(() => {
    fetch("/data/countries_supply.json")
      .then(r => r.json())
      .then(d => { setSupplyData(d); supplyDataRef.current = d; })
      .catch(() => setSupplyData({}));
  }, []);

  // ── Single source of truth for country styles ──────────────────────────────
  const styleFor = (isSelected, isHovered, hasData) => ({
    fillColor:   isSelected ? "#e63946" : isHovered ? "#ff8c00" : hasData ? "#1e3a5f" : "#0d1b2a",
    fillOpacity: isSelected ? 0.85      : isHovered ? 0.7       : hasData ? 0.5       : 0.3,
    color:       isSelected ? "#e63946" : "#2a4a6b",
    weight:      isSelected ? 2 : 0.5,
  });

  // Re-style countries when selection / hover changes
  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer(layer => {
      const iso = layer.feature?.properties?.ISO_A3
               || layer.feature?.properties?.iso3
               || "";
      const isSelected = selectedCountry?.iso === iso;
      const isHovered  = hoveredCountry === iso;
      const hasData    = !!supplyData[iso];
      layer.setStyle(styleFor(isSelected, isHovered, hasData));
    });
  }, [selectedCountry, hoveredCountry, supplyData]);

  const getStyle = (feature) => {
    const iso = feature?.properties?.ISO_A3 || feature?.properties?.iso3 || "";
    const isSelected = selectedCountry?.iso === iso;
    const isHovered  = hoveredCountry === iso;
    const hasData    = !!supplyData[iso];
    return styleFor(isSelected, isHovered, hasData);
  };

  const onEachFeature = (feature, layer) => {
    const iso  = feature?.properties?.ISO_A3 || feature?.properties?.iso3 || "";
    const name = feature?.properties?.NAM_0
      || feature?.properties?.NAME
      || feature?.properties?.name
      || iso;

    layer.on({
      mouseover: () => setHoveredCountry(iso),
      mouseout:  () => setHoveredCountry(null),
      click: () => {
        const sd = supplyDataRef.current;
        const displayName = sd[iso]?.name || name;
        onSelectCountry({ iso, name: displayName, data: sd[iso] || null });
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
            key={`geo-${Object.keys(supplyData).length}`}
          />
        )}

        {/* Maritime trade flow arcs */}
        <TradeArcs
          selectedCountry={selectedCountry}
          selectedCategory={selectedCategory}
          activeCrisis={activeCrisis}
        />
      </MapContainer>

      {/* Country side panel — note: no tradeData prop needed anymore */}
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
          Has supply data
        </div>
        <div className="legend-item">
          <span className="legend-dot arc" style={{ background: "#e0f0ff" }} />
          🚢 Maritime flows
        </div>
        <div className="legend-item">
          <span className="legend-dot arc" style={{ background: "#90ee90", opacity: 0.7 }} />
          🚛 Land flows
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
