// src/components/WorldMap.jsx
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";


import "leaflet/dist/leaflet.css";
import CountryPanel from "./CountryPanel";
import TradeArcs from "./TradeArcs";

const CATEGORIES = ["All", "Cereals & Grains", "Oils", "Sugar", "Meat & Fish", "Dairy", "Fruits & Veg", "Other"];

const CAT_COLORS = {
  "All":             "#e63946",
  "Cereals & Grains":"#ffd700",
  "Oils":            "#ff8c00",
  "Sugar":           "#ff69b4",
  "Meat & Fish":     "#ff4444",
  "Dairy":           "#87ceeb",
  "Fruits & Veg":    "#44ff88",
  "Other":           "#aaaaaa",
};

const DARK_TILE = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const DARK_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

const PINK = "#ff2d78";

export default function WorldMap({
  selectedCountry,
  onSelectCountry,
  selectedCategory,
  onSelectCategory,
  activeCrisis,
  activeTab,
  onTabChange,
}) {
  const [geoData, setGeoData]               = useState(null);
  const [supplyData, setSupplyData]         = useState({});
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const geoJsonRef    = useRef(null);
  const supplyDataRef = useRef({});

  useEffect(() => {
    fetch("/data/countries.geojson")
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => setGeoData({ type: "FeatureCollection", features: [] }));
  }, []);

  useEffect(() => {
    fetch("/data/countries_supply.json")
      .then(r => r.json())
      .then(d => { setSupplyData(d); supplyDataRef.current = d; })
      .catch(() => setSupplyData({}));
  }, []);

  const styleFor = (isSelected, isHovered, hasData) => ({
    fillColor:   isSelected ? PINK : hasData ? "#1e3a5f" : "#0d1b2a",
    fillOpacity: isSelected ? 0.75 : hasData ? 0.5 : 0.3,
    color:       isSelected ? PINK : isHovered ? PINK : "#2a4a6b",
    weight:      isSelected ? 2 : isHovered ? 2 : 0.5,
    dashArray:   (!isSelected && isHovered) ? "4 2" : null,
  });

  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer(layer => {
      const iso = layer.feature?.properties?.ISO_A3 || layer.feature?.properties?.iso3 || "";
      layer.setStyle(styleFor(
        selectedCountry?.iso === iso,
        hoveredCountry === iso,
        !!supplyData[iso]
      ));
    });
  }, [selectedCountry, hoveredCountry, supplyData]);

  const getStyle = (feature) => {
    const iso = feature?.properties?.ISO_A3 || feature?.properties?.iso3 || "";
    return styleFor(selectedCountry?.iso === iso, hoveredCountry === iso, !!supplyData[iso]);
  };

  const onEachFeature = (feature, layer) => {
    const iso  = feature?.properties?.ISO_A3 || feature?.properties?.iso3 || "";
    const name = feature?.properties?.NAM_0 || feature?.properties?.NAME || feature?.properties?.name || iso;

    layer.on({
      mouseover: () => setHoveredCountry(iso),
      mouseout:  () => setHoveredCountry(null),
      click: () => {
        const sd = supplyDataRef.current;
        const displayName = sd[iso]?.name || name;
        onSelectCountry({ iso, name: displayName, data: sd[iso] || null });
      },
    });
  };

  const panelOpen = !!selectedCountry;

  return (
    // #4: map-wrapper uses flex row: map on left, panel on right
    <div className={`map-wrapper ${panelOpen ? "panel-open" : ""}`}>

      {/* Map takes remaining width; panel is fixed on the right */}
      <div className="map-container-inner">
        <div className="category-bar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cat-btn ${selectedCategory === cat ? "active" : ""}`}
              style={selectedCategory === cat ? {
                background: CAT_COLORS[cat],
                color: ["Dairy", "Cereals & Grains", "Fruits & Veg"].includes(cat) ? "#0d1425" : "white",
                borderColor: CAT_COLORS[cat],
              } : {}}
              onClick={() => onSelectCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <MapContainer
          center={[20,58]}
          zoom={2.2}
          minZoom={2}
          maxZoom={8}
          zoomSnap={0.25}
          zoomDelta={0.5}
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

          <TradeArcs
            selectedCountry={selectedCountry}
            selectedCategory={selectedCategory}
            activeCrisis={activeCrisis}
          />
        </MapContainer>

        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: PINK }} />
            Selected country
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#1e3a5f" }} />
            Has supply data
          </div>
          <div className="legend-item">
            <span className="legend-dot arc" style={{ background: "#e0f0ff" }} />
            Maritime flows
          </div>
          <div className="legend-item">
            <span className="legend-dot arc" style={{ background: "#90ee90", opacity: 0.7 }} />
            Land flows
          </div>
        </div>

        {hoveredCountry && (
          <div className="hover-tooltip">
            {supplyData[hoveredCountry]?.name || hoveredCountry}
            {!supplyData[hoveredCountry] && " — no data"}
          </div>
        )}
      </div>

      {/* #4: Panel slides in from the right, map does NOT pan */}
      {selectedCountry && (
        <CountryPanel
          country={selectedCountry}
          category={selectedCategory}
          onClose={() => onSelectCountry(null)}
          onSelectCategory={onSelectCategory}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}
    </div>
  );
}