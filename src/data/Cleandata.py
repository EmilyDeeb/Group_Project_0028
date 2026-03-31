"""
Food Shock — Unique FBS Items Extractor
========================================
Reads all 4 data files, extracts every unique fbs_item name,
and saves one combined CSV with a blank 'category' column.

You fill in the category column in Excel, then share it back.

Run:
    cd C:\\Users\\emily\\OneDrive\\Desktop\\CASA_MSc_Desktop\\MSc_Term02\\Group_Project_0028\\src\\data
    python extract_unique_items.py

Output:
    unique_fbs_items.csv   ← open in Excel, fill in 'category' column
"""

import pandas as pd
import os

DATA_DIR = r"C:\Users\emily\OneDrive\Desktop\CASA_MSc_Desktop\MSc_Term02\Group_Project_0028\src\data"

FILES = {
    "bilateral": "foodgroup1_2020bilateraltradebymodality_withexportcoeff.csv",
    "sua":       "foodgroup1_SUA_exportcoeff.csv",
    "nutrition": "foodgroup1_tradenutritionconversions_bycountry_byitem.csv",
    "supply":    "foodgroup1_totalsupply_utilization_admin1.csv",
}

def load_csv(path):
    for enc in ["utf-8", "latin-1", "cp1252"]:
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False)
        except:
            continue
    return None

def find_item_cols(df):
    code_col, name_col = None, None
    for col in df.columns:
        cl = col.lower().strip()
        if cl == "fbs_item_code" or cl == "item_code":
            code_col = col
        if cl == "fbs_item" or cl == "item":
            name_col = col
    if code_col is None:
        for col in df.columns:
            if "item_code" in col.lower():
                code_col = col
                break
    if name_col is None:
        for col in df.columns:
            if "fbs_item" in col.lower() and "code" not in col.lower():
                name_col = col
                break
    return code_col, name_col

# Collect all unique (code, name) pairs across all files
all_items = {}  # code -> {name, found_in}

for key, fname in FILES.items():
    path = os.path.join(DATA_DIR, fname)
    if not os.path.exists(path):
        print(f"⚠ Not found: {fname}")
        continue

    print(f"Reading {fname}...")
    df = load_csv(path)
    if df is None:
        print(f"  ⚠ Could not load")
        continue

    code_col, name_col = find_item_cols(df)
    if code_col is None and name_col is None:
        print(f"  ⚠ No item columns found. Columns: {list(df.columns)}")
        continue

    print(f"  Code col: {code_col} | Name col: {name_col}")

    cols = [c for c in [code_col, name_col] if c]
    unique = df[cols].drop_duplicates()

    for _, row in unique.iterrows():
        code = str(row[code_col]).strip() if code_col else "unknown"
        name = str(row[name_col]).strip() if name_col else "unknown"
        if code not in all_items:
            all_items[code] = {"name": name, "found_in": set()}
        all_items[code]["found_in"].add(key)

# Build dataframe
rows = []
for code, info in sorted(all_items.items(), key=lambda x: x[0]):
    rows.append({
        "fbs_item_code": code,
        "fbs_item":      info["name"],
        "found_in":      ", ".join(sorted(info["found_in"])),
        "category":      ""   # ← YOU FILL THIS IN
    })

result = pd.DataFrame(rows)

out_path = os.path.join(DATA_DIR, "unique_fbs_items.csv")
result.to_csv(out_path, index=False)

print(f"\n✓ Done — {len(result)} unique items saved to unique_fbs_items.csv")
print(f"\nNext steps:")
print(f"  1. Open unique_fbs_items.csv in Excel")
print(f"  2. Fill in the 'category' column for each row using:")
print(f"       Cereals & Grains")
print(f"       Oils")
print(f"       Sugar")
print(f"       Meat & Fish")
print(f"       Dairy")
print(f"       Fruits & Veg")
print(f"       Other")
print(f"  3. Share the filled CSV back")
print(f"\nCategory counts so far: {len(result)} items to categorise")
