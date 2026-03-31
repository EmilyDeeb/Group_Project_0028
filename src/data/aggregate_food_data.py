"""
Food Shock — Data Aggregation Script
=====================================
Reads raw Harvard Dataverse + FAO files and outputs
clean, category-aggregated JSON files ready for React.

Run from your data folder:
    cd C:\\Users\\emily\\OneDrive\\Desktop\\CASA_MSc_Desktop\\MSc_Term02\\Group_Project_0028\\src\\data
    python aggregate_food_data.py

Outputs (written to same folder):
    countries_supply.json       → Step 3: country click panel
    bilateral_trade.json        → Step 3: trade flow arcs
    nutrition_by_country.json   → Step 3: calorie modal
    fao_price_index.json        → Step 4: timeline chart
"""

import pandas as pd
import json
import os
import warnings
warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# CONFIG — file names (adjust if yours differ)
# ─────────────────────────────────────────────
DATA_DIR = r"C:\Users\emily\OneDrive\Desktop\CASA_MSc_Desktop\MSc_Term02\Group_Project_0028\src\data"

FILES = {
    "supply":    "foodgroup1_totalsupply_utilization_admin1.csv",
    "bilateral": "foodgroup1_2020bilateraltradebymodality_withexportcoeff.csv",
    "nutrition": "foodgroup1_tradenutritionconversions_bycountry_byitem.csv",
    "sua":       "foodgroup1_SUA_exportcoeff.csv",
    "fao_price": "food_price_indices_data_csv_mar.csv",  # your FAO file
}

