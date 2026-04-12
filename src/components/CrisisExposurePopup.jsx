// src/components/CrisisExposurePopup.jsx
// Two modes:
//   - No geoFilter (events 1-3): shown on crisis click, explains it's a global price shock
//   - geoFilter (events 4-5): shown on country click, shows % of disrupted flows
import { useEffect } from "react";

const CATEGORY_COLORS = {
  "Cereals & Grains": "#ffd700",
  "Oils":             "#ff8c00",
  "Sugar":            "#ff69b4",
  "Meat & Fish":      "#ff4444",
  "Dairy":            "#87ceeb",
  "Fruits & Veg":     "#44ff88",
  "Other":            "#aaaaaa",
};

const CRISIS_KEY = {
  4: "ukraine_war",
  5: "red_sea",
};

const IMPORT_KEY = {
  4: "ukraine_imports",
};

const LANDLOCKED = new Set([
  "AFG","AND","ARM","AUT","AZE","BDI","BFA","BGD","BLR","BOL","BTN","BWA",
  "CAF","CHE","CZE","ETH","HUN","KAZ","KGZ","LAO","LSO","LUX","MDA",
  "MKD","MLI","MNG","MWI","NER","NPL","PRY","RWA","SDN","SRB","SSD","SWZ",
  "TCD","TJK","TKM","UGA","UZB","ZMB","ZWE","LIE","SMR",
]);

const CRISIS_LABEL = {
  ukraine_war: {
    color: "#ff8c00", icon: "🌊", source: "Black Sea corridor",
    verb: "pass through",
    headline: "route exposure",
    note: "⚠️ Figures show Black Sea corridor exposure — ports were blocked or at risk, not necessarily fully closed. Actual impact varied by port and timeline.",
  },
  ukraine_imports: {
    color: "#ff8c00", icon: "🌾", source: "Russia & Ukraine",
    verb: "sourced from",
    headline: "import dependency",
    note: "⚠️ Figures show pre-war import dependency — how much each country relied on Russia or Ukraine as a food source. Actual disruption depended on trade diversification capacity.",
  },
  red_sea: {
    color: "#ff4500", icon: "✕", source: "Red Sea corridor",
    verb: "pass through",
    headline: "route exposure",
    note: "⚠️ Figures show potential exposure — the corridor was disrupted, not fully closed. Actual impact depends on rerouting costs and conflict severity.",
  },
};

