"""
Fix countries_supply.json — rekey by ISO3 code instead of country name
Run from your data folder:
    cd C:\\Users\\emily\\OneDrive\\Desktop\\CASA_MSc_Desktop\\MSc_Term02\\Group_Project_0028\\src\\data
    python fix_supply_keys.py
"""
import json
import os

DATA_DIR = r"C:\Users\emily\OneDrive\Desktop\CASA_MSc_Desktop\MSc_Term02\Group_Project_0028\src\data"
PUBLIC_DIR = r"C:\Users\emily\OneDrive\Desktop\CASA_MSc_Desktop\MSc_Term02\Group_Project_0028\food-shock\public\data"

# Load existing file
in_path = os.path.join(DATA_DIR, "countries_supply.json")
with open(in_path, encoding="utf-8") as f:
    data = json.load(f)

print(f"Loaded {len(data)} entries")
print(f"Sample keys: {list(data.keys())[:10]}")

# Check what the keys look like
sample_key = list(data.keys())[0]
sample_val = data[sample_key]
print(f"\nSample entry key: '{sample_key}'")
print(f"Sample entry value keys: {list(sample_val.keys())}")

# The issue: keys might be country names OR iso codes
# Check if there's an iso field inside each entry
if "iso" in sample_val or "iso3" in sample_val:
    # Rekey by iso
    iso_field = "iso" if "iso" in sample_val else "iso3"
    new_data = {}
    for k, v in data.items():
        iso = v.get(iso_field, "").strip().upper()
        if iso and len(iso) == 3:
            new_data[iso] = v
        else:
            new_data[k] = v  # keep original key if no iso found
    print(f"\nRekeyed by '{iso_field}' field")
else:
    # Keys ARE the iso codes already or country names
    # Check if keys look like ISO codes (3 uppercase letters)
    iso_like = sum(1 for k in data.keys() if len(k) == 3 and k.isupper())
    name_like = sum(1 for k in data.keys() if len(k) > 3)

    print(f"\nISO-like keys: {iso_like}")
    print(f"Name-like keys: {name_like}")

    if name_like > iso_like:
        print("Keys appear to be country NAMES — need to fix aggregation script")
        print("\nChecking if reporter_iso3 column exists in SUA file...")

        # Try to rebuild from SUA CSV directly
        import pandas as pd

        sua_path = os.path.join(DATA_DIR, "foodgroup1_SUA_exportcoeff.csv")
        for enc in ["utf-8", "latin-1", "cp1252"]:
            try:
                sua = pd.read_csv(sua_path, encoding=enc, low_memory=False)
                break
            except:
                continue

        print(f"SUA columns: {list(sua.columns[:15])}")

        # Find iso column
        iso_col = None
        name_col = None
        for col in sua.columns:
            cl = col.lower()
            if "reporter_iso" in cl or (cl == "iso3c" or cl == "iso3"):
                iso_col = col
            if "reporter_country" == cl:
                name_col = col

        print(f"ISO column found: {iso_col}")
        print(f"Name column found: {name_col}")

        if iso_col:
            # Show sample mapping
            sample = sua[[name_col, iso_col]].drop_duplicates().head(10) if name_col else sua[[iso_col]].drop_duplicates().head(10)
            print(f"\nSample ISO mapping:")
            print(sample.to_string())

            # Build name->iso lookup
            if name_col:
                lookup = dict(zip(sua[name_col].str.strip(), sua[iso_col].str.strip()))
                new_data = {}
                matched = 0
                unmatched = []
                for name, val in data.items():
                    iso = lookup.get(name, "").strip().upper() if isinstance(lookup.get(name), str) else ""
                    if iso and len(iso) == 3:
                        new_data[iso] = val
                        new_data[iso]["name"] = name
                        matched += 1
                    else:
                        unmatched.append(name)
                        new_data[name] = val  # keep as-is

                print(f"\nMatched: {matched} / {len(data)}")
                if unmatched:
                    print(f"Unmatched (kept as-is): {unmatched[:10]}")
            else:
                new_data = data
        else:
            print("Could not find ISO column — keeping original data")
            new_data = data
    else:
        print("Keys already look like ISO codes")
        new_data = data

# Save fixed version
for out_dir in [DATA_DIR, PUBLIC_DIR]:
    if os.path.exists(out_dir):
        out_path = os.path.join(out_dir, "countries_supply.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(new_data, f, separators=(",", ":"))
        print(f"\n✓ Saved to {out_path}")
        print(f"  Keys sample: {list(new_data.keys())[:10]}")
