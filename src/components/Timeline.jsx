// src/components/Timeline.jsx
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import CrisisModal from "./CrisisModal";

const LINE_COLORS = {
  "Food Price Index": "#ffffff",
  "Cereals & Grains": "#ffd700",
  "Oils":             "#ff8c00",
  "Sugar":            "#ff69b4",
  "Meat & Fish":      "#ff4444",
  "Dairy":            "#87ceeb",
};

export default function Timeline({ activeCrisis, onSelectCrisis, onExpandChange, isExpanded }) {
  const [priceData, setPriceData]       = useState([]);
  const [crisisEvents, setCrisisEvents] = useState([]);
  const [categories, setCategories]     = useState(["Cereals & Grains", "Oils", "Sugar", "Meat & Fish", "Dairy"]);
  const [activeLines, setActiveLines]   = useState(["Food Price Index", "Cereals & Grains", "Oils"]);
  const [modalCrisis, setModalCrisis]   = useState(null);


  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/fao_price_index.json`)
      .then(r => r.json())
      .then(d => {
        setPriceData(d.prices || []);
        setCrisisEvents(d.crisis_events || []);
      })
      .catch(() => console.warn("fao_price_index.json not found"));
  }, []);

  const toggleLine = (cat) => {
    setActiveLines(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // #2: toggle tells App, App controls the state
  const handleToggle = () => {
    onExpandChange(!isExpanded);
  };

  const handleCrisisClick = (crisis) => {
    const isAlreadyActive = activeCrisis?.id === crisis.id;
    onSelectCrisis(isAlreadyActive ? null : crisis);
    if (!isAlreadyActive) setModalCrisis(crisis);
    onExpandChange(false);
  };

  return (
    <div className={`timeline-container ${isExpanded ? "expanded" : ""}`}>

      <div className="timeline-handle" onClick={handleToggle}>
        <span className="handle-label">
          {isExpanded ? "▼ Food Price Timeline" : "▲ Food Price Timeline — click to expand"}
        </span>
      </div>

      <div className="timeline-inner">
        <div className="timeline-header">
          <div className="timeline-title">
            FAO Food Price Index
            <span className="timeline-subtitle">Indexed to 2014–2016 average (100 = base) · Monthly data · 1990–2026</span>
          </div>
          <div className="line-toggles-row">
            <span className="toggle-hint">Click categories to show / hide</span>
            <div className="line-toggles">
              {["Food Price Index", ...categories].map(cat => (
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
        </div>

        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={priceData} margin={{ top: 30, right: 20, bottom: 55, left: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: "#ffffff50", fontSize: 9 }}
                interval={23}
                tickMargin={10}
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
              {crisisEvents.map((crisis) => (
                <ReferenceArea
                  key={`area-${crisis.id}`}
                  x1={crisis.start}
                  x2={crisis.end}
                  y1={0}
                  y2="auto"
                  ifOverflow="extendDomain"
                  fill="#ff4444"
                  fillOpacity={0.10}
                  strokeOpacity={0}
                />
              ))}
              {crisisEvents.map((crisis) => (
                <ReferenceLine
                  key={`start-${crisis.id}`}
                  x={crisis.start}
                  stroke="#ff444260"
                  strokeDasharray="4 4"
                  label={{
                    value: crisis.label,
                    position: "top",
                    fill: "#ff4444",
                    fontSize: 9,
                    angle: -15,
                    textAnchor: "middle",
                    dy: -4,
                  }}
                />
              ))}
              {crisisEvents.map((crisis) => (
                <ReferenceLine
                  key={`end-${crisis.id}`}
                  x={crisis.end}
                  stroke="#ff444430"
                  strokeDasharray="2 4"
                />
              ))}
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
              <span className="marker-date">{crisis.start} → {crisis.end}</span>
            </button>
          ))}
        </div>
      </div>

      {modalCrisis && (
        <CrisisModal
          crisis={modalCrisis}
          onClose={() => { setModalCrisis(null); onSelectCrisis(null); }}
        />
      )}
    </div>
  );
}