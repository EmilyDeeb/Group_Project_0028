"""
Food Shock — Data Aggregation Script (FIXED)
============================================
Verified column names from actual CSV files:

bilateral:  fbs_item_code, reporter_ISO3, reporter_country,
            partner_iso3, partner_country, export_quantity,
            share_sea_predict, reporter_country_code, partner_country_code

SUA:        reporter_country_code, reporter_country, fbs_item_code,
            Export Quantity, Import Quantity, Production,
            Domestic supply quantity

supply:     admin1, iso3c, fbs_item, domestic supply quantity,
            food demand, losses, production, stock variation, pct_loss

nutrition:  reporter_country_code, reporter_country, fbs_item_code,
            Energy (kcal), Protein (kg), Fat (kg), Carbs (kg)

FAO price:  row 1 = title, row 2 = subtitle, row 3 = blank,
            row 4 = header: Date, Food Price Index, Meat, Dairy,
                            Cereals, Oils, Sugar

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
# bilateral has reporter_country_code ↔ reporter_ISO3
# SUA only has reporter_country_code, no ISO
# So we build lookup from bilateral then join to SUA
# ═══════════════════════════════════════════════════════
print("\n=== STEP 0: Building ISO lookup ===")
bil_raw = load_csv(os.path.join(DATA_DIR, FILES["bilateral"]))

code_to_iso  = {}
code_to_name = {}

# From reporter side
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

# From partner side
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
# OUTPUT 1: countries_supply.json
# Source: SUA file
# Columns used:
#   reporter_country_code → join to ISO lookup
#   Export Quantity, Import Quantity,
#   Production, Domestic supply quantity
# ═══════════════════════════════════════════════════════
print("\n=== OUTPUT 1: countries_supply.json ===")
try:
    sua = load_csv(os.path.join(DATA_DIR, FILES["sua"]))
    print(f"  SUA rows: {len(sua)}")
    print(f"  SUA cols: {list(sua.columns)}")

    # Add category and ISO
    sua["category"] = sua["fbs_item_code"].apply(get_category)
    sua["iso3"]     = sua["reporter_country_code"].apply(
        lambda x: code_to_iso.get(int(x), None) if pd.notna(x) else None
    )

    # Keep only rows with a known ISO
    sua_ok = sua[sua["iso3"].notna()].copy()
    # Exclude "World" (code 1) — it's a global aggregate not a country
    sua_ok = sua_ok[sua_ok["iso3"] != "nan"]
    print(f"  Rows with ISO (excl World): {len(sua_ok)}")

    # Aggregate by ISO + category
    agg = sua_ok.groupby(["iso3", "category"]).agg(
        export_qty      = ("Export Quantity",          "sum"),
        import_qty      = ("Import Quantity",          "sum"),
        production      = ("Production",               "sum"),
        domestic_supply = ("Domestic supply quantity", "sum"),
    ).reset_index()

    # Build result dict keyed by ISO3
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
    print(f"  Sample ISO keys: {list(result.keys())[:10]}")

    # Spot check
    for chk in ["UKR", "GBR", "USA", "CHN"]:
        if chk in result:
            c = result[chk]["categories"].get("Cereals & Grains", {})
            print(f"  {chk} Cereals → export:{c.get('export_qty',0):,} import:{c.get('import_qty',0):,}")

    save_json(result, "countries_supply.json")

except Exception as e:
    import traceback; traceback.print_exc()

# ═══════════════════════════════════════════════════════
# OUTPUT 2: bilateral_trade.json
# Source: bilateral file
# Columns: reporter_ISO3, partner_iso3,
#          export_quantity, share_sea_predict, category
# ═══════════════════════════════════════════════════════
print("\n=== OUTPUT 2: bilateral_trade.json ===")
try:
    bil = bil_raw.copy()
    bil["category"] = bil["fbs_item_code"].apply(get_category)

    # Sea routes only (share_sea_predict > 0.3)
    bil_sea = bil[bil["share_sea_predict"] > 0.3].copy()
    print(f"  Sea route rows: {len(bil_sea)}")

    # Aggregate by reporter → partner → category
    agg_bil = bil_sea.groupby([
        "reporter_ISO3", "reporter_country",
        "partner_iso3",  "partner_country",
        "category"
    ])["export_quantity"].sum().reset_index()

    # Drop tiny flows
    agg_bil = agg_bil[agg_bil["export_quantity"] > 1000]
    print(f"  Flows > 1000t: {len(agg_bil)}")

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
# OUTPUT 3: nutrition_by_country.json
# Source: nutrition file
# Columns: reporter_country_code, fbs_item_code,
#          Energy (kcal), Protein (kg), Fat (kg), Carbs (kg)
# ═══════════════════════════════════════════════════════
print("\n=== OUTPUT 3: nutrition_by_country.json ===")
try:
    nut = load_csv(os.path.join(DATA_DIR, FILES["nutrition"]))
    print(f"  Nutrition cols: {list(nut.columns[:8])}")

    # Add ISO and category
    nut["iso3"]     = nut["reporter_country_code"].apply(
        lambda x: code_to_iso.get(int(x), None) if pd.notna(x) else None
    )
    nut["category"] = nut["fbs_item_code"].apply(get_category)
    nut_ok = nut[nut["iso3"].notna()].copy()

    # Column names from your sample:
    # Energy (kcal), Protein (kg), Fat (kg), Carbs (kg)
    eng_col  = "Energy (kcal)"
    pro_col  = "Protein (kg)"
    fat_col  = "Fat (kg)"
    carb_col = "Carbs (kg)"

    # Check columns exist
    available = {k: v for k, v in {
        "energy": eng_col, "protein": pro_col,
        "fat": fat_col, "carbs": carb_col
    }.items() if v in nut_ok.columns}
    print(f"  Available nutrition cols: {available}")

    agg_nut = nut_ok.groupby(["iso3", "category"]).agg(
        **{k: (v, "sum") for k, v in available.items()}
    ).reset_index()

    result_nut = {}
    for _, row in agg_nut.iterrows():
        iso = str(row["iso3"]).strip()
        if not iso or iso == "nan":
            continue
        cat = row["category"]
        if iso not in result_nut:
            result_nut[iso] = {}
        result_nut[iso][cat] = {
            k: round(float(row.get(k, 0) or 0), 2)
            for k in available.keys()
        }

    print(f"  Countries: {len(result_nut)}")
    save_json(result_nut, "nutrition_by_country.json")

except Exception as e:
    import traceback; traceback.print_exc()

# ═══════════════════════════════════════════════════════
# OUTPUT 4: fao_price_index.json
# FAO CSV structure:
#   Row 1: "FAO Food Price Index,..."  (title)
#   Row 2: "2014-2016=100,..."         (subtitle)
#   Row 3: blank
#   Row 4: Date, Food Price Index, Meat, Dairy, Cereals, Oils, Sugar
#   Row 5+: data
# So skiprows=3 gets us to the header on row 4
# ═══════════════════════════════════════════════════════
print("\n=== OUTPUT 4: fao_price_index.json ===")
try:
    fao_path = os.path.join(DATA_DIR, FILES["fao_price"])
    fao = pd.read_csv(fao_path, skiprows=3, header=0, encoding="utf-8")
    fao.columns = [str(c).strip() for c in fao.columns]
    fao = fao.dropna(how="all")
    print(f"  FAO cols: {list(fao.columns[:8])}")
    print(f"  FAO rows: {len(fao)}")
    print(f"  First date: {fao.iloc[0, 0]}")

    # Map our category labels to actual column names
    # From your file: Date, Food Price Index, Meat, Dairy, Cereals, Oils, Sugar
    col_map = {
        "Food Price Index": "Food Price Index",
        "Cereals & Grains": "Cereals",
        "Oils":             "Oils",
        "Sugar":            "Sugar",
        "Meat & Fish":      "Meat",
        "Dairy":            "Dairy",
    }

    # Filter to only columns that exist
    col_map = {k: v for k, v in col_map.items() if v in fao.columns}
    print(f"  Matched price cols: {col_map}")

    date_col = fao.columns[0]  # "Date"

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
    print(f"  Date range: {records[0]['date']} → {records[-1]['date']}")

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
print(f"Check public/data/ folder — all 4 JSON files should be updated")