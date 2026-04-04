"""
Pure Python GeoJSON simplifier — no geopandas, no PROJ
Uses Ramer-Douglas-Peucker algorithm directly on coordinates

Run:
    python simplify_geojson.py
"""

import json
import os
import math

INPUT  = r"C:\Users\emily\OneDrive\Desktop\CASA_MSc_Desktop\MSc_Term02\Group_Project_0028\src\data\countries.geojson"
OUTPUT = r"C:\Users\emily\OneDrive\Desktop\CASA_MSc_Desktop\MSc_Term02\Group_Project_0028\public\data\countries.geojson"

TOLERANCE = 0.05  # degrees — increase for more simplification

def point_line_distance(point, start, end):
    if start == end:
        return math.hypot(point[0] - start[0], point[1] - start[1])
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    n = abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0])
    d = math.hypot(dx, dy)
    return n / d if d > 0 else 0

def rdp(points, tolerance):
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    max_dist, max_idx = 0, 0
    for i in range(1, len(points) - 1):
        dist = point_line_distance(points[i], start, end)
        if dist > max_dist:
            max_dist, max_idx = dist, i
    if max_dist > tolerance:
        left  = rdp(points[:max_idx + 1], tolerance)
        right = rdp(points[max_idx:], tolerance)
        return left[:-1] + right
    return [start, end]

def simplify_coords(coords, tolerance):
    if not coords or not isinstance(coords[0], list):
        return coords
    if isinstance(coords[0][0], list):
        return [simplify_coords(ring, tolerance) for ring in coords]
    simplified = rdp(coords, tolerance)
    # Ensure ring closure for polygons
    if len(simplified) < 4:
        return coords  # keep original if too small
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return simplified

def simplify_geometry(geom, tolerance):
    if not geom:
        return geom
    t = geom["type"]
    c = geom["coordinates"]
    if t == "Polygon":
        return {"type": t, "coordinates": simplify_coords(c, tolerance)}
    elif t == "MultiPolygon":
        return {"type": t, "coordinates": [simplify_coords(poly, tolerance) for poly in c]}
    return geom  # Point, LineString etc — return as-is

print(f"Loading {INPUT}...")
with open(INPUT, encoding="utf-8") as f:
    geo = json.load(f)

total = len(geo["features"])
print(f"  {total} features loaded")
print(f"  Sample properties: {list(geo['features'][0]['properties'].keys())}")

print(f"\nSimplifying with tolerance={TOLERANCE}...")
simplified_features = []
for i, feature in enumerate(geo["features"]):
    if i % 50 == 0:
        print(f"  {i}/{total}...")
    feat = {
        "type": "Feature",
        "properties": feature["properties"],  # keep ALL properties
        "geometry": simplify_geometry(feature.get("geometry"), TOLERANCE)
    }
    simplified_features.append(feat)

result = {
    "type": "FeatureCollection",
    "features": simplified_features
}

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
print(f"\nSaving to {OUTPUT}...")
with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(result, f, separators=(",", ":"))

size_in  = os.path.getsize(INPUT)  / 1_000_000
size_out = os.path.getsize(OUTPUT) / 1_000_000
print(f"\n✓ Done!")
print(f"  Input:  {size_in:.1f} MB")
print(f"  Output: {size_out:.1f} MB")
print(f"  Reduction: {100 - (size_out/size_in*100):.0f}%")
print(f"\nCheck properties are preserved:")
with open(OUTPUT, encoding="utf-8") as f:
    check = json.load(f)
print(f"  Features: {len(check['features'])}")
print(f"  Properties: {list(check['features'][0]['properties'].keys())}")