// src/components/WorldMap.jsx
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CountryPanel from "./CountryPanel";
import TradeArcs from "./TradeArcs";
import CrisisExposurePopup from "./CrisisExposurePopup";

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

const PINK            = "#ff2d78";
const UKRAINE_COLOR   = "#ff8c00";
const DISRUPTED_COLOR = "#ff4500";
const IMPORT_SOURCES  = new Set(["RUS", "UKR"]);

const CATEGORY_COLORS = {
  "Cereals & Grains": "#ffd700",
  "Oils":             "#ff8c00",
  "Sugar":            "#ff69b4",
  "Meat & Fish":      "#ff4444",
  "Dairy":            "#87ceeb",
  "Fruits & Veg":     "#44ff88",
  "Other":            "#aaaaaa",
};

// ── Chokepoint X markers (Red Sea / Hormuz) ───────────────────────────────────
function ChokepointMarkers({ activeCrisis, layerMode }) {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (activeCrisis?.geoFilter?.type !== "bbox") return;
    if (layerMode === "imports") return; // hide X markers in import dependency mode

    // Ukraine War — Black Sea chokepoints
    const isUkraine = activeCrisis.geoFilter.minLat > 40;

    const chokepoints = isUkraine ? [
      { lat: 41.1, lng: 29.0, label: "Bosphorus Strait" },
      { lat: 46.6, lng: 31.0, label: "Odesa / Black Sea ports" },
    ] : [
      { lat: 27.9, lng: 56.5, label: "Strait of Hormuz" },
      { lat: 12.6, lng: 43.4, label: "Bab-el-Mandeb" },
    ];

    chokepoints.forEach(({ lat, lng, label }) => {
      const xIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:32px;height:32px;border:2.5px solid ${DISRUPTED_COLOR};border-radius:50%;opacity:0.85;"></div>
            <div style="font-size:18px;font-weight:900;color:${DISRUPTED_COLOR};line-height:1;text-shadow:0 0 8px ${DISRUPTED_COLOR}88;">✕</div>
          </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const labelIcon = L.divIcon({
        className: "",
        html: `<div style="color:${DISRUPTED_COLOR};font-size:10px;font-weight:700;white-space:nowrap;text-shadow:0 0 6px #000,0 0 3px #000;letter-spacing:0.05em;">${label}</div>`,
        iconSize: [140, 16],
        iconAnchor: [70, -6],
      });

      const m1 = L.marker([lat, lng], { icon: xIcon,     interactive: false }).addTo(map);
      const m2 = L.marker([lat, lng], { icon: labelIcon, interactive: false }).addTo(map);
      markersRef.current.push(m1, m2);
    });

    return () => {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [activeCrisis, layerMode, map]);

  return null;
}

