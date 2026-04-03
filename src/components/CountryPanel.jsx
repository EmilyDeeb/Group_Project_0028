// src/components/CountryPanel.jsx
// Shows import/export/production stats per country + category
// Tab 1: Supply & Trade  |  Tab 2: Nutrition
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
  return `${n} t`;
}

function getCategoryData(countryData, category) {
  if (!countryData?.categories) return null;
  if (category === "All") {
    // Sum all categories
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

export default function CountryPanel({ country, category, onClose, onSelectCategory }) {
  const [tab, setTab] = useState("trade"); // trade | nutrition
  const catData = getCategoryData(country.data, category);

  return (
    <div className="country-panel">

      {/* Panel header */}
      <div className="panel-header">
        <div>
          <div className="panel-country-name">{country.name}</div>
          <div className="panel-iso">{country.iso}</div>
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

      {/* Tab content */}
      <div className="panel-content">
        {tab === "trade" && (
          <>
            {!country.data ? (
              <div className="panel-no-data">No data available for {country.name}</div>
            ) : !catData ? (
              <div className="panel-no-data">No {category} data for {country.name}</div>
            ) : (
              <>
                <div className="stat-grid">
                  <div className="stat-card export">
                    <div className="stat-label">Exports</div>
                    <div className="stat-value">{fmt(catData.export_qty)}</div>
                    <div className="stat-sublabel">{category}</div>
                  </div>
                  <div className="stat-card import">
                    <div className="stat-label">Imports</div>
                    <div className="stat-value">{fmt(catData.import_qty)}</div>
                    <div className="stat-sublabel">{category}</div>
                  </div>
                  <div className="stat-card production">
                    <div className="stat-label">Production</div>
                    <div className="stat-value">{fmt(catData.production)}</div>
                    <div className="stat-sublabel">domestic</div>
                  </div>
                  <div className="stat-card supply">
                    <div className="stat-label">Domestic Supply</div>
                    <div className="stat-value">{fmt(catData.domestic_supply)}</div>
                    <div className="stat-sublabel">available</div>
                  </div>
                </div>

                {/* Trade balance indicator */}
                {catData.export_qty > 0 || catData.import_qty > 0 ? (
                  <div className="trade-balance">
                    <div className="balance-label">Trade Balance</div>
                    <div className={`balance-value ${catData.export_qty > catData.import_qty ? "surplus" : "deficit"}`}>
                      {catData.export_qty > catData.import_qty
                        ? `▲ Net Exporter (+${fmt(catData.export_qty - catData.import_qty)})`
                        : `▼ Net Importer (${fmt(catData.import_qty - catData.export_qty)})`
                      }
                    </div>
                  </div>
                ) : null}

                <div className="panel-hint">
                  Click a category above to see trade flows on the map
                </div>
              </>
            )}
          </>
        )}

        {tab === "nutrition" && (
          <NutritionTab iso={country.iso} category={category} />
        )}
      </div>
    </div>
  );
}

// Nutrition tab — loads nutrition_by_country.json
function NutritionTab({ iso, category }) {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Lazy load nutrition data
  if (!loaded) {
    fetch("/data/nutrition_by_country.json")
      .then(r => r.json())
      .then(d => { setData(d[iso] || null); setLoaded(true); })
      .catch(() => setLoaded(true));
  }

  if (!loaded) return <div className="panel-loading">Loading nutrition data...</div>;
  if (!data)   return <div className="panel-no-data">No nutrition data available</div>;

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

  const fmtN = n => n > 0 ? `${(n / 1_000_000).toFixed(1)}M` : "—";

  return (
    <div>
      <div className="nutrition-intro">
        Nutritional value of {category === "All" ? "all food" : category} traded by this country (kg-based totals)
      </div>
      <div className="stat-grid">
        <div className="stat-card energy">
          <div className="stat-label">Energy</div>
          <div className="stat-value">{fmtN(totals.energy)}</div>
          <div className="stat-sublabel">kcal</div>
        </div>
        <div className="stat-card protein">
          <div className="stat-label">Protein</div>
          <div className="stat-value">{fmtN(totals.protein)}</div>
          <div className="stat-sublabel">kg</div>
        </div>
        <div className="stat-card fat">
          <div className="stat-label">Fat</div>
          <div className="stat-value">{fmtN(totals.fat)}</div>
          <div className="stat-sublabel">kg</div>
        </div>
        <div className="stat-card carbs">
          <div className="stat-label">Carbs</div>
          <div className="stat-value">{fmtN(totals.carbs)}</div>
          <div className="stat-sublabel">kg</div>
        </div>
      </div>
    </div>
  );
}
