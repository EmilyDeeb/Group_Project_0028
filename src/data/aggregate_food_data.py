"""
Food Shock — Data Aggregation Script (REWRITTEN)
=================================================
Key fix: nutrition_by_country.json now correctly multiplies
nutritional density values (kcal/kg, protein kg/kg, etc.)
by trade quantity (tonnes → kg) before summing, then divides
by population × 365 to get per-person per-day values.

Output units in nutrition_by_country.json:
  energy  → kcal / person / day
  protein → g    / person / day
  fat     → g    / person / day
  carbs   → g    / person / day

Run:
    cd C:\\Users\\emily\\OneDrive\\Desktop\\CASA_MSc_Desktop\\MSc_Term02\\Group_Project_0028\\src\\data
    python aggregate_food_data.py
"""

import pandas as pd
import json
import os
import warnings
warnings.filterwarnings("ignore")

DATA_DIR   = r"C:\Users\emily\OneDrive\Desktop\CASA_MSc_Desktop\MSc_Term02\Group_Project_0028\src\data"
PUBLIC_DIR = r"C:\Users\emily\OneDrive\Desktop\CASA_MSc_Desktop\MSc_Term02\Group_Project_0028\food-shock\public\data"
os.makedirs(PUBLIC_DIR, exist_ok=True)

FILES = {
    "bilateral": "foodgroup1_2020bilateraltradebymodality_withexportcoeff.csv",
    "sua":       "foodgroup1_SUA_exportcoeff.csv",
    "supply":    "foodgroup1_totalsupply_utilization_admin1.csv",
    "nutrition": "foodgroup1_tradenutritionconversions_bycountry_byitem.csv",
    "fao_price": "food_price_indices_data_csv_mar.csv",
    "population": "population.json",  # must exist in DATA_DIR already
}

CATEGORY_MAP = {
    2511: "Cereals & Grains", 2513: "Cereals & Grains", 2514: "Cereals & Grains",
    2515: "Cereals & Grains", 2516: "Cereals & Grains", 2517: "Cereals & Grains",
    2518: "Cereals & Grains", 2520: "Cereals & Grains", 2807: "Cereals & Grains",
    2546: "Cereals & Grains", 2547: "Cereals & Grains", 2549: "Cereals & Grains",
    2555: "Oils", 2557: "Oils", 2558: "Oils", 2559: "Oils", 2560: "Oils",
    2561: "Oils", 2562: "Oils", 2563: "Oils", 2570: "Oils", 2571: "Oils",
    2572: "Oils", 2573: "Oils", 2574: "Oils", 2575: "Oils", 2576: "Oils",
    2577: "Oils", 2578: "Oils", 2579: "Oils", 2580: "Oils", 2581: "Oils",
    2582: "Oils", 2586: "Oils", 2781: "Oils", 2782: "Oils",
    2536: "Sugar", 2537: "Sugar", 2541: "Sugar", 2542: "Sugar",
    2543: "Sugar", 2745: "Sugar",
    2731: "Meat & Fish", 2732: "Meat & Fish", 2733: "Meat & Fish", 2734: "Meat & Fish",
    2735: "Meat & Fish", 2736: "Meat & Fish", 2737: "Meat & Fish",
    2761: "Meat & Fish", 2762: "Meat & Fish", 2763: "Meat & Fish", 2764: "Meat & Fish",
    2765: "Meat & Fish", 2766: "Meat & Fish", 2767: "Meat & Fish", 2768: "Meat & Fish",
    2769: "Meat & Fish", 2775: "Meat & Fish",
    2740: "Dairy", 2743: "Dairy", 2744: "Dairy", 2848: "Dairy",
    2531: "Fruits & Veg", 2532: "Fruits & Veg", 2533: "Fruits & Veg", 2534: "Fruits & Veg",
    2535: "Fruits & Veg", 2601: "Fruits & Veg", 2602: "Fruits & Veg", 2605: "Fruits & Veg",
    2611: "Fruits & Veg", 2612: "Fruits & Veg", 2613: "Fruits & Veg", 2614: "Fruits & Veg",
    2615: "Fruits & Veg", 2616: "Fruits & Veg", 2617: "Fruits & Veg", 2618: "Fruits & Veg",
    2619: "Fruits & Veg", 2620: "Fruits & Veg", 2625: "Fruits & Veg",
    2551: "Other", 2552: "Other", 2630: "Other", 2633: "Other", 2635: "Other",
    2640: "Other", 2641: "Other", 2642: "Other", 2645: "Other", 2655: "Other",
    2656: "Other", 2657: "Other", 2658: "Other", 2659: "Other", 2680: "Other",
    2899: "Other",
}