// ── Import source markers (RUS + UKR labels in import mode) ──────────────────
function ImportSourceMarkers({ activeCrisis, layerMode }) {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (activeCrisis?.id !== 4 || layerMode !== "imports") return;

    const sources = [
      { lat: 48.5, lng: 31.5, label: "Ukraine" },
      { lat: 61.0, lng: 55.0, label: "Russia" },
    ];

    sources.forEach(({ lat, lng, label }) => {
      const dotIcon = L.divIcon({
        className: "",
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#ff4500;opacity:0.85;border:2px solid #ff4500;box-shadow:0 0 8px #ff450088;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const labelIcon = L.divIcon({
        className: "",
        html: `<div style="color:#ff4500;font-size:11px;font-weight:700;white-space:nowrap;text-shadow:0 0 6px #000,0 0 3px #000;letter-spacing:0.05em;">${label}</div>`,
        iconSize: [80, 16],
        iconAnchor: [40, -6],
      });
      const m1 = L.marker([lat, lng], { icon: dotIcon,   interactive: false }).addTo(map);
      const m2 = L.marker([lat, lng], { icon: labelIcon, interactive: false }).addTo(map);
      markersRef.current.push(m1, m2);
    });

    return () => {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [activeCrisis, layerMode, map]);

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WorldMap({
  selectedCountry,
  onSelectCountry,
  selectedCategory,
  onSelectCategory,
  activeCrisis,
  onSelectCrisis,
  activeTab,
  onTabChange,
}) {
  const [geoData, setGeoData]                       = useState(null);
  const [supplyData, setSupplyData]                 = useState({});
  const [hoveredCountry, setHoveredCountry]         = useState(null);
  const [exposureData, setExposureData]             = useState({});
  const [clickedCrisisCountry, setClickedCrisisCountry] = useState(null);
  const [layerMode, setLayerMode]                   = useState("routes");
  const geoJsonRef      = useRef(null);
  const supplyDataRef   = useRef({});
  const activeCrisisRef = useRef(null);

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

  useEffect(() => {
    fetch("/data/crisis_exposure.json")
      .then(r => r.json())
      .then(setExposureData)
      .catch(() => setExposureData({}));
  }, []);

  const isUkraineHighlight = (iso) => false; // now bbox-based, no country highlight

  // Keep ref in sync so Leaflet click handlers always see latest value
  useEffect(() => {
    activeCrisisRef.current = activeCrisis;
    if (!activeCrisis) {
      setClickedCrisisCountry(null);
      setLayerMode("routes");
    }
  }, [activeCrisis]);

  const styleFor = (isSelected, isHovered, hasData, iso) => {
    const ukraineHL   = isUkraineHighlight(iso);
    const isImportSrc = layerMode === "imports" && activeCrisis?.id === 4 && IMPORT_SOURCES.has(iso);
    return {
      fillColor:   isSelected   ? PINK
                 : isImportSrc  ? "#ff4500"
                 : ukraineHL    ? UKRAINE_COLOR
                 : hasData      ? "#1e3a5f"
                 : "#0d1b2a",
      fillOpacity: isSelected   ? 0.75
                 : isImportSrc  ? 0.30
                 : ukraineHL    ? 0.45
                 : hasData      ? 0.5
                 : 0.3,
      color:       isSelected   ? PINK
                 : isImportSrc  ? "#ff4500"
                 : ukraineHL    ? UKRAINE_COLOR
                 : isHovered    ? PINK
                 : "#2a4a6b",
      weight:      isSelected || ukraineHL || isImportSrc ? 2.5 : isHovered ? 2 : 0.5,
      dashArray:   ukraineHL && !isSelected ? "5 3"
                 : (!isSelected && isHovered) ? "4 2"
                 : null,
    };
  };

  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer(layer => {
      const iso = layer.feature?.properties?.ISO_A3 || layer.feature?.properties?.iso3 || "";
      layer.setStyle(styleFor(
        selectedCountry?.iso === iso,
        hoveredCountry === iso,
        !!supplyData[iso],
        iso
      ));
    });
  }, [selectedCountry, hoveredCountry, supplyData, activeCrisis, layerMode]);

  const getStyle = (feature) => {
    const iso = feature?.properties?.ISO_A3 || feature?.properties?.iso3 || "";
    return styleFor(selectedCountry?.iso === iso, hoveredCountry === iso, !!supplyData[iso], iso);
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
        const countryObj  = { iso, name: displayName, data: sd[iso] || null };
        if (activeCrisisRef.current?.geoFilter) {
          setClickedCrisisCountry(countryObj);
        } else {
          onSelectCountry(countryObj);
        }
      },
    });
  };

  const panelOpen = !!selectedCountry;

  return (
    <div className={`map-wrapper ${panelOpen ? "panel-open" : ""}`}>
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
          center={[20, 58]}
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
            selectedCountry={activeCrisis?.geoFilter ? clickedCrisisCountry : selectedCountry}
            selectedCategory={selectedCategory}
            activeCrisis={activeCrisis}
          />

          <ChokepointMarkers activeCrisis={activeCrisis} layerMode={layerMode} />
          <ImportSourceMarkers activeCrisis={activeCrisis} layerMode={layerMode} />
        </MapContainer>

        {/* Crisis popup — always shown when a crisis is active */}
        {activeCrisis && (
          <CrisisExposurePopup
            crisis={activeCrisis}
            country={clickedCrisisCountry}
            activeCrisis={activeCrisis}
            exposureData={exposureData}
            layerMode={layerMode}
            onLayerChange={setLayerMode}
            onClose={() => { setClickedCrisisCountry(null); onSelectCrisis(null); }}
          />
        )}

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
          {activeCrisis?.geoFilter && (
            <div className="legend-item">
              <span className="legend-dot arc" style={{ background: DISRUPTED_COLOR }} />
              Disrupted flows
            </div>
          )}
        </div>

        {hoveredCountry && (
          <div className="hover-tooltip">
            {supplyData[hoveredCountry]?.name || hoveredCountry}
            {!supplyData[hoveredCountry] && " — no data"}
          </div>
        )}
      </div>

      {selectedCountry && !activeCrisis?.geoFilter && (
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
