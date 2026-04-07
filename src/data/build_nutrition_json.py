"""
build_nutrition_json.py
=======================
Converts FAO Food Balance Sheet CSV (FAOSTAT_data_en_*.csv) into
nutrition_by_country.json for the Food Shock app.

Output format:
{
  "AFG": {
    "Cereals & Grains": { "energy": 1640.56, "protein": 46.88, "fat": 7.20, "carbs": 0 },
    "Oils":             { "energy": 218.96,  "protein": 0.94,  "fat": 23.62, "carbs": 0 },
    ...
  },
  ...
}

Units: kcal/capita/day  |  g/capita/day  (straight from FAO — no conversion needed)

Run:
    python build_nutrition_json.py
"""

import pandas as pd
import json
import os
import pycountry

# ── Paths ──────────────────────────────────────────────────────────────────────
CSV_PATH    = r"FAOSTAT_data_en_4-7-2026.csv"   # put in same folder as this script
OUTPUT_PATH = r"nutrition_by_country.json"        # copy to public/data/ after

# ── FAO item → your app category ──────────────────────────────────────────────
ITEM_TO_CATEGORY = {
    "Cereals - Excluding Beer": "Cereals & Grains",
    "Oilcrops":                 "Oils",
    "Vegetable Oils":           "Oils",
    "Animal fats":              "Oils",          # rendered fat — fits Oils category
    "Sugar & Sweeteners":       "Sugar",
    "Sugar Crops":              "Sugar",
    "Meat":                     "Meat & Fish",
    "Fish, Seafood":            "Meat & Fish",
    "Aquatic Products, Other":  "Meat & Fish",
    "Milk - Excluding Butter":  "Dairy",
    "Eggs":                     "Dairy",         # animal protein — closest category
    "Vegetables":               "Fruits & Veg",
    "Fruits - Excluding Wine":  "Fruits & Veg",
    "Miscellaneous":            "Other",
    # Exclude aggregates — we build our own totals
    "Grand Total":              None,
    "Animal Products":          None,
    "Population":               None,
}

# ── Element → output key ───────────────────────────────────────────────────────
ELEMENT_TO_KEY = {
    "Food supply (kcal/capita/day)":          "energy",   # kcal/person/day
    "Protein supply quantity (g/capita/day)": "protein",  # g/person/day
    "Fat supply quantity (g/capita/day)":     "fat",      # g/person/day
    # Note: FAO FBS doesn't include carbs — we leave carbs as 0
    # (carbs can be derived as: energy - protein*4 - fat*9) / 4
    # but FAO doesn't publish it directly in this dataset
}

# ── Manual name → ISO3 overrides for FAO country names ────────────────────────
MANUAL_ISO = {
    "Bolivia (Plurinational State of)":                "BOL",
    "Cabo Verde":                                      "CPV",
    "China":                                           None,  # aggregate — use mainland only
    "China, mainland":                                 "CHN",
    "China, Hong Kong SAR":                            None,  # exclude sub-regions from CHN total
    "China, Macao SAR":                                None,  # exclude
    "China, Taiwan Province of":                       None,  # exclude
    "Congo":                                           "COG",
    "Democratic People's Republic of Korea":           "PRK",
    "Democratic Republic of the Congo":                "COD",
    "Eswatini":                                        "SWZ",
    "Iran (Islamic Republic of)":                      "IRN",
    "Lao People's Democratic Republic":                "LAO",
    "Micronesia (Federated States of)":                "FSM",
    "Netherlands (Kingdom of the)":                    "NLD",
    "North Macedonia":                                 "MKD",
    "Republic of Korea":                               "KOR",
    "Republic of Moldova":                             "MDA",
    "Russian Federation":                              "RUS",
    "Saint Kitts and Nevis":                           "KNA",
    "Saint Lucia":                                     "LCA",
    "Saint Vincent and the Grenadines":                "VCT",
    "Sao Tome and Principe":                           "STP",
    "Syrian Arab Republic":                            "SYR",
    "Tanzania, United Republic of":                    "TZA",
    "Timor-Leste":                                     "TLS",
    "Türkiye":                                         "TUR",
    "United Kingdom of Great Britain and Northern Ireland": "GBR",
    "United States of America":                        "USA",
    "Venezuela (Bolivarian Republic of)":              "VEN",
    "Viet Nam":                                        "VNM",
    "West Bank":                                       "PSE",
    "Côte d'Ivoire":                                   "CIV",
    "Réunion":                                         "REU",
}

