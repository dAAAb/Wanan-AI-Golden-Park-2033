#!/usr/bin/env python3
"""Fetch OpenStreetMap data around Taipei Songshan Airport via Overpass (gzip JSON)."""
import gzip, json, os, time, requests

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
S, W, N, E = 25.026, 121.512, 25.098, 121.602
UA = {"User-Agent": "WananAIGoldenParkBot/1.0 (https://github.com/dAAAb/Wanan-AI-Golden-Park-2033)"}

def run(name, body):
    q = f"[out:json][timeout:600][maxsize:1073741824];\n{body}\nout tags geom qt;"
    for attempt in range(3):
        for ep in ENDPOINTS:
            try:
                print(name, "->", ep, flush=True)
                r = requests.post(ep, data={"data": q}, headers=UA, timeout=900)
                if r.status_code == 200 and r.text.lstrip().startswith("{"):
                    d = r.json()
                    print(name, "elements", len(d.get("elements", [])), flush=True)
                    with gzip.open(f"research/osm/{name}.json.gz", "wt", encoding="utf-8") as f:
                        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
                    return True
                print("status", r.status_code, r.text[:200])
            except Exception as e:
                print("err", e)
            time.sleep(10)
        time.sleep(30 * (attempt + 1))
    return False

def main():
    os.makedirs("research/osm", exist_ok=True)
    bb = f"({S},{W},{N},{E})"
    run("features", f"""(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|residential|unclassified|living_street|pedestrian|service)$"]{bb};
  way["natural"~"^(water|wood|scrub|grassland)$"]{bb}; relation["natural"="water"]{bb};
  way["waterway"~"^(riverbank|river|canal|stream)$"]{bb}; relation["water"]{bb}; way["water"]{bb};
  way["leisure"~"^(park|garden|golf_course|pitch|stadium|nature_reserve)$"]{bb}; relation["leisure"~"^(park|golf_course|nature_reserve)$"]{bb};
  way["landuse"~"^(grass|forest|recreation_ground|cemetery|military|meadow)$"]{bb}; relation["landuse"~"^(forest|military)$"]{bb};
  way["aeroway"]{bb}; relation["aeroway"]{bb}; node["aeroway"]{bb};
  way["railway"~"^(rail|subway|light_rail|monorail)$"]{bb};
  node["tourism"~"^(attraction|museum|hotel|viewpoint)$"]{bb};
  node["amenity"~"^(university|college)$"]{bb};
  node["place"~"^(suburb|neighbourhood|quarter)$"]{bb};
  node["railway"="station"]{bb};
);""")
    # buildings in 4 tiles to keep Overpass happy
    lat_mid, lon_mid = (S + N) / 2, (W + E) / 2
    tiles = [(S, W, lat_mid, lon_mid), (S, lon_mid, lat_mid, E), (lat_mid, W, N, lon_mid), (lat_mid, lon_mid, N, E)]
    for i, (s, w, n, e) in enumerate(tiles):
        run(f"buildings_{i}", f'(way["building"]({s},{w},{n},{e}); relation["building"]({s},{w},{n},{e}); way["building:part"]({s},{w},{n},{e}););')

if __name__ == "__main__":
    main()