function fmt(n) {
  if (!n) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B t`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M t`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K t`;
  return `${Math.round(n)} t`;
}

// ── Mode A: Global price shock (events 1-3) ───────────────────────────────────
function GlobalPriceShockPanel({ crisis, onClose }) {
  return (
    <div className="crisis-exposure-popup">
      <div style={{ padding: "14px 14px 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#ff4444", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>
            🌐 Global Price Shock
          </div>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
        <div style={{
          padding: "12px",
          background: "rgba(255,68,68,0.07)",
          border: "1px solid rgba(255,68,68,0.2)",
          borderRadius: 7,
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: "#e0e0e0", lineHeight: 1.6 }}>
            This was a <strong style={{ color: "#fff" }}>global price shock</strong> — 
            not caused by a single geographic disruption. Prices spiked worldwide 
            due to demand, speculation, and systemic supply constraints.
          </div>
        </div>
        <div style={{
          fontSize: 11,
          color: "#9ca3af",
          lineHeight: 1.5,
        }}>
          💡 Click any country on the map to explore its food supply chain.
        </div>
      </div>
    </div>
  );
}

// ── Mode B: Geo crisis, no country selected yet (events 4-5) ──────────────────
function GeoPromptPanel({ crisis, onClose, layerMode, onLayerChange }) {
  const isUkraine = crisis.geoFilter?.minLat > 40;
  const color     = isUkraine ? "#ff8c00" : "#ff4500";
  const hasImportLayer = isUkraine; // only event 4 has import dependency data

  return (
    <div className="crisis-exposure-popup">
      <div className="crisis-exposure-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="crisis-exposure-country">{crisis.label}</div>
          <div className="crisis-exposure-subtitle" style={{ color }}>
            {isUkraine ? "🌊 Black Sea Corridor Disruption" : "✕ Chokepoint Disruption"}
          </div>
        </div>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      {hasImportLayer && (
        <div style={{ padding: "10px 14px 0" }}>
          <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
            Explore exposure by
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "routes",  label: "Disrupted routes",  desc: "Flows through Black Sea zone" },
              { key: "imports", label: "Import dependency", desc: "Reliance on Russia & Ukraine" },
            ].map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => onLayerChange(key)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: layerMode === key ? `1.5px solid ${color}` : "1px solid #ffffff15",
                  background: layerMode === key ? `${color}15` : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: layerMode === key ? color : "#e0e0e0", marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.4 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "14px 14px 6px" }}>
        <div style={{
          padding: "12px",
          background: `rgba(255,255,255,0.04)`,
          border: `1px solid ${color}30`,
          borderRadius: 7,
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: "#e0e0e0", lineHeight: 1.6 }}>
            {isUkraine
              ? (layerMode === "imports"
                  ? "Russia and Ukraine were major global food exporters — together supplying ~30% of global wheat. Many countries had deep structural dependency on these two sources."
                  : "Russia and Ukraine export ~30% of global wheat via Black Sea ports. The war blocked key corridors including Odesa and the Bosphorus grain route.")
              : "Houthi attacks and Iran conflict disrupted shipping through the Red Sea and Strait of Hormuz — key corridors for global food trade."}
          </div>
        </div>

        <div style={{
          fontSize: 11,
          color,
          lineHeight: 1.5,
          borderTop: "1px solid #ffffff08",
          paddingTop: 10,
          fontWeight: 500,
        }}>
          {layerMode === "imports"
            ? "👆 Click a country to see how dependent it was on Russian & Ukrainian food."
            : "👆 Click a country to see what % of its imports were disrupted."}
        </div>
      </div>
    </div>
  );
}

// ── Mode C: Country selected in geo crisis ────────────────────────────────────
export default function CrisisExposurePopup({ crisis, country, activeCrisis, exposureData, layerMode, onLayerChange, onClose }) {
  // Reset layer mode when crisis changes
  useEffect(() => { onLayerChange?.("routes"); }, [activeCrisis?.id]);

  // Mode A: no geoFilter — global price shock panel (no country needed)
  if (!activeCrisis?.geoFilter) {
    return <GlobalPriceShockPanel crisis={activeCrisis} onClose={onClose} />;
  }

  // Mode B: geoFilter but no country clicked yet
  if (!country) {
    return <GeoPromptPanel crisis={activeCrisis} onClose={onClose} layerMode={layerMode} onLayerChange={onLayerChange} />;
  }

  // Mode C: country clicked — show exposure data
  const isImportMode = layerMode === "imports" && activeCrisis?.id === 4;
  const crisisKey    = isImportMode ? IMPORT_KEY[activeCrisis?.id] : CRISIS_KEY[activeCrisis?.id];
  if (!crisisKey) return null;

  const meta        = CRISIS_LABEL[crisisKey];
  const countryData = exposureData?.[country.iso]?.[crisisKey];
  const displayName = country.data?.name || country.name;

  const categories = countryData
    ? Object.entries(countryData).sort((a, b) => b[1].disrupted_pct - a[1].disrupted_pct)
    : [];

  const hasExposure = categories.length > 0;
  const topCat      = categories[0];

  return (
    <div className="crisis-exposure-popup">
      <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #ffffff10", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{displayName}</div>
          <div style={{ fontSize: 10, color: meta.color, textTransform: "uppercase", letterSpacing: 2, marginTop: 2 }}>
            {meta.icon} Supply Exposure
          </div>
        </div>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      {/* Layer toggle — only for event 4 */}
      {activeCrisis?.id === 4 && (
        <div style={{ padding: "10px 14px 0", display: "flex", gap: 6 }}>
          {[
            { key: "routes",  label: "Disrupted routes" },
            { key: "imports", label: "Import dependency" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onLayerChange(key)}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 6,
                border: layerMode === key ? `1.5px solid ${meta.color}` : "1px solid #ffffff15",
                background: layerMode === key ? `${meta.color}15` : "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: layerMode === key ? 600 : 400,
                color: layerMode === key ? meta.color : "#9ca3af",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Landlocked */}
      {!hasExposure && LANDLOCKED.has(country.iso) && (
        <div className="crisis-exposure-none">
          <div style={{ fontSize: 24, marginBottom: 8 }}>🌍</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#ff8c00" }}>No maritime access</div>
          <div style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.5 }}>
            {displayName} is landlocked — maritime route data is not available to calculate crisis exposure.
          </div>
        </div>
      )}

      {/* No exposure */}
      {!hasExposure && !LANDLOCKED.has(country.iso) && (
        <div className="crisis-exposure-none">
          <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#44ff88" }}>No direct exposure</div>
          <div style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.5 }}>
            No significant import flows from {meta.source} detected for this country.
          </div>
        </div>
      )}

      {/* Exposure data */}
      {hasExposure && (
        <>
          <div className="crisis-exposure-headline" style={{ borderColor: meta.color + "40" }}>
            <span className="crisis-exposure-pct" style={{ color: meta.color }}>
              {topCat[1].disrupted_pct}%
            </span>
            <span className="crisis-exposure-pct-label">
              of <strong style={{ color: CATEGORY_COLORS[topCat[0]] }}>{topCat[0]}</strong> imports{" "}
              {isImportMode
                ? "sourced from Russia or Ukraine — potential supply dependency"
                : crisisKey === "ukraine_war"
                  ? "pass through the Black Sea corridor — potential supply risk"
                  : "pass through the Red Sea corridor — potential rerouting risk"}
            </span>
          </div>

          <div className="crisis-exposure-cats">
            <div className="crisis-exposure-cats-label">
              {isImportMode ? "Russia & Ukraine dependency by category" : "Origin / route exposure by category"}
            </div>
            {categories.map(([cat, vals]) => (
              <div key={cat} className="crisis-exposure-cat-row">
                <div className="crisis-exposure-cat-name">
                  <span className="crisis-exposure-cat-dot" style={{ background: CATEGORY_COLORS[cat] }} />
                  <span>{cat}</span>
                </div>
                <div className="crisis-exposure-bar-wrap">
                  <div className="crisis-exposure-bar" style={{
                    width: `${vals.disrupted_pct}%`,
                    background: meta.color,
                    boxShadow: `0 0 6px ${meta.color}60`,
                  }} />
                </div>
                <div className="crisis-exposure-cat-pct" style={{ color: meta.color }}>
                  {vals.disrupted_pct}%
                </div>
              </div>
            ))}
          </div>

          <div className="crisis-exposure-footer">
            <div style={{ marginBottom: 6 }}>
              {isImportMode ? (
                <span>
                  {fmt(categories.reduce((s, [, v]) => s + v.disrupted_tonnes, 0))} from RUS+UKR
                  {" of "}
                  {fmt(categories.reduce((s, [, v]) => s + v.total_tonnes, 0))} total imports
                </span>
              ) : crisisKey === "red_sea" ? (
                <span>
                  {categories.reduce((s, [, v]) => s + v.disrupted_routes, 0)} at-risk routes
                  {" / "}
                  {categories.reduce((s, [, v]) => s + v.total_routes, 0)} total maritime routes
                </span>
              ) : (
                <span>
                  {fmt(categories.reduce((s, [, v]) => s + v.disrupted_tonnes, 0))} exposed
                  {" of "}
                  {fmt(categories.reduce((s, [, v]) => s + v.total_tonnes, 0))} total imports
                </span>
              )}
            </div>
            <div style={{ color: "#6b7280", fontSize: 10, lineHeight: 1.4, fontStyle: "italic" }}>
              {meta.note}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
