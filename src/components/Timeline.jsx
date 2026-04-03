// src/components/Timeline.jsx
// FAO Food Price Index chart + crisis event markers
// Click a crisis spike → activeCrisis updates → map highlights affected arcs
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import CrisisModal from "./CrisisModal";

const LINE_COLORS = {
  "Food Price Index": "#ffffff",
  "Cereals & Grains": "#ffd700",
  "Oils":             "#ff8c00",
  "Sugar":            "#ff69b4",
  "Meat & Fish":      "#ff4444",
  "Dairy":            "#87ceeb",
};

export default function Timeline({ activeCrisis, onSelectCrisis }) {
  const [priceData, setPriceData]     = useState([]);
  const [crisisEvents, setCrisisEvents] = useState([]);
  const [categories, setCategories]   = useState([]);
  const [activeLines, setActiveLines] = useState(["Food Price Index", "Cereals & Grains", "Oils"]);
  const [modalCrisis, setModalCrisis] = useState(null);
  const [isExpanded, setIsExpanded]   = useState(false);

  useEffect(() => {
    fetch("/data/fao_price_index.json")
      .then(r => r.json())
      .then(d => {
        setPriceData(d.prices || []);
        setCrisisEvents(d.crisis_events || []);
        setCategories(d.categories || []);
      })
      .catch(() => console.warn("fao_price_index.json not found"));
  }, []);

  const toggleLine = (cat) => {
    setActiveLines(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleCrisisClick = (crisis) => {
    onSelectCrisis(crisis);
    setModalCrisis(crisis);
  };

  return (
    <div className={`timeline-container ${isExpanded ? "expanded" : ""}`}>

      {/* Toggle handle */}
      <div className="timeline-handle" onClick={() => setIsExpanded(e => !e)}>
        <span className="handle-label">
          {isExpanded ? "▼ Food Price Timeline" : "▲ Food Price Timeline — click to expand"}
        </span>
      </div>

      <div className="timeline-inner">
        {/* Chart header */}
        <div className="timeline-header">
          <div className="timeline-title">
            FAO Food Price Index
            <span className="timeline-subtitle">2014–2016 = 100 · Monthly · 1990–2026</span>
          </div>

          {/* Line toggles */}
          <div className="line-toggles">
            {["Food Price Index", ...(categories)].map(cat => (
              <button
                key={cat}
                className={`line-toggle ${activeLines.includes(cat) ? "active" : ""}`}
                style={{ "--toggle-color": LINE_COLORS[cat] || "#aaa" }}
                onClick={() => toggleLine(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Price chart */}
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={priceData} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: "#ffffff50", fontSize: 9 }}
                interval={23}
                tickLine={false}
                axisLine={{ stroke: "#ffffff15" }}
              />
              <YAxis
                tick={{ fill: "#ffffff50", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{ background: "#0d1425", border: "1px solid #ffffff20", borderRadius: 4 }}
                labelStyle={{ color: "#ffffff80", fontSize: 11 }}
                itemStyle={{ fontSize: 11 }}
              />

              {/* Crisis reference lines */}
              {crisisEvents.map(crisis => (
                <ReferenceLine
                  key={crisis.id}
                  x={crisis.start}
                  stroke="#ff222260"
                  strokeDasharray="4 4"
                  label={{
                    value: crisis.label,
                    position: "top",
                    fill: "#ff4444",
                    fontSize: 8,
                  }}
                />
              ))}

              {/* Data lines */}
              {activeLines.map(cat => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={LINE_COLORS[cat] || "#aaa"}
                  strokeWidth={cat === "Food Price Index" ? 2 : 1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Crisis event markers */}
        <div className="crisis-markers">
          <span className="crisis-markers-label">Crisis Events:</span>
          {crisisEvents.map(crisis => (
            <button
              key={crisis.id}
              className={`crisis-marker-btn ${activeCrisis?.id === crisis.id ? "active" : ""}`}
              onClick={() => handleCrisisClick(crisis)}
            >
              <span className="marker-dot" />
              <span className="marker-label">{crisis.label}</span>
              <span className="marker-date">{crisis.start}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Crisis modal */}
      {modalCrisis && (
        <CrisisModal
          crisis={modalCrisis}
          onClose={() => { setModalCrisis(null); onSelectCrisis(null); }}
        />
      )}
    </div>
  );
}