# ─────────────────────────────────────────────
# CATEGORY MAPPING  (fbs_item_code → category)
# Based on unique_fbs_items.csv — all 100 items covered
# ─────────────────────────────────────────────
CATEGORY_MAP = {
    # ── CEREALS & GRAINS ──────────────────────
    # Grains
    2511: "Cereals & Grains",  # Wheat and products
    2513: "Cereals & Grains",  # Barley and products
    2514: "Cereals & Grains",  # Maize and products
    2515: "Cereals & Grains",  # Rye and products
    2516: "Cereals & Grains",  # Oats
    2517: "Cereals & Grains",  # Millet and products
    2518: "Cereals & Grains",  # Sorghum and products
    2520: "Cereals & Grains",  # Cereals, Other
    2807: "Cereals & Grains",  # Rice and products
    # Pulses & beans → Cereals & Grains (as decided)
    2546: "Cereals & Grains",  # Beans
    2547: "Cereals & Grains",  # Peas
    2549: "Cereals & Grains",  # Pulses, Other and products

    # ── OILS ──────────────────────────────────
    # Oil crops (raw)
    2555: "Oils",  # Soyabeans
    2557: "Oils",  # Sunflower seed
    2558: "Oils",  # Rape and Mustardseed
    2559: "Oils",  # Cottonseed
    2560: "Oils",  # Coconuts - Incl Copra
    2561: "Oils",  # Sesame seed
    2562: "Oils",  # Palm kernels
    2563: "Oils",  # Olives (including preserved)
    2570: "Oils",  # Oilcrops, Other
    # Processed oils
    2571: "Oils",  # Soyabean Oil
    2572: "Oils",  # Groundnut Oil
    2573: "Oils",  # Sunflowerseed Oil
    2574: "Oils",  # Rape and Mustard Oil
    2575: "Oils",  # Cottonseed Oil
    2576: "Oils",  # Palmkernel Oil
    2577: "Oils",  # Palm Oil
    2578: "Oils",  # Coconut Oil
    2579: "Oils",  # Sesameseed Oil
    2580: "Oils",  # Olive Oil
    2581: "Oils",  # Ricebran Oil
    2582: "Oils",  # Maize Germ Oil
    2586: "Oils",  # Oilcrops Oil, Other
    # Fish oils → Oils (as decided)
    2781: "Oils",  # Fish, Body Oil
    2782: "Oils",  # Fish, Liver Oil

    # ── SUGAR ─────────────────────────────────
    2536: "Sugar",  # Sugar cane
    2537: "Sugar",  # Sugar beet
    2541: "Sugar",  # Sugar non-centrifugal
    2542: "Sugar",  # Sugar (Raw Equivalent)
    2543: "Sugar",  # Sweeteners, Other
    2745: "Sugar",  # Honey → Sugar (as decided)

    # ── MEAT & FISH ───────────────────────────
    # Meat
    2731: "Meat & Fish",  # Bovine Meat
    2732: "Meat & Fish",  # Mutton & Goat Meat
    2733: "Meat & Fish",  # Pigmeat
    2734: "Meat & Fish",  # Poultry Meat
    2735: "Meat & Fish",  # Meat, Other
    2736: "Meat & Fish",  # Offals, Edible
    2737: "Meat & Fish",  # Fats, Animals, Raw
    # Fish & seafood
    2761: "Meat & Fish",  # Freshwater Fish
    2762: "Meat & Fish",  # Demersal Fish
    2763: "Meat & Fish",  # Pelagic Fish
    2764: "Meat & Fish",  # Marine Fish, Other
    2765: "Meat & Fish",  # Crustaceans
    2766: "Meat & Fish",  # Cephalopods
    2767: "Meat & Fish",  # Molluscs, Other
    2768: "Meat & Fish",  # Meat, Aquatic Mammals
    2769: "Meat & Fish",  # Aquatic Animals, Others
    2775: "Meat & Fish",  # Aquatic Plants

    # ── DAIRY ─────────────────────────────────
    2740: "Dairy",  # Butter, Ghee
    2743: "Dairy",  # Cream
    2744: "Dairy",  # Eggs
    2848: "Dairy",  # Milk - Excluding Butter

    # ── FRUITS & VEG ──────────────────────────
    # Root vegetables & tubers
    2531: "Fruits & Veg",  # Potatoes and products
    2532: "Fruits & Veg",  # Cassava and products
    2533: "Fruits & Veg",  # Sweet potatoes
    2534: "Fruits & Veg",  # Roots, Other
    2535: "Fruits & Veg",  # Yams
    # Vegetables
    2601: "Fruits & Veg",  # Tomatoes and products
    2602: "Fruits & Veg",  # Onions
    2605: "Fruits & Veg",  # Vegetables, other
    # Citrus
    2611: "Fruits & Veg",  # Oranges, Mandarines
    2612: "Fruits & Veg",  # Lemons, Limes and products
    2613: "Fruits & Veg",  # Grapefruit and products
    2614: "Fruits & Veg",  # Citrus, Other
    # Fruit
    2615: "Fruits & Veg",  # Bananas
    2616: "Fruits & Veg",  # Plantains
    2617: "Fruits & Veg",  # Apples and products
    2618: "Fruits & Veg",  # Pineapples and products
    2619: "Fruits & Veg",  # Dates
    2620: "Fruits & Veg",  # Grapes and products (excl wine)
    2625: "Fruits & Veg",  # Fruits, other

    # ── OTHER ─────────────────────────────────
    2551: "Other",  # Nuts and products
    2552: "Other",  # Groundnuts
    2630: "Other",  # Coffee and products
    2633: "Other",  # Cocoa Beans and products
    2635: "Other",  # Tea (including mate)
    2640: "Other",  # Pepper
    2641: "Other",  # Pimento
    2642: "Other",  # Cloves
    2645: "Other",  # Spices, Other
    2655: "Other",  # Wine
    2656: "Other",  # Beer
    2657: "Other",  # Beverages, Fermented
    2658: "Other",  # Beverages, Alcoholic
    2659: "Other",  # Alcohol, Non-Food
    2680: "Other",  # Infant food
    2899: "Other",  # Miscellaneous
}

CATEGORIES = ["Cereals & Grains", "Oils", "Sugar", "Meat & Fish", "Dairy", "Fruits & Veg", "Other"]

def get_category(code):
    return CATEGORY_MAP.get(int(code), "Other")

def load(key):
    path = os.path.join(DATA_DIR, FILES[key])
    print(f"Loading {FILES[key]}...")
    if path.endswith(".csv"):
        # Try different encodings
        for enc in ["utf-8", "latin-1", "cp1252"]:
            try:
                return pd.read_csv(path, encoding=enc, low_memory=False)
            except:
                continue
    else:
        return pd.read_excel(path)

