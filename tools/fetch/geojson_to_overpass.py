#!/usr/bin/env python3
"""Convert `osmium export -f geojsonseq` output into Overpass-style JSON (ways/nodes with inline geometry)
so tools/build/build_city.py can consume it. Multipolygons become one closed way per outer ring."""
import gzip, json, os, sys

src, outdir = sys.argv[1], sys.argv[2]
os.makedirs(outdir, exist_ok=True)
KEEP = ("aeroway", "highway", "natural", "waterway", "water", "leisure", "landuse", "railway", "tourism", "amenity", "place")
feats, blds = [], []
n = 0
with open(src, encoding="utf-8") as f:
    for line in f:
        line = line.strip().lstrip("\x1e")
        if not line: continue
        ft = json.loads(line)
        props = ft.get("properties") or {}
        tags = {k: v for k, v in props.items() if not k.startswith("@")}
        g = ft.get("geometry") or {}
        typ = g.get("type")
        is_b = "building" in tags or "building:part" in tags
        if not is_b and not any(k in tags for k in KEEP): continue
        n += 1
        def ring(coords): return [{"lat": c[1], "lon": c[0]} for c in coords]
        out = []
        if typ == "Point":
            out.append({"type": "node", "id": n, "lat": g["coordinates"][1], "lon": g["coordinates"][0], "tags": tags})
        elif typ == "LineString":
            out.append({"type": "way", "id": n, "geometry": ring(g["coordinates"]), "tags": tags})
        elif typ == "Polygon":
            out.append({"type": "way", "id": n, "geometry": ring(g["coordinates"][0]), "tags": tags})
        elif typ == "MultiPolygon":
            for i, poly in enumerate(g["coordinates"]):
                out.append({"type": "way", "id": n * 1000 + i, "geometry": ring(poly[0]), "tags": tags})
        elif typ == "MultiLineString":
            for i, ln in enumerate(g["coordinates"]):
                out.append({"type": "way", "id": n * 1000 + i, "geometry": ring(ln), "tags": tags})
        (blds if is_b else feats).extend(out)
for name, els in (("features", feats), ("buildings_pbf", blds)):
    with gzip.open(f"{outdir}/{name}.json.gz", "wt", encoding="utf-8") as f:
        json.dump({"elements": els}, f, ensure_ascii=False, separators=(",", ":"))
    print(name, len(els))
