"""Read-only census of the public SitePages contract; no credentials or writes."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import sys

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
sites = [("vendefacil", "vendefacil.1platform.pro", ["es"]), ("medipago", "medipago.gt", ["es"]), ("oneplatform", "1platform.pro", ["en", "es"])]


def read(item):
    env, base, slug, host, locales = item
    results = []
    for suffix, route in [(f"byhost-{host}", f"/sites/by-host?host={host}"), (f"reviews-{slug}", f"/sites/{slug}/reviews"), *[(f"pages-{slug}-{loc}", f"/sites/{slug}/pages?locale={loc}") for loc in locales]]:
        path = out / f"{env}-{suffix}.json"
        result = subprocess.run(["curl", "--silent", "--show-error", "--max-time", "30", "--output", str(path), "--write-out", "%{http_code}", base + "/api/v1" + route], capture_output=True, text=True, check=True)
        record = {"environment": env, "route": route, "status": int(result.stdout), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        if result.stdout == "200":
            data = json.loads(path.read_text())["data"]
            record["shape"] = sorted(data)
            if "pages" in data and isinstance(data["pages"], list) and data["pages"] and isinstance(data["pages"][0], dict):
                record["pages"] = [{"route": p["route"], "locale": p["locale"], "keys": len(p["blocks"])} for p in data["pages"]]
        print(env, suffix, result.stdout, flush=True)
        results.append(record)
    return results


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    records = [r for group in pool.map(read, [(env, base, *site) for env, base in [("prod", "https://api.1platform.pro"), ("qa", "https://api-qa.1platform.pro")] for site in sites]) for r in group]
(out / "census.json").write_text(json.dumps(records, indent=2) + "\n")
assert all(r["status"] == 200 for r in records if r["environment"] == "prod"), "Production census incomplete"