# ─────────────────────────────────────────────
# OUTPUT 1: countries_supply.json
# Country-level import/export/production per category
# Used for: Step 3 country click panel
# ─────────────────────────────────────────────
print("\n=== Building countries_supply.json ===")
try:
    sua = load("sua")
    print(f"  Columns: {list(sua.columns[:10])}")

    # Identify key columns (flexible naming)
    col_map = {}
    for col in sua.columns:
        cl = col.lower().strip()
        if "reporter_country" == cl and "code" not in cl:
            col_map["country"] = col
        elif "reporter_iso" in cl or "iso3" in cl:
            col_map["iso3"] = col
        elif "fbs_item_code" in cl or "item_code" in cl:
            col_map["item_code"] = col
        elif "export" in cl and "quant" in cl:
            col_map["export"] = col
        elif "import" in cl and "quant" in cl:
            col_map["import"] = col
        elif "production" == cl:
            col_map["production"] = col
        elif "domestic" in cl and "supply" in cl:
            col_map["domestic"] = col

    print(f"  Mapped columns: {col_map}")

    sua["category"] = sua[col_map.get("item_code", "fbs_item_code")].apply(get_category)

    group_cols = [col_map.get("iso3", "reporter_iso3"),
                  col_map.get("country", "reporter_country"),
                  "category"]
    group_cols = [c for c in group_cols if c in sua.columns]

    agg_dict = {}
    for k, v in col_map.items():
        if k in ["export", "import", "production", "domestic"] and v in sua.columns:
            agg_dict[v] = "sum"

    agg = sua.groupby(group_cols).agg(agg_dict).reset_index()

    # Rename to standard names
    rename = {}
    for k, v in col_map.items():
        if k == "export":   rename[v] = "export_qty"
        elif k == "import": rename[v] = "import_qty"
        elif k == "production": rename[v] = "production"
        elif k == "domestic": rename[v] = "domestic_supply"
    agg = agg.rename(columns=rename)

    # Build nested JSON: { "UKR": { "Cereals": { export, import, production }, ... } }
    result = {}
    iso_col = col_map.get("iso3", group_cols[0])
    country_col = col_map.get("country", group_cols[1]) if len(group_cols) > 1 else group_cols[0]

    for _, row in agg.iterrows():
        iso = str(row.get(iso_col, "")).strip()
        if not iso or iso == "nan" or len(iso) > 4:
            continue
        country_name = str(row.get(country_col, iso)).strip()
        cat = row["category"]

        if iso not in result:
            result[iso] = {"name": country_name, "categories": {}}

        result[iso]["categories"][cat] = {
            "export_qty":      round(float(row.get("export_qty", 0) or 0)),
            "import_qty":      round(float(row.get("import_qty", 0) or 0)),
            "production":      round(float(row.get("production", 0) or 0)),
            "domestic_supply": round(float(row.get("domestic_supply", 0) or 0)),
        }

    out_path = os.path.join(DATA_DIR, "countries_supply.json")
    with open(out_path, "w") as f:
        json.dump(result, f, separators=(",", ":"))
    print(f"  ✓ Saved {len(result)} countries → countries_supply.json")

except Exception as e:
    print(f"  ✗ Error: {e}")
    import traceback; traceback.print_exc()

# ─────────────────────────────────────────────
# OUTPUT 2: bilateral_trade.json
# Trade flows between countries per category (sea routes only, top flows)
# Used for: Step 3 globe arcs
# ─────────────────────────────────────────────
print("\n=== Building bilateral_trade.json ===")
try:
    bil = load("bilateral")
    print(f"  Columns: {list(bil.columns[:12])}")
    print(f"  Rows: {len(bil)}")

    # Map columns
    bil_map = {}
    for col in bil.columns:
        cl = col.lower().strip()
        if "fbs_item_code" in cl:
            bil_map["item_code"] = col
        elif "reporter_iso" in cl or ("reporter" in cl and "iso" in cl):
            bil_map["reporter_iso"] = col
        elif "reporter_country" in cl and "code" not in cl:
            bil_map["reporter_country"] = col
        elif "partner_iso" in cl or ("partner" in cl and "iso" in cl):
            bil_map["partner_iso"] = col
        elif "partner_country" in cl and "code" not in cl:
            bil_map["partner_country"] = col
        elif "export_quantity" in cl or ("export" in cl and "quant" in cl):
            bil_map["export_qty"] = col
        elif "sea" in cl or "maritime" in cl:
            bil_map["sea_pct"] = col
        elif "val_per_ton" in cl or "value_per" in cl:
            bil_map["value_per_ton"] = col

    print(f"  Mapped columns: {bil_map}")

    bil["category"] = bil[bil_map.get("item_code", "fbs_item_code")].apply(get_category)

    # Filter to sea routes only if sea column exists
    if "sea_pct" in bil_map:
        bil_sea = bil[bil[bil_map["sea_pct"]] > 0.3].copy()
        print(f"  Sea routes (>30%): {len(bil_sea)} rows")
    else:
        bil_sea = bil.copy()
        print("  No sea column found — using all routes")

    # Aggregate by reporter → partner → category
    grp = [
        bil_map.get("reporter_iso", "reporter_iso3"),
        bil_map.get("reporter_country", "reporter_country"),
        bil_map.get("partner_iso", "partner_iso3"),
        bil_map.get("partner_country", "partner_country"),
        "category"
    ]
    grp = [c for c in grp if c in bil_sea.columns]

    agg_bil = bil_sea.groupby(grp)[bil_map.get("export_qty", "export_quantity")].sum().reset_index()
    agg_bil.columns = [*grp[:-1], "category", "export_qty"] if len(grp) == 5 else [*grp, "export_qty"]

    # Keep top flows per category (above 1000 tonnes to reduce file size)
    agg_bil = agg_bil[agg_bil["export_qty"] > 1000]

    # Build list of arc objects
    arcs = []
    rep_iso = bil_map.get("reporter_iso", grp[0])
    rep_name = bil_map.get("reporter_country", grp[1]) if len(grp) > 4 else grp[0]
    par_iso = bil_map.get("partner_iso", grp[2]) if len(grp) > 2 else grp[1]
    par_name = bil_map.get("partner_country", grp[3]) if len(grp) > 3 else grp[2]

    for _, row in agg_bil.iterrows():
        r_iso = str(row.get(rep_iso, "")).strip()
        p_iso = str(row.get(par_iso, "")).strip()
        if not r_iso or not p_iso or r_iso == "nan" or p_iso == "nan":
            continue
        arcs.append({
            "from":     r_iso,
            "from_name": str(row.get(rep_name, r_iso)).strip(),
            "to":       p_iso,
            "to_name":  str(row.get(par_name, p_iso)).strip(),
            "category": row["category"],
            "qty":      round(float(row.get("export_qty", 0) or 0)),
        })

    out_path = os.path.join(DATA_DIR, "bilateral_trade.json")
    with open(out_path, "w") as f:
        json.dump(arcs, f, separators=(",", ":"))
    print(f"  ✓ Saved {len(arcs)} trade arcs → bilateral_trade.json")