def get_category(code):
    try:
        return CATEGORY_MAP.get(int(code), "Other")
    except:
        return "Other"

def load_csv(path, skiprows=None):
    for enc in ["utf-8", "latin-1", "cp1252"]:
        try:
            if skiprows is not None:
                return pd.read_csv(path, encoding=enc, low_memory=False, skiprows=skiprows)
            return pd.read_csv(path, encoding=enc, low_memory=False)
        except:
            continue
    return None

def save_json(data, filename):
    for d in [DATA_DIR, PUBLIC_DIR]:
        path = os.path.join(d, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
        print(f"  ✓ {path}")


# ═══════════════════════════════════════════════════════
# STEP 0: ISO lookup
# ═══════════════════════════════════════════════════════
print("\n=== STEP 0: Building ISO lookup ===")
bil_raw = load_csv(os.path.join(DATA_DIR, FILES["bilateral"]))

code_to_iso  = {}
code_to_name = {}

for _, row in bil_raw[["reporter_country_code", "reporter_ISO3", "reporter_country"]].drop_duplicates().iterrows():
    try:
        code = int(row["reporter_country_code"])
        iso  = str(row["reporter_ISO3"]).strip()
        name = str(row["reporter_country"]).strip()
        if iso and iso != "nan":
            code_to_iso[code]  = iso
            code_to_name[code] = name
    except:
        continue

for _, row in bil_raw[["partner_country_code", "partner_iso3", "partner_country"]].drop_duplicates().iterrows():
    try:
        code = int(row["partner_country_code"])
        iso  = str(row["partner_iso3"]).strip()
        name = str(row["partner_country"]).strip()
        if iso and iso != "nan" and code not in code_to_iso:
            code_to_iso[code]  = iso
            code_to_name[code] = name
    except:
        continue

print(f"  ISO lookup: {len(code_to_iso)} countries")


# ═══════════════════════════════════════════════════════
# STEP 0b: Load population lookup
# ═══════════════════════════════════════════════════════
print("\n=== STEP 0b: Loading population data ===")
pop_path = os.path.join(DATA_DIR, FILES["population"])
with open(pop_path, encoding="utf-8") as f:
    pop_data = json.load(f)
# pop_data = { "ISO3": { "name": "...", "population": 12345 }, ... }
iso_to_pop = {iso: v["population"] for iso, v in pop_data.items()}
print(f"  Population entries: {len(iso_to_pop)}")


# ═══════════════════════════════════════════════════════
# OUTPUT 1: countries_supply.json
# ═══════════════════════════════════════════════════════
print("\n=== OUTPUT 1: countries_supply.json ===")
try:
    sua = load_csv(os.path.join(DATA_DIR, FILES["sua"]))
    print(f"  SUA rows: {len(sua)}")

    sua["category"] = sua["fbs_item_code"].apply(get_category)
    sua["iso3"]     = sua["reporter_country_code"].apply(
        lambda x: code_to_iso.get(int(x), None) if pd.notna(x) else None
    )

    sua_ok = sua[sua["iso3"].notna()].copy()
    sua_ok = sua_ok[sua_ok["iso3"] != "nan"]

    agg = sua_ok.groupby(["iso3", "category"]).agg(
        export_qty      = ("Export Quantity",          "sum"),
        import_qty      = ("Import Quantity",          "sum"),
        production      = ("Production",               "sum"),
        domestic_supply = ("Domestic supply quantity", "sum"),
    ).reset_index()

    result = {}
    iso_to_code = {v: k for k, v in code_to_iso.items()}

    for _, row in agg.iterrows():
        iso = row["iso3"]
        cat = row["category"]
        if iso not in result:
            code = iso_to_code.get(iso)
            result[iso] = {
                "name":       code_to_name.get(code, iso),
                "categories": {},
            }
        result[iso]["categories"][cat] = {
            "export_qty":      int(row["export_qty"]),
            "import_qty":      int(row["import_qty"]),
            "production":      int(row["production"]),
            "domestic_supply": int(row["domestic_supply"]),
        }

    print(f"  Countries built: {len(result)}")
    save_json(result, "countries_supply.json")

except Exception as e:
    import traceback; traceback.print_exc()


# ═══════════════════════════════════════════════════════
# OUTPUT 2: bilateral_trade.json
# ═══════════════════════════════════════════════════════
print("\n=== OUTPUT 2: bilateral_trade.json ===")
try:
    bil = bil_raw.copy()
    bil["category"] = bil["fbs_item_code"].apply(get_category)

    bil_sea = bil[bil["share_sea_predict"] > 0.3].copy()

    agg_bil = bil_sea.groupby([
        "reporter_ISO3", "reporter_country",
        "partner_iso3",  "partner_country",
        "category"
    ])["export_quantity"].sum().reset_index()

    agg_bil = agg_bil[agg_bil["export_quantity"] > 1000]

    arcs = []
    for _, row in agg_bil.iterrows():
        f = str(row["reporter_ISO3"]).strip()
        t = str(row["partner_iso3"]).strip()
        if not f or not t or f == "nan" or t == "nan":
            continue
        arcs.append({
            "from":      f,
            "from_name": str(row["reporter_country"]).strip(),
            "to":        t,
            "to_name":   str(row["partner_country"]).strip(),
            "category":  row["category"],
            "qty":       int(row["export_quantity"]),
        })

    print(f"  Total arcs: {len(arcs)}")
    save_json(arcs, "bilateral_trade.json")

except Exception as e:
    import traceback; traceback.print_exc()


# ═══════════════════════════════════════════════════════
# OUTPUT 3: nutrition_by_country.json  ← KEY FIX HERE
#
# The nutrition CSV contains per-item nutritional DENSITIES:
#   Energy (kcal) = kcal per kg of this food item
#   Protein (kg)  = kg of protein per kg of this food item
#   Fat (kg)      = kg of fat per kg of this food item
#   Carbs (kg)    = kg of carbs per kg of this food item
#
# To get national totals we must multiply by the trade quantity
# for that country × item, then convert units:
#   trade quantity is in TONNES → × 1000 to get kg
#
# Then to get per-person per-day:
#   ÷ population ÷ 365
#
# Final output units:
#   energy  → kcal / person / day
#   protein → g    / person / day  (kg/person/day × 1000)
#   fat     → g    / person / day
#   carbs   → g    / person / day
# ═══════════════════════════════════════════════════════
print("\n=== OUTPUT 3: nutrition_by_country.json (FIXED) ===")
try:
    nut = load_csv(os.path.join(DATA_DIR, FILES["nutrition"]))
    print(f"  Nutrition rows: {len(nut)}")
    print(f"  Nutrition cols: {list(nut.columns[:10])}")

    # Add ISO and category to nutrition density table
    nut["iso3"]     = nut["reporter_country_code"].apply(
        lambda x: code_to_iso.get(int(x), None) if pd.notna(x) else None
    )
    nut["category"] = nut["fbs_item_code"].apply(get_category)
    nut_ok = nut[nut["iso3"].notna()].copy()
    nut_ok = nut_ok[nut_ok["iso3"] != "nan"]

    eng_col  = "Energy (kcal)"   # kcal per kg of food
    pro_col  = "Protein (kg)"    # kg protein per kg of food
    fat_col  = "Fat (kg)"        # kg fat per kg of food
    carb_col = "Carbs (kg)"      # kg carbs per kg of food

    # Check which columns exist
    for col in [eng_col, pro_col, fat_col, carb_col]:
        if col not in nut_ok.columns:
            print(f"  WARNING: column '{col}' not found!")

    # ── Join with SUA to get quantities ─────────────────────────────────────
    # CRITICAL: aggregate SUA to ONE row per (country, item) BEFORE merging
    # to prevent row multiplication inflating all values.
    sua_raw = load_csv(os.path.join(DATA_DIR, FILES["sua"]))
    sua_raw["import_qty_tonnes"]   = pd.to_numeric(sua_raw["Import Quantity"], errors="coerce").fillna(0)
    sua_raw["production_tonnes"]   = pd.to_numeric(sua_raw["Production"],      errors="coerce").fillna(0)

    # Sum to exactly one row per (reporter_country_code, fbs_item_code)
    sua_agg = sua_raw.groupby(
        ["reporter_country_code", "fbs_item_code"], as_index=False
    ).agg(
        import_qty_tonnes = ("import_qty_tonnes", "sum"),
        production_tonnes = ("production_tonnes", "sum"),
    )
    print(f"  SUA aggregated rows: {len(sua_agg)} (unique country+item combos)")

    # Also check nutrition table for duplicates
    nut_ok_dedup = nut_ok.groupby(
        ["reporter_country_code", "fbs_item_code"], as_index=False
    ).agg({
        eng_col:  "mean",  # densities should be identical per item — take mean to be safe
        pro_col:  "mean",
        fat_col:  "mean",
        carb_col: "mean",
        "iso3":     "first",
        "category": "first",
    })
    print(f"  Nutrition deduplicated rows: {len(nut_ok_dedup)}")

    # Now merge — guaranteed one-to-one
    nut_merged = nut_ok_dedup.merge(
        sua_agg,
        on=["reporter_country_code", "fbs_item_code"],
        how="left"
    )
    nut_merged["import_qty_tonnes"] = nut_merged["import_qty_tonnes"].fillna(0)
    nut_merged["production_tonnes"] = nut_merged["production_tonnes"].fillna(0)

    # Total food available = imports + domestic production (tonnes)
    nut_merged["total_food_tonnes"] = nut_merged["import_qty_tonnes"] + nut_merged["production_tonnes"]

    # Convert density × quantity to national totals
    # Energy col = kcal/tonne,  qty in tonnes → kcal total (no unit conversion needed)
    # Protein/Fat/Carbs col = kg/tonne = dimensionless ratio, qty in tonnes → kg total
    nut_merged["total_energy_kcal"] = nut_merged[eng_col]  * nut_merged["total_food_tonnes"]
    nut_merged["total_protein_kg"]  = nut_merged[pro_col]  * nut_merged["total_food_tonnes"]
    nut_merged["total_fat_kg"]      = nut_merged[fat_col]  * nut_merged["total_food_tonnes"]
    nut_merged["total_carbs_kg"]    = nut_merged[carb_col] * nut_merged["total_food_tonnes"]

    # Aggregate by country + category
    agg_nut = nut_merged.groupby(["iso3", "category"]).agg(
        energy_kcal_total  = ("total_energy_kcal", "sum"),
        protein_kg_total   = ("total_protein_kg",  "sum"),
        fat_kg_total       = ("total_fat_kg",       "sum"),
        carbs_kg_total     = ("total_carbs_kg",     "sum"),
    ).reset_index()

    # Build output: divide by (population × 365) → per-person per-day
    result_nut = {}
    missing_pop = []

    for _, row in agg_nut.iterrows():
        iso = str(row["iso3"]).strip()
        if not iso or iso == "nan":
            continue

        pop = iso_to_pop.get(iso)
        if not pop or pop == 0:
            missing_pop.append(iso)
            continue

        person_days = pop * 365
        cat = row["category"]

        if iso not in result_nut:
            result_nut[iso] = {}

        result_nut[iso][cat] = {
            "energy":  round(row["energy_kcal_total"] / person_days, 2),         # kcal/person/day
            "protein": round((row["protein_kg_total"]  / person_days) * 1000, 2), # g/person/day
            "fat":     round((row["fat_kg_total"]       / person_days) * 1000, 2), # g/person/day
            "carbs":   round((row["carbs_kg_total"]     / person_days) * 1000, 2), # g/person/day
        }

    print(f"  Countries with nutrition data: {len(result_nut)}")
    if missing_pop:
        print(f"  Skipped (no population data): {missing_pop[:10]}")

    # Spot check
    for chk in ["UKR", "NER", "GBR", "USA", "AFG"]:
        if chk in result_nut:
            cereals = result_nut[chk].get("Cereals & Grains", {})
            all_energy = sum(v.get("energy", 0) for v in result_nut[chk].values())
            all_protein = sum(v.get("protein", 0) for v in result_nut[chk].values())
            print(f"  {chk}: total energy={all_energy:.0f} kcal/p/day | "
                  f"cereals energy={cereals.get('energy', 0):.0f} | "
                  f"total protein={all_protein:.1f} g/p/day")

    save_json(result_nut, "nutrition_by_country.json")

except Exception as e:
    import traceback; traceback.print_exc()


# ═══════════════════════════════════════════════════════
# OUTPUT 4: fao_price_index.json
# ═══════════════════════════════════════════════════════
print("\n=== OUTPUT 4: fao_price_index.json ===")
try:
    fao_path = os.path.join(DATA_DIR, FILES["fao_price"])
    fao = pd.read_csv(fao_path, skiprows=3, header=0, encoding="utf-8")
    fao.columns = [str(c).strip() for c in fao.columns]
    fao = fao.dropna(how="all")

    col_map = {
        "Food Price Index": "Food Price Index",
        "Cereals & Grains": "Cereals",
        "Oils":             "Oils",
        "Sugar":            "Sugar",
        "Meat & Fish":      "Meat",
        "Dairy":            "Dairy",
    }
    col_map = {k: v for k, v in col_map.items() if v in fao.columns}

    date_col = fao.columns[0]
    records = []
    for _, row in fao.iterrows():
        date_val = str(row[date_col]).strip()
        if not date_val or date_val == "nan":
            continue
        rec = {"date": date_val}
        for label, col in col_map.items():
            try:
                rec[label] = round(float(row[col]), 2)
            except:
                rec[label] = None
        records.append(rec)

    print(f"  Records: {len(records)}")

    crisis_events = [
        {
            "id": 1, "start": "2007-09", "end": "2008-09",
            "label": "Global Food Crisis",
            "commodities": ["Cereals & Grains", "Oils"],
            "description": "Oil price surge, biofuel demand, and Australian drought caused food riots in 30+ countries.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
        {
            "id": 2, "start": "2010-07", "end": "2015-02",
            "label": "Sustained Price Shock",
            "commodities": ["Cereals & Grains", "Oils", "Sugar"],
            "description": "Russian drought and wheat export ban (2010), Arab Spring food unrest (2011), prolonged supply tightness through 2014.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
        {
            "id": 3, "start": "2020-10", "end": "2021-06",
            "label": "COVID Supply Shock",
            "commodities": ["Oils", "Sugar"],
            "description": "Pandemic disrupted global logistics, labour shortages hit harvests, panic buying inflated demand.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
        {
            "id": 4, "start": "2022-03", "end": "2022-12",
            "label": "Ukraine War",
            "commodities": ["Cereals & Grains", "Oils"],
            "description": "Russia invaded Ukraine in February 2022. Together they supply ~30% of global wheat and ~60% of sunflower oil.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
        {
            "id": 5, "start": "2024-01", "end": "2026-03",
            "label": "Red Sea & Iran Conflict",
            "commodities": ["Oils", "Cereals & Grains", "Sugar"],
            "description": "Houthi Red Sea attacks from 2023, escalating to US-Israel strikes on Iran and Hormuz closure in 2026.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
    ]

    output = {
        "prices": records,
        "crisis_events": crisis_events,
        "categories": list(col_map.keys()),
    }
    save_json(output, "fao_price_index.json")

except Exception as e:
    import traceback; traceback.print_exc()


print("\n=== ALL DONE ===")
print("Spot-check the values printed above.")
print("Expected ranges per person per day:")
print("  Energy:  1500–4000 kcal  (dietary supply, not just trade)")
print("  Protein: 40–120 g")
print("  Fat:     30–150 g")
print("  Carbs:   200–600 g")