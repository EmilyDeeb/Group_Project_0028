// src/components/WelcomeModal.jsx
export default function WelcomeModal({ onStart, onSkip }) {
  return (
    <div className="modal-overlay">
      <div className="modal welcome-modal">

        {/* Header */}
        <div className="modal-header">
          <div className="pulse-dot large" />
          <h1 className="modal-title">FOOD SHOCK</h1>
        </div>

        <p className="modal-tagline">
          How global crises break the food supply chain
        </p>

        <div className="modal-divider" />

        {/* About */}
        <p className="modal-body">
          This tool visualises how geopolitical crises — from COVID-19 to the
          Ukraine War to the Iran/US/Israel conflict — cascade through global
          food supply chains, disrupting what billions of people eat and what
          they pay for it.
        </p>

        {/* Feature icons */}
        <div className="welcome-features">
          <div className="welcome-feature">
            <i className="fa-solid fa-earth-africa welcome-feature-icon" />
            <span>Interactive world map</span>
          </div>
          <div className="welcome-feature">
            <i className="fa-solid fa-ship welcome-feature-icon" />
            <span>Maritime trade flows</span>
          </div>
          <div className="welcome-feature">
            <i className="fa-solid fa-chart-line welcome-feature-icon" />
            <span>FAO price timeline</span>
          </div>
          <div className="welcome-feature">
            <i className="fa-solid fa-wheat-awn welcome-feature-icon" />
            <span>7 food categories</span>
          </div>
        </div>

        {/* Data sources */}
        <div className="modal-sources">
          <span className="sources-label">
            <i className="fa-solid fa-database" style={{ marginRight: 4 }} />
            Data:
          </span>
          <a href="https://www.fao.org/faostat" target="_blank" rel="noreferrer">FAOSTAT</a>
          <span>·</span>
          <a href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/BLVPFU" target="_blank" rel="noreferrer">Global Food Twin</a>
          <span>·</span>
          <a href="https://www.fao.org/worldfoodsituation/foodpricesindex/en" target="_blank" rel="noreferrer">FAO Price Index</a>
        </div>

        <div className="modal-divider" />

        {/* CTA */}
        <div className="modal-actions">
          <button className="btn-primary" onClick={onStart}>
            <i className="fa-solid fa-compass" style={{ marginRight: 8 }} />
            Start Tour
          </button>
          <button className="btn-ghost" onClick={onSkip}>
            <i className="fa-solid fa-map" style={{ marginRight: 8 }} />
            Skip to map
          </button>
        </div>

        {/* Secondary links */}
        <div className="modal-secondary-links">
          <a
            href="https://github.com/EmilyDeeb/Group_Project_0028"
            target="_blank"
            rel="noreferrer"
            className="modal-link-btn"
          >
            <i className="fa-brands fa-github" />
            <span>GitHub</span>
          </a>
          <a
            href="/data/food_shock_design_doc.pdf"
            download="Food_Shock_Design_Doc.pdf"
            className="modal-link-btn"
          >
            <i className="fa-solid fa-file-pdf" />
            <span>Design Doc</span>
          </a>
        </div>

        <p className="modal-footnote">
          <i className="fa-solid fa-graduation-cap" style={{ marginRight: 6 }} />
          UCL CASA · Spatial Design Stories · 2026
        </p>
      </div>
    </div>
  );
}