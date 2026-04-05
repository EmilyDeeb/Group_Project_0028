// src/App.jsx
import { useState } from "react";
import WelcomeModal from "./components/WelcomeModal";
import Tour from "./components/Tour";
import WorldMap from "./components/WorldMap";
import Timeline from "./components/Timeline";
import "./App.css";

export default function App() {
  const [step, setStep] = useState("welcome"); // welcome | tour | app
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeCrisis, setActiveCrisis] = useState(null);

  return (
    <div className="app">
      {/* Welcome Modal */}
      {step === "welcome" && (
        <WelcomeModal 
        onStart={() => setStep("tour")}
        onSkip={() => setStep("app")}
        />
      )}

      {/* Guided Tour */}
      {step === "tour" && (
        <Tour onFinish={() => setStep("app")} />
      )}

      {/* Main App */}
      {step === "app" && (
        <div className="app-layout">
          {/* Header */}
          <header className="app-header">
            <div className="header-left">
              <span className="pulse-dot" />
              <span className="app-title">FOOD SHOCK</span>
              <span className="app-subtitle">Global Food Supply Crisis Tracker</span>
            </div>
            <div className="header-right">
              <span className="live-badge">● LIVE DATA</span>
            </div>
          </header>

          {/* Map Area */}
          <div className="map-area">
            <WorldMap
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              activeCrisis={activeCrisis}
            />
          </div>

          {/* Timeline */}
          <div className="timeline-area">
            <Timeline
              activeCrisis={activeCrisis}
              onSelectCrisis={setActiveCrisis}
            />
          </div>
        </div>
      )}
    </div>
  );
}
