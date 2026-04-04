// src/components/CountryPanel.jsx
import { useState } from "react";

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
            <div style={{ height: "100%", width: `${(bar.value / max) * 100}%`, background: bar.color, borderRadius: 3, transition: "width 0.5s ease", boxShadow: `0 0 5px ${bar.color}50` }} />
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

function TradeFlows({ iso, category, tradeData }) {
  if (!tradeData || !tradeData.length) return (
    <div style={{ padding: 16, color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>Trade flow data loading...</div>
  );

  const filter = row => category === "All" || row.category === category;

  const importAgg = tradeData
    .filter(d => d.to === iso && filter(d))
    .reduce((acc, d) => {
      if (!acc[d.from]) acc[d.from] = { name: d.from_name, iso: d.from, qty: 0 };
      acc[d.from].qty += d.qty;
      return acc;
    }, {});

  const top5imports = Object.values(importAgg).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const exportAgg = tradeData
    .filter(d => d.from === iso && filter(d))
    .reduce((acc, d) => {
      if (!acc[d.to]) acc[d.to] = { name: d.to_name, iso: d.to, qty: 0 };
      acc[d.to].qty += d.qty;
      return acc;
    }, {});

  const top5exports = Object.values(exportAgg).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const maxI = top5imports[0]?.qty || 1;
  const maxE = top5exports[0]?.qty || 1;

  const FlowList = ({ items, max, color, label }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>{label}</div>
      {items.length === 0
        ? <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>No flows for this selection</div>
        : items.map((row, i) => (
          <div key={row.iso} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "#ffffff40", fontFamily: "monospace", width: 14 }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: "#e0e0e0", flex: 1 }}>{row.name}</span>
              <span style={{ fontSize: 11, color, fontFamily: "monospace" }}>{fmt(row.qty)}</span>
            </div>
            <div style={{ height: 4, background: "#ffffff08", borderRadius: 2, overflow: "hidden", marginLeft: 22 }}>
              <div style={{ height: "100%", width: `${(row.qty / max) * 100}%`, background: color, borderRadius: 2, opacity: 0.7 }} />
            </div>
          </div>
        ))
      }
    </div>
  );

  return (
    <div style={{ padding: "12px 16px" }}>
      <FlowList items={top5imports} max={maxI} color="#ff8c00" label="▼ Top Import Origins" />
      <FlowList items={top5exports} max={maxE} color="#44ff88" label="▲ Top Export Destinations" />
    </div>
  );
}

function NutritionTab({ iso, category }) {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    fetch("/data/nutrition_by_country.json")
      .then(r => r.json())
      .then(d => { setData(d[iso] || null); setLoaded(true); })
      .catch(() => setLoaded(true));
  }

  if (!loaded) return <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>Loading...</div>;
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

  // Each bar is 100% of itself — shows relative scale per nutrient
const maxN = 1; // not used

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
            <div
              style={{
                height: "100%",
                width: `${Math.min((bar.value / (totals.energy / 100 || 1)) * 100, 100)}%`,
                background: bar.color,
                borderRadius: 3,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CountryPanel({ country, category, onClose, onSelectCategory, tradeData }) {
  const [tab, setTab] = useState("trade");
  const catData = getCategoryData(country.data, category);
  const displayName = country.data?.name || country.name;

  return (
    <div className="country-panel">
      <div className="panel-header">
        <div>
          <div className="panel-country-name">{displayName}</div>
          <div className="panel-iso">{country.iso} · 2020 data</div>
        </div>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="panel-categories">
        {CATEGORIES.map(cat => (
          <button key={cat} className={`panel-cat-btn ${category === cat ? "active" : ""}`} onClick={() => onSelectCategory(cat)} title={cat}>
            <span className="cat-icon">{CAT_ICONS[cat]}</span>
            <span className="cat-label">{cat}</span>
          </button>
        ))}
      </div>

      <div className="panel-tabs">
        <button className={`panel-tab ${tab === "trade" ? "active" : ""}`} onClick={() => setTab("trade")}>Supply & Trade</button>
        <button className={`panel-tab ${tab === "nutrition" ? "active" : ""}`} onClick={() => setTab("nutrition")}>Nutrition</button>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {tab === "trade" && (
          !country.data
            ? <div style={{ padding: 16, color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>No supply data for {displayName}</div>
            : <>
                <TradeBar catData={catData} />
                <TradeFlows iso={country.iso} category={category} tradeData={tradeData} />
              </>
        )}
        {tab === "nutrition" && <NutritionTab iso={country.iso} category={category} />}
      </div>
    </div>
  );
}