def get_iso3(name):
    if name in MANUAL_ISO:
        return MANUAL_ISO[name]
    try:
        return pycountry.countries.lookup(name).alpha_3
    except:
        return None

def derive_carbs(energy, protein, fat):
    """
    Estimate carbs using Atwater factors:
      energy = protein*4 + fat*9 + carbs*4
      carbs  = (energy - protein*4 - fat*9) / 4
    Returns 0 if negative (rounding artefacts).
    """
    carbs = (energy - protein * 4 - fat * 9) / 4
    return round(max(carbs, 0), 2)


# ── Load CSV ───────────────────────────────────────────────────────────────────
print("Loading CSV...")
df = pd.read_csv(CSV_PATH, encoding="utf-8-sig", low_memory=False)
print(f"  Rows: {len(df)}")

# Keep only the elements we care about
df = df[df["Element"].isin(ELEMENT_TO_KEY.keys())].copy()

# Map items to categories — drop aggregates (None)
df["category"] = df["Item"].map(ITEM_TO_CATEGORY)
df = df[df["category"].notna()].copy()

# Map country names to ISO3
df["iso3"] = df["Area"].apply(get_iso3)
missing = df[df["iso3"].isna()]["Area"].unique()
if len(missing):
    print(f"  WARNING — no ISO3 for: {list(missing)}")
df = df[df["iso3"].notna()].copy()

# Map element to output key
df["nutrient"] = df["Element"].map(ELEMENT_TO_KEY)
df["Value"]    = pd.to_numeric(df["Value"], errors="coerce").fillna(0)

print(f"  Countries: {df['iso3'].nunique()}")
print(f"  Categories: {sorted(df['category'].unique())}")


# ── Aggregate: sum across items within each category ──────────────────────────
agg = df.groupby(["iso3", "category", "nutrient"])["Value"].sum().reset_index()

# Pivot so each row = (iso3, category) with energy/protein/fat columns
pivot = agg.pivot_table(
    index=["iso3", "category"],
    columns="nutrient",
    values="Value",
    aggfunc="sum",
    fill_value=0,
).reset_index()

# Ensure all nutrient columns exist
for col in ["energy", "protein", "fat"]:
    if col not in pivot.columns:
        pivot[col] = 0


# ── Build output dict ──────────────────────────────────────────────────────────
result = {}
for _, row in pivot.iterrows():
    iso = row["iso3"]
    cat = row["category"]
    e   = round(float(row["energy"]),  2)
    p   = round(float(row["protein"]), 2)
    f   = round(float(row["fat"]),     2)
    c   = derive_carbs(e, p, f)

    if iso not in result:
        result[iso] = {}
    result[iso][cat] = {"energy": e, "protein": p, "fat": f, "carbs": c}


# ── Spot-check ────────────────────────────────────────────────────────────────
print("\nSpot-check (per person per day):")
for chk in ["AFG", "NER", "GBR", "USA", "UKR", "CHN"]:
    if chk in result:
        cats   = result[chk]
        e_tot  = sum(v["energy"]  for v in cats.values())
        p_tot  = sum(v["protein"] for v in cats.values())
        f_tot  = sum(v["fat"]     for v in cats.values())
        c_tot  = sum(v["carbs"]   for v in cats.values())
        print(f"  {chk}: energy={e_tot:.0f} kcal | protein={p_tot:.1f}g | "
              f"fat={f_tot:.1f}g | carbs={c_tot:.1f}g")

print(f"\nTotal countries: {len(result)}")

# ── Save ──────────────────────────────────────────────────────────────────────
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(result, f, separators=(",", ":"))
print(f"\n✓ Saved → {OUTPUT_PATH}")
print("  Copy this file to your public/data/ folder.")