except Exception as e:
    print(f"  ✗ Error: {e}")
    import traceback; traceback.print_exc()

# ─────────────────────────────────────────────
# OUTPUT 3: nutrition_by_country.json
# Calories + macros per country per category
# Used for: Step 3 nutrition modal
# ─────────────────────────────────────────────
print("\n=== Building nutrition_by_country.json ===")
try:
    nut = load("nutrition")
    print(f"  Columns: {list(nut.columns[:10])}")

    nut_map = {}
    for col in nut.columns:
        cl = col.lower().strip()
        if "reporter_iso" in cl or "iso3" in cl:
            nut_map["iso3"] = col
        elif "reporter_country" in cl and "code" not in cl:
            nut_map["country"] = col
        elif "fbs_item_code" in cl:
            nut_map["item_code"] = col
        elif "energy" in cl or "kcal" in cl:
            nut_map["energy"] = col
        elif "protein" in cl:
            nut_map["protein"] = col
        elif "fat" in cl:
            nut_map["fat"] = col
        elif "carb" in cl:
            nut_map["carbs"] = col

    print(f"  Mapped columns: {nut_map}")

    nut["category"] = nut[nut_map.get("item_code", "fbs_item_code")].apply(get_category)

    grp = [nut_map.get("iso3", "reporter_iso3"), "category"]
    grp = [c for c in grp if c in nut.columns]

    agg_dict = {}
    for k in ["energy", "protein", "fat", "carbs"]:
        if k in nut_map and nut_map[k] in nut.columns:
            agg_dict[nut_map[k]] = "sum"

    agg_nut = nut.groupby(grp).agg(agg_dict).reset_index()

    result_nut = {}
    iso_col = nut_map.get("iso3", grp[0])

    for _, row in agg_nut.iterrows():
        iso = str(row.get(iso_col, "")).strip()
        if not iso or iso == "nan":
            continue
        cat = row["category"]
        if iso not in result_nut:
            result_nut[iso] = {}

        entry = {}
        for k, v in nut_map.items():
            if k in ["energy", "protein", "fat", "carbs"] and v in agg_nut.columns:
                entry[k] = round(float(row.get(v, 0) or 0), 2)
        result_nut[iso][cat] = entry

    out_path = os.path.join(DATA_DIR, "nutrition_by_country.json")
    with open(out_path, "w") as f:
        json.dump(result_nut, f, separators=(",", ":"))
    print(f"  ✓ Saved {len(result_nut)} countries → nutrition_by_country.json")

except Exception as e:
    print(f"  ✗ Error: {e}")
    import traceback; traceback.print_exc()

