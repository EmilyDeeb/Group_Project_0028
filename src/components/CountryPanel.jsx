// src/components/CountryPanel.jsx
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getTopImports } from "./TradeArcs";

const CATEGORIES = ["All", "Cereals & Grains", "Oils", "Sugar", "Meat & Fish", "Dairy", "Fruits & Veg", "Other"];

const CATEGORY_COLORS = {
  "All":             "#e63946",
  "Cereals & Grains":"#ffd700",
  "Oils":            "#ff8c00",
  "Sugar":           "#ff69b4",
  "Meat & Fish":     "#ff4444",
  "Dairy":           "#87ceeb",
  "Fruits & Veg":    "#44ff88",
  "Other":           "#aaaaaa",
};

const DARK_TEXT_CATS = new Set(["Cereals & Grains", "Fruits & Veg", "Dairy"]);

const WORLD_AVG = {
  energy:  2960,
  protein: 84,
  fat:     103,
  carbs:   399,
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
    { label: "Imports",    value: catData.import_qty,      color: "#8c52ff" },
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
          <span style={{ fontSize: 11, fontWeight: 600, color: catData.export_qty > catData.import_qty ? "#44ff88" : "#8c52ff" }}>
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

function FloatingPie({ groups, onClose }) {
  const entries = Object.entries(groups).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const radius = 55;
  const cx = 70, cy = 70;
  let cumAngle = -Math.PI / 2;

  const slices = entries.map(([cat, val]) => {
    const angle = (val / total) * 2 * Math.PI;
    const x1 = cx + radius * Math.cos(cumAngle);
    const y1 = cy + radius * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + radius * Math.cos(cumAngle);
    const y2 = cy + radius * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    return { cat, val, path: `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z` };
  });

  return createPortal(
    <div style={{
      position: "fixed", right: 392, top: "70%", transform: "translateY(-50%)",
      background: "rgba(6,13,24,0.97)", border: "1px solid #ffffff20",
      borderRadius: 10, padding: "14px 16px", zIndex: 9999, width: 230,
      boxShadow: "-4px 0 32px rgba(0,0,0,0.8)",
    }}>
      <div style={{ position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)",
        width: 0, height: 0, borderTop: "8px solid transparent",
        borderBottom: "8px solid transparent", borderLeft: "8px solid rgba(6,13,24,0.97)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Category Breakdown</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
      <svg width="140" height="140" style={{ display: "block", margin: "0 auto 12px" }}>
        {slices.map(s => (
          <path key={s.cat} d={s.path} fill={CATEGORY_COLORS[s.cat] || "#aaa"} opacity={0.9} />
        ))}
      </svg>
      {entries.map(([cat, val]) => (
        <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: CATEGORY_COLORS[cat] || "#aaa", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "#e0e0e0", flex: 1 }}>{cat}</span>
          <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>{fmt(val)}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}

function MaritimeImports({ iso, category }) {
  const [imports, setImports]     = useState(null);
  const [error, setError]         = useState(false);
  const [activePie, setActivePie] = useState(null);

  useEffect(() => {
    setImports(null); setError(false); setActivePie(null);
    getTopImports(iso, category, 5)
      .then(data => setImports(data))
      .catch(() => setError(true));
  }, [iso, category]);

  if (imports === null) return <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>Loading maritime flows…</div>;
  if (error || imports.length === 0) return <div style={{ padding: 16, color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>No maritime import data for this selection</div>;

  const maxFlow = imports[0]?.flow_tonnes || 1;

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ fontSize: 10, color: "#8c52ff", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
        {LANDLOCKED.has(iso) ? "▼ Top Land Import Origins" : "▼ Top Maritime Import Origins"}
      </div>
      {imports.map((row, i) => {
        const groupEntries = Object.entries(row.groups || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const hasGroups = groupEntries.length > 0 && category === "All";
        const isActive  = activePie?.country === row.country_from;
        return (
          <div key={row.country_from} style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                cursor: hasGroups ? "pointer" : "default",
                padding: "4px 6px", borderRadius: 4,
                background: isActive ? "#8c52ff15" : "transparent",
                border: isActive ? "1px solid #8c52ff40" : "1px solid transparent",
                transition: "all 0.15s",
              }}
              onClick={() => hasGroups && setActivePie(isActive ? null : { country: row.country_from, groups: row.groups })}
              title={hasGroups ? "Click to see category breakdown" : undefined}
            >
              <span style={{ fontSize: 10, color: "#ffffff40", fontFamily: "monospace", width: 14 }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: "#e0e0e0", flex: 1 }}>{row.name_from}</span>
              {hasGroups && <span style={{ fontSize: 9, color: isActive ? "#8c52ff" : "#ffffff30", marginRight: 2 }}>●</span>}
              <span style={{ fontSize: 11, color: "#8c52ff", fontFamily: "monospace" }}>{fmt(row.flow_tonnes)}</span>
            </div>
            <div style={{ height: 4, background: "#ffffff08", borderRadius: 2, overflow: "hidden", marginLeft: 22, marginBottom: 4 }}>
              <div style={{ height: "100%", width: `${(row.flow_tonnes / maxFlow) * 100}%`, background: "#8c52ff", borderRadius: 2, opacity: 0.7, transition: "width 0.5s ease" }} />
            </div>
            {category === "All" && groupEntries.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginLeft: 22, flexWrap: "wrap" }}>
                {groupEntries.map(([grp, val]) => (
                  <span key={grp} style={{
                    fontSize: 9, color: CATEGORY_COLORS[grp] || "#aaa",
                    background: `${CATEGORY_COLORS[grp]}18`, border: `1px solid ${CATEGORY_COLORS[grp]}40`,
                    borderRadius: 3, padding: "1px 6px", fontFamily: "monospace",
                  }}>
                    {grp.split(" & ")[0].split(" ")[0]} {fmt(val)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {activePie && category === "All" && (
        <FloatingPie groups={activePie.groups} onClose={() => setActivePie(null)} />
      )}
    </div>
  );
}

function PersonGraph({ value, max, color, label }) {
  const pct    = Math.min((value / max) * 100, 100);
  const filled = Math.round(pct / 10);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: 48 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: pct > 0 ? color : "#ffffff15", border: `2px solid ${color}`, transition: "background 0.5s ease" }} />
      {[...Array(8)].map((_, i) => {
        const isFilled = (7 - i) < filled;
        return (
          <div key={i} style={{
            width: i < 2 ? 26 : i < 6 ? 22 : 10, height: 7, borderRadius: 2,
            background: isFilled ? color : "#ffffff10",
            border: `1px solid ${isFilled ? color : "#ffffff18"}`,
            transition: "background 0.5s ease",
            boxShadow: isFilled ? `0 0 4px ${color}60` : "none",
          }} />
        );
      })}
      <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 4, textAlign: "center", lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

function NutritionTab({ iso, category }) {
  const [nutState, setNutState] = useState({ data: null, loaded: false });
  const { data, loaded } = nutState;

  useEffect(() => {
    setNutState({ data: null, loaded: false });
    fetch("/data/nutrition_by_country.json")
      .then(r => r.json())
      .then(nutData => setNutState({ data: nutData[iso] || null, loaded: true }))
      .catch(() => setNutState({ data: null, loaded: true }));
  }, [iso]);

  if (!loaded) return <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>Loading…</div>;
  if (!data)   return <div style={{ padding: 16, color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>No nutrition data available</div>;

  const cats = category === "All" ? Object.keys(data) : [category];

  // JSON is from FAO Food Balance Sheets — already kcal/person/day and g/person/day
  const totals = { energy: 0, protein: 0, fat: 0, carbs: 0 };
  cats.forEach(cat => {
    if (data[cat]) {
      totals.energy  += data[cat].energy  || 0;
      totals.protein += data[cat].protein || 0;
      totals.fat     += data[cat].fat     || 0;
      totals.carbs   += data[cat].carbs   || 0;
    }
  });

  const nutrients = [
    { key: "energy",  label: "Energy",  unit: "kcal", color: "#ffd700", avg: WORLD_AVG.energy },
    { key: "protein", label: "Protein", unit: "g",    color: "#ff8c00", avg: WORLD_AVG.protein },
    { key: "fat",     label: "Fat",     unit: "g",    color: "#ff69b4", avg: WORLD_AVG.fat },
    { key: "carbs",   label: "Carbs",   unit: "g",    color: "#87ceeb", avg: WORLD_AVG.carbs },
  ];

  const energyPct   = Math.round((totals.energy / WORLD_AVG.energy) * 100);
  const energyColor = totals.energy >= WORLD_AVG.energy ? "#44ff88" : "#ff8c00";
  const maxEnergy   = Math.max(totals.energy, WORLD_AVG.energy) * 1.2;
  const statusLabel = totals.energy >= WORLD_AVG.energy * 1.1
    ? "Above average" : totals.energy >= WORLD_AVG.energy * 0.9
    ? "Near world average" : "Below average";

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16, lineHeight: 1.4 }}>
        Per person · per day · {category === "All" ? "all food" : category} · 2023
      </div>

      <div style={{
        display: "flex", justifyContent: "center", alignItems: "flex-end",
        gap: 28, marginBottom: 20, padding: "16px 8px",
        background: "#ffffff05", borderRadius: 8, border: "1px solid #ffffff08",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>This country</div>
          <PersonGraph value={totals.energy} max={maxEnergy} color="#ffd700" label={`${Math.round(totals.energy)} kcal`} />
        </div>
        <div style={{ textAlign: "center", alignSelf: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: energyColor, fontFamily: "monospace" }}>{energyPct}%</div>
          <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>of world avg</div>
          <div style={{ fontSize: 10, color: energyColor, marginTop: 6, maxWidth: 80, lineHeight: 1.3 }}>{statusLabel}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>World avg</div>
          <PersonGraph value={WORLD_AVG.energy} max={maxEnergy} color="#ffffff40" label={`${WORLD_AVG.energy} kcal`} />
        </div>
      </div>

      {nutrients.map(n => {
        const val   = totals[n.key];
        const pct   = Math.round((val / n.avg) * 100);
        const above = pct >= 100;
        return (
          <div key={n.key} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{n.label} ({n.unit}/day)</span>
              <span style={{ fontSize: 11, color: above ? "#44ff88" : "#ff8c00", fontFamily: "monospace", fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ position: "relative", height: 6, background: "#ffffff10", borderRadius: 3, marginBottom: 3 }}>
              <div style={{ height: "100%", width: `${Math.min((val / (n.avg * 1.8)) * 100, 100)}%`, background: n.color, borderRadius: 3, transition: "width 0.5s ease" }} />
              <div style={{ position: "absolute", top: -3, bottom: -3, left: `${(1 / 1.8) * 100}%`, width: 2, background: "#ffffff50", borderRadius: 1 }} title="World average" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: n.color, fontFamily: "monospace" }}>{val.toLocaleString(undefined, { maximumFractionDigits: 1 })} {n.unit}</span>
              <span style={{ fontSize: 9, color: "#ffffff40", fontFamily: "monospace" }}>avg {n.avg} {n.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CountryPanel({ country, category, onClose, onSelectCategory, activeTab, onTabChange }) {
  const tab         = activeTab || "trade";
  const setTab      = onTabChange || (() => {});
  const catData     = getCategoryData(country.data, category);
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
        {CATEGORIES.map(cat => {
          const isActive = category === cat;
          const color    = CATEGORY_COLORS[cat];
          const darkText = DARK_TEXT_CATS.has(cat);
          return (
            <button
              key={cat}
              className="panel-cat-btn"
              style={isActive ? { background: color, borderColor: color, color: darkText ? "#0d1425" : "white", justifyContent: "center" } : { justifyContent: "center" }}
              onClick={() => onSelectCategory(cat)}
              title={cat}
            >
              <span className="cat-label" style={{ textAlign: "center", margin: 0 }}>{cat}</span>
            </button>
          );
        })}
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
                <MaritimeImports iso={country.iso} category={category} />
                {LANDLOCKED.has(country.iso) && (
                  <div style={{
                    margin: "8px 16px 12px",
                    padding: "10px 12px",
                    background: "#ffffff06",
                    border: "1px solid #ffffff12",
                    borderLeft: "3px solid #ff8c0080",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>🌍</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#ff8c00", marginBottom: 2 }}>
                        No maritime access
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.4 }}>
                        {displayName} is landlocked — all imports arrive overland. Maritime flow data is not available.
                      </div>
                    </div>
                  </div>
                )}
              </>
        )}
        {tab === "nutrition" && <NutritionTab iso={country.iso} category={category} />}
      </div>
    </div>
  );
}