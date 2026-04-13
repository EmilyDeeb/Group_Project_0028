// src/App.jsx
import { useState } from "react";
import WelcomeModal from "./components/WelcomeModal";
import Tour from "./components/Tour";
import WorldMap from "./components/WorldMap";
import Timeline from "./components/Timeline";
import "./App.css";

export default function App() {
  const [step, setStep]                   = useState("welcome");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeCrisis, setActiveCrisis]   = useState(null);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [activeTab, setActiveTab]         = useState("trade"); // #4: preserve tab across countries

  // #2: Timeline expand → fully close panel
  const handleTimelineExpand = (expanded) => {
    setTimelineExpanded(expanded);
    if (expanded) setSelectedCountry(null);
  };

  // #3: Clicking a country → collapse timeline, open panel
  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    if (country) setTimelineExpanded(false);
  };

  return (
    <div className="app">
      {step === "welcome" && (
        <WelcomeModal
          onStart={() => setStep("tour")}
          onSkip={() => setStep("app")}
        />
      )}

      {step === "tour" && (
        <Tour onFinish={() => setStep("app")} />
      )}

      {step === "app" && (
        <div className="app-layout">
          <header className="app-header">
            <div className="header-left">
              <span className="pulse-dot" />
              <span className="app-title">FOOD SHOCK</span>
              <span className="app-subtitle">Global Food Supply Crisis Tracker</span>
            </div>
          </header>

          <div className="map-area">
            <WorldMap
              selectedCountry={selectedCountry}
              onSelectCountry={handleSelectCountry}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              activeCrisis={activeCrisis}
              onSelectCrisis={setActiveCrisis}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          <div className="timeline-area">
            <Timeline
              activeCrisis={activeCrisis}
              onSelectCrisis={setActiveCrisis}
              onExpandChange={handleTimelineExpand}
              isExpanded={timelineExpanded}  // controlled from outside now
            />
          </div>
        </div>
      )}
    </div>
  );
}