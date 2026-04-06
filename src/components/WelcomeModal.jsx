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

        {/* Crisis pills */}
        <div className="crisis-pills">
          {["COVID-19 2020", "Ukraine War 2022", "Iran/US/Israel 2026"].map(c => (
            <span key={c} className="crisis-pill">{c}</span>
          ))}
        </div>

        {/* Data sources */}
        <div className="modal-sources">
          <span className="sources-label">Data sources:</span>
          <a href="https://www.fao.org/faostat" target="_blank" rel="noreferrer">FAOSTAT</a>
          <span>·</span>
          <a href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/BLVPFU" target="_blank" rel="noreferrer">Global Food Twin</a>
          <span>·</span>
          <a href="https://www.fao.org/worldfoodsituation/foodpricesindex/en" target="_blank" rel="noreferrer">FAO Price Index</a>
          <span>·</span>
          <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
        </div>

        <div className="modal-divider" />

        {/* CTA */}
        <div className="modal-actions">
          <button className="btn-primary" onClick={onStart}>
            Start Tour →
          </button>
          <button className="btn-ghost" onClick={onSkip}>
            Skip to map
          </button>
        </div>

        <p className="modal-footnote">
          UCL CASA · Spatial Design Stories · 2026
        </p>
      </div>
    </div>
  );
}
