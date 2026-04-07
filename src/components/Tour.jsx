// src/components/Tour.jsx
import { useState } from "react";

const STEPS = [
  {
    title: "The World Map",
    icon: "fa-solid fa-earth-africa",
    body: "The dark map shows every country in the world. Click any country to explore its food import and export profile.",
  },
  {
    title: "Food Categories",
    icon: "fa-solid fa-layer-group",
    body: "When you click a country, choose a food category — Cereals & Grains, Oils, Sugar, Meat & Fish, Dairy, Fruits & Veg, or All — to see trade flows.",
  },
  {
    title: "Trade Flow Arcs",
    icon: "fa-solid fa-ship",
    body: "Animated arcs show where food flows from origin countries into the selected country. Thicker arcs = larger trade volume.",
  },
  {
    title: "Crisis Timeline",
    icon: "fa-solid fa-chart-line",
    body: "Scroll up the timeline at the bottom to explore global food price shocks. Click a highlighted crisis event to see which countries and categories were affected.",
  },
  {
    title: "You're ready!",
    icon: "fa-solid fa-circle-check",
    body: "Start by clicking any country on the map, or scroll the timeline to a crisis event. The data covers 2020 trade flows and FAO price data from 1990 to 2026.",
  },
];

export default function Tour({ onFinish }) {
  const [current, setCurrent] = useState(0);
  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;

  return (
    <div className="modal-overlay">
      <div className="modal tour-modal">

        <div className="tour-dots">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`tour-dot ${i === current ? "active" : i < current ? "done" : ""}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>

        {/* Font Awesome icon — explicit open+close tags, no self-close */}
        <div style={{ fontSize: 40, color: "#ff2d78", textAlign: "center", margin: "8px 0 16px" }}>
          <i className={step.icon}></i>
        </div>

        <h2 className="tour-title">{step.title}</h2>
        <p className="tour-body">{step.body}</p>
        <p className="tour-counter">{current + 1} / {STEPS.length}</p>

        <div className="modal-actions">
          {current > 0 && (
            <button className="btn-ghost" onClick={() => setCurrent(c => c - 1)}>
              ← Back
            </button>
          )}
          {!isLast ? (
            <button className="btn-primary" onClick={() => setCurrent(c => c + 1)}>
              Next →
            </button>
          ) : (
            <button className="btn-primary" onClick={onFinish}>
              Open Map →
            </button>
          )}
        </div>

        <button className="skip-link" onClick={onFinish}>
          Skip tour
        </button>
      </div>
    </div>
  );
}