# Food Shock 🌍

Global Food Supply Crisis Tracker — UCL CASA Spatial Design Stories 2026

## Setup

```bash
npm install
npm install react-globe.gl recharts leaflet react-leaflet papaparse
npm run dev
```

## Data Files (place in /public/data/)

| File | Source | Status |
|------|--------|--------|
| `countries.geojson` | World Bank GPKG → convert with QGIS/Mapshaper | ⬜ Add yours |
| `country-centroids.json` | https://github.com/gavinr/world-countries-centroids | ⬜ Download |
| `countries_supply.json` | Run `aggregate_food_data.py` | ✅ Generated |
| `bilateral_trade.json` | Run `aggregate_food_data.py` | ✅ Generated |
| `nutrition_by_country.json` | Run `aggregate_food_data.py` | ✅ Generated |
| `fao_price_index.json` | Run `aggregate_food_data.py` | ✅ Generated |

## Component Overview

```
App.jsx                 — App state, routing between welcome/tour/app
├── WelcomeModal.jsx    — Step 1: intro modal with sources + GitHub
├── Tour.jsx            — Step 2: 5-step guided tour
├── WorldMap.jsx        — Step 3: Leaflet dark map + country polygons
│   ├── CountryPanel.jsx — Side panel: supply stats + nutrition tabs
│   └── TradeArcs.jsx   — 🔧 NADIA'S COMPONENT: trade flow arcs
└── Timeline.jsx        — Step 4: FAO price chart + crisis events
    └── CrisisModal.jsx — Crisis detail modal with article links

```

## Work Split

**Person 1 — Map + Data (you)**
- Convert GPKG → GeoJSON using QGIS or Mapshaper
- Drop `countries.geojson` into `/public/data/`
- Copy generated JSON files into `/public/data/`
- Test country click → panel flow

**Person 2 — Trade Arcs (Nadia)**
- Download `country-centroids.json` and add to `/public/data/`
- Complete `TradeArcs.jsx` — draw arcs from bilateral_trade.json
- See comments in TradeArcs.jsx for full guidance

**Person 3 — Timeline + Design Doc**
- Add real news article links to `fao_price_index.json` → crisis_events
- Refine timeline styling
- Write design document + critical reflection

## Adding News Articles

Edit `fao_price_index.json` — find `crisis_events` array, fill in:
```json
{
  "title": "Russia's wheat export ban sends prices soaring",
  "url": "https://www.theguardian.com/...",
  "source": "The Guardian"
}
```

## Country GeoJSON Property Names

The map looks for `ISO_A3` or `iso3` for country codes, and `NAME` or `name` for display names.
Check your GeoJSON properties and update `WorldMap.jsx` `onEachFeature` if different.
