// src/components/CrisisModal.jsx
// Shows when user clicks a crisis event on the timeline
// Displays: description, affected commodities, news article placeholders
import { useEffect } from "react";

export default function CrisisModal({ crisis, onClose }) {
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);

  const CATEGORY_COLORS = {
    "Cereals & Grains": "#ffd700",
    "Oils":             "#ff8c00",
    "Sugar":            "#ff69b4",
    "Meat & Fish":      "#ff4444",
    "Dairy":            "#87ceeb",
    "Fruits & Veg":     "#44ff88",
    "Other":            "#aaaaaa",
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal crisis-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="crisis-modal-header">
          <div className="crisis-pulse">
            <span className="pulse-dot" />
          </div>
          <div>
            <h2 className="crisis-modal-title">{crisis.label}</h2>
            <span className="crisis-modal-dates">{crisis.start} → {crisis.end}</span>
          </div>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>

        {/* Description */}
        <p className="crisis-description">{crisis.description}</p>

        {/* Affected commodities */}
        <div className="crisis-section">
          <div className="crisis-section-label">Affected food categories</div>
          <div className="crisis-commodities">
            {crisis.commodities.map(cat => (
              <span
                key={cat}
                className="commodity-tag"
                style={{ borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] }}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* News articles */}
        <div className="crisis-section">
          <div className="crisis-section-label">Related news & sources</div>
          <div className="articles-list">
            {crisis.articles.map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className={`article-link ${article.url === "#" ? "placeholder" : ""}`}
              >
                <div className="article-source">{article.source}</div>
                <div className="article-title">{article.title}</div>
                <span className="article-arrow">→</span>
              </a>
            ))}
          </div>
          {crisis.articles.every(a => a.url === "#") && (
            <p className="articles-placeholder-note">
              Add your curated articles to <code>fao_price_index.json</code> crisis_events section
            </p>
          )}
        </div>

        <button className="btn-primary" onClick={onClose} style={{ marginTop: 16 }}>
          Back to map
        </button>
      </div>
    </div>
  );
}