# ─────────────────────────────────────────────
# OUTPUT 4: fao_price_index.json
# Monthly price index per food category 1990–2026
# Used for: Step 4 timeline chart
# ─────────────────────────────────────────────
print("\n=== Building fao_price_index.json ===")
try:
    fao = load("fao_price")
    print(f"  Columns: {list(fao.columns)}")
    print(f"  Rows: {len(fao)}")

    # Find the date column and category columns
    date_col = None
    for col in fao.columns:
        if "date" in col.lower() or "year" in col.lower() or "month" in col.lower():
            date_col = col
            break

    if date_col is None:
        date_col = fao.columns[0]

    print(f"  Date column: {date_col}")

    # Map category columns flexibly
    price_cols = {}
    for col in fao.columns:
        cl = col.lower().strip()
        if "food" in cl and "price" in cl:
            price_cols["Food Price Index"] = col
        elif "meat" in cl:
            price_cols["Meat"] = col
        elif "dairy" in cl:
            price_cols["Dairy"] = col
        elif "cereal" in cl or "grain" in cl:
            price_cols["Cereals & Grains"] = col
        elif "oil" in cl or "fat" in cl:
            price_cols["Oils"] = col
        elif "sugar" in cl:
            price_cols["Sugar"] = col
        elif "meat" in cl:
            price_cols["Meat & Fish"] = col

    print(f"  Price columns: {price_cols}")

    # Clean and filter — only keep rows with valid dates
    fao = fao.dropna(subset=[date_col])
    fao[date_col] = fao[date_col].astype(str).str.strip()

    # Build records
    records = []
    for _, row in fao.iterrows():
        date_val = str(row[date_col]).strip()
        if not date_val or date_val == "nan":
            continue
        record = {"date": date_val}
        for cat, col in price_cols.items():
            try:
                val = float(row[col])
                record[cat] = round(val, 2)
            except:
                record[cat] = None
        records.append(record)

    # Crisis events hardcoded
    crisis_events = [
        {
            "id": 1,
            "start": "2007-09",
            "end": "2008-09",
            "label": "Global Food Crisis",
            "commodities": ["Cereals & Grains", "Oils"],
            "description": "Oil price surge, biofuel demand, and Australian drought caused the first major 21st century food crisis. Food riots in 30+ countries.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
        {
            "id": 2,
            "start": "2010-07",
            "end": "2015-02",
            "label": "Sustained Price Shock",
            "commodities": ["Cereals & Grains", "Oils", "Sugar"],
            "description": "Russian drought and wheat export ban (2010), Arab Spring food unrest (2011), prolonged global supply tightness through 2014.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
        {
            "id": 3,
            "start": "2020-10",
            "end": "2021-06",
            "label": "COVID Supply Shock",
            "commodities": ["Oils", "Sugar"],
            "description": "Pandemic disrupted global logistics, labour shortages hit harvests, and panic buying inflated demand across supply chains.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
        {
            "id": 4,
            "start": "2022-03",
            "end": "2022-12",
            "label": "Ukraine War",
            "commodities": ["Cereals & Grains", "Oils"],
            "description": "Russia invaded Ukraine in February 2022. Together they supply ~30% of global wheat and ~60% of sunflower oil. Biggest single-month spike in the dataset.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
        {
            "id": 5,
            "start": "2024-01",
            "end": "2026-03",
            "label": "Red Sea & Iran Conflict",
            "commodities": ["Oils", "Cereals & Grains", "Sugar"],
            "description": "Houthi Red Sea attacks from late 2023, escalating to US-Israel strikes on Iran and effective Hormuz closure in February 2026. Fertiliser, oils and sugar badly affected.",
            "articles": [
                {"title": "Add article title here", "url": "#", "source": "Add source"},
                {"title": "Add article title here", "url": "#", "source": "Add source"},
            ]
        },
    ]

    output = {
        "prices": records,
        "crisis_events": crisis_events,
        "categories": list(price_cols.keys()),
    }

    out_path = os.path.join(DATA_DIR, "fao_price_index.json")
    with open(out_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))
    print(f"  ✓ Saved {len(records)} monthly records + {len(crisis_events)} crisis events → fao_price_index.json")

except Exception as e:
    print(f"  ✗ Error: {e}")
    import traceback; traceback.print_exc()

# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────
print("\n=== DONE ===")
print("Files written to:", DATA_DIR)
print("""
Output files:
  countries_supply.json      → Step 3 country panel (import/export/production)
  bilateral_trade.json       → Step 3 globe arcs (trade flows)
  nutrition_by_country.json  → Step 3 calorie modal
  fao_price_index.json       → Step 4 timeline + crisis events

Next step:
  Place your countries.geojson in the same folder
  then run: npm create vite@latest food-shock -- --template react
""")
