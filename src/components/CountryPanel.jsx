// src/components/CountryPanel.jsx
import { useState, useEffect } from "react";
import { getTopImports } from "./TradeArcs";

const CATEGORIES = ["All", "Cereals & Grains", "Oils", "Sugar", "Meat & Fish", "Dairy", "Fruits & Veg", "Other"];

const CAT_ICONS = {
  "All":             "🌍",
  "Cereals & Grains":"🌾",
  "Oils":            "🫙",
  "Sugar":           "🍬",
  "Meat & Fish":     "🥩",
  "Dairy":           "🥛",
  "Fruits & Veg":    "🥦",
  "Other":           "📦",
};

const CATEGORY_COLORS = {
  "Cereals & Grains": "#ffd700",
  "Oils":             "#ff8c00",
  "Sugar":            "#ff69b4",
  "Meat & Fish":      "#ff4444",
  "Dairy":            "#87ceeb",
  "Fruits & Veg":     "#44ff88",
  "Other":            "#aaaaaa",
};

function fmt(n) {
  if (!n || n === 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M t`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K t`;
  return `${Math.round(n)} t`;
}

function getCategoryData(countryData, category) {
  if (!countryData?.categories) return null;
  if (category === "All") {
    const totals = { export_qty: 0, import_qty: 0, production: 0, domestic_supply: 0 };
    Object.values(countryData.categories).forEach(cat => {
      totals.export_qty      += cat.export_qty      || 0;
      totals.import_qty      += cat.import_qty      || 0;
      totals.production      += cat.production      || 0;
      totals.domestic_supply += cat.domestic_supply || 0;
    });
    return totals;
  }
  return countryData.categories[category] || null;
}

// ── Supply bar chart ──────────────────────────────────────────────────────────
function TradeBar({ catData }) {
  if (!catData) return null;
  const bars = [
    { label: "Exports",    value: catData.export_qty,      color: "#44ff88" },
    { label: "Imports",    value: catData.import_qty,      color: "#ff8c00" },
    { label: "Production", value: catData.production,      color: "#0d9488" },
    { label: "Domestic",   value: catData.domestic_supply, color: "#87ceeb" },
  ].filter(b => b.value > 0);

  if (bars.length === 0) return null;
  const max = Math.max(...bars.map(b => b.value));

  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #ffffff08" }}>
      <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
        Supply Overview
      </div>
      {bars.map(bar => (
        <div key={bar.label} style={{ marginBottom: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{bar.label}</span>
            <span style={{ fontSize: 11, color: bar.color, fontFamily: "monospace" }}>{fmt(bar.value)}</span>
          </div>
          <div style={{ height: 5, background: "#ffffff10", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(bar.value / max) * 100}%`,
              background: bar.color,
              borderRadius: 3,
              transition: "width 0.5s ease",
              boxShadow: `0 0 5px ${bar.color}50`,
            }} />
          </div>
        </div>
      ))}
      {(catData.export_qty > 0 || catData.import_qty > 0) && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#ffffff06", borderRadius: 4 }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Trade Balance</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: catData.export_qty > catData.import_qty ? "#44ff88" : "#ff8c00" }}>
            {catData.export_qty > catData.import_qty
              ? `▲ Net Exporter +${fmt(catData.export_qty - catData.import_qty)}`
              : `▼ Net Importer ${fmt(catData.import_qty - catData.export_qty)}`}
          </span>
        </div>
      )}
    </div>
  );
}

const LANDLOCKED = new Set([
  "AFG","AND","ARM","AUT","AZE","BDI","BFA","BGD","BLR","BOL","BTN","BWA",
  "CAF","CHE","CZE","ETH","HUN","KAZ","KGZ","LAO","LSO","LUX","MDA",
  "MKD","MLI","MNG","MWI","NER","NPL","PRY","RWA","SDN","SRB","SSD","SWZ",
  "TCD","TJK","TKM","UGA","UZB","ZMB","ZWE","LIE","SMR",
]);

// ── Top import origins (fetched from real GeoJSONs) ───────────────────────────
function MaritimeImports({ iso, category }) {
  const [imports, setImports] = useState(null); // null = loading
  const [error, setError]     = useState(false);

  useEffect(() => {
    setImports(null);
    setError(false);
    getTopImports(iso, category, 5)
      .then(data => setImports(data))
      .catch(() => setError(true));
  }, [iso, category]);

  if (imports === null) {
    return (
      <div style={{ padding: "16px", color: "#9ca3af", fontSize: 12 }}>
        <span style={{ marginRight: 8 }}>⏳</span>Loading maritime flows…
      </div>
    );
  }

  if (error || imports.length === 0) {
    return (
      <div style={{ padding: "16px", color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>
        No maritime import data for this selection
      </div>
    );
  }

  const maxFlow = imports[0]?.flow_tonnes || 1;

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ fontSize: 10, color: "#ff8c00", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
        {LANDLOCKED.has(iso) ? "▼ Top Land Import Origins" : "▼ Top Maritime Import Origins"}
      </div>

      {imports.map((row, i) => {
        // Show breakdown by group if "All"
        const groupEntries = Object.entries(row.groups || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        return (
          <div key={row.country_from} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#ffffff40", fontFamily: "monospace", width: 14 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 12, color: "#e0e0e0", flex: 1 }}>{row.name_from}</span>
              <span style={{ fontSize: 11, color: "#ff8c00", fontFamily: "monospace" }}>
                {fmt(row.flow_tonnes)}
              </span>
            </div>

            {/* Main bar */}
            <div style={{ height: 4, background: "#ffffff08", borderRadius: 2, overflow: "hidden", marginLeft: 22, marginBottom: 4 }}>
              <div style={{
                height: "100%",
                width: `${(row.flow_tonnes / maxFlow) * 100}%`,
                background: "#ff8c00",
                borderRadius: 2,
                opacity: 0.7,
                transition: "width 0.5s ease",
              }} />
            </div>

            {/* Category breakdown pills */}
            {category === "All" && groupEntries.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginLeft: 22, flexWrap: "wrap" }}>
                {groupEntries.map(([grp, val]) => (
                  <span key={grp} style={{
                    fontSize: 9,
                    color: CATEGORY_COLORS[grp] || "#aaa",
                    background: `${CATEGORY_COLORS[grp]}18` || "#ffffff08",
                    border: `1px solid ${CATEGORY_COLORS[grp]}40` || "1px solid #ffffff20",
                    borderRadius: 3,
                    padding: "1px 5px",
                    fontFamily: "monospace",
                  }}>
                    {CAT_ICONS[grp]} {fmt(val)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Nutrition tab ─────────────────────────────────────────────────────────────
function NutritionTab({ iso, category }) {
  const [data, setData]     = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    fetch("/data/nutrition_by_country.json")
      .then(r => r.json())
      .then(d => { setData(d[iso] || null); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [iso]);

  if (!loaded) return <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>Loading…</div>;
  if (!data)   return <div style={{ padding: 16, color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>No nutrition data available</div>;

  const cats = category === "All" ? Object.keys(data) : [category];
  const totals = { energy: 0, protein: 0, fat: 0, carbs: 0 };
  cats.forEach(cat => {
    if (data[cat]) {
      totals.energy  += data[cat].energy  || 0;
      totals.protein += data[cat].protein || 0;
      totals.fat     += data[cat].fat     || 0;
      totals.carbs   += data[cat].carbs   || 0;
    }
  });

  const fmtN = n => {
    if (!n || n === 0) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return `${n.toFixed(1)}`;
  };

  const nutBars = [
    { label: "Energy (kcal)", value: totals.energy,  color: "#ffd700" },
    { label: "Protein (kg)",  value: totals.protein, color: "#ff8c00" },
    { label: "Fat (kg)",      value: totals.fat,     color: "#ff69b4" },
    { label: "Carbs (kg)",    value: totals.carbs,   color: "#87ceeb" },
  ].filter(b => b.value > 0);

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 14, lineHeight: 1.4 }}>
        Nutritional value of {category === "All" ? "all food" : category} traded · 2020
      </div>
      {nutBars.map(bar => (
        <div key={bar.label} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{bar.label}</span>
            <span style={{ fontSize: 11, color: bar.color, fontFamily: "monospace" }}>{fmtN(bar.value)}</span>
          </div>
          <div style={{ height: 5, background: "#ffffff10", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min((bar.value / (totals.energy / 100 || 1)) * 100, 100)}%`,
              background: bar.color,
              borderRadius: 3,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function CountryPanel({ country, category, onClose, onSelectCategory }) {
  const [tab, setTab]  = useState("trade");
  const catData        = getCategoryData(country.data, category);
  const displayName    = country.data?.name || country.name;

  // Reset to trade tab when country changes
  useEffect(() => { setTab("trade"); }, [country.iso]);

  return (
    <div className="country-panel">
      <div className="panel-header">
        <div>
          <div className="panel-country-name">{displayName}</div>
          <div className="panel-iso">{country.iso} · 2020 data</div>
        </div>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      {/* Category selector */}
      <div className="panel-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`panel-cat-btn ${category === cat ? "active" : ""}`}
            onClick={() => onSelectCategory(cat)}
            title={cat}
          >
            <span className="cat-icon">{CAT_ICONS[cat]}</span>
            <span className="cat-label">{cat}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        <button className={`panel-tab ${tab === "trade" ? "active" : ""}`} onClick={() => setTab("trade")}>
          Supply & Trade
        </button>
        <button className={`panel-tab ${tab === "nutrition" ? "active" : ""}`} onClick={() => setTab("nutrition")}>
          Nutrition
        </button>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {tab === "trade" && (
          !country.data
            ? <div style={{ padding: 16, color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>
                No supply data for {displayName}
              </div>
            : <>
                <TradeBar catData={catData} />
                <MaritimeImports iso={country.iso} category={category} />
              </>
        )}
        {tab === "nutrition" && (
          <NutritionTab iso={country.iso} category={category} />
        )}
      </div>
    </div>
  );
}
