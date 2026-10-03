"""Real HTTP/auth/Mongo acceptance. Requires the monorepo BANCO OK gate first.

Run from the isolated API cwd/venv with its private environment. JWTs are signed
with the bank's own key; app sessions go through the real token endpoint. No auth
dependency is replaced. Secrets/snapshots stay in --bench (0700), never stdout.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlparse

import httpx
import jwt
from pymongo import MongoClient

sys.path.insert(0, os.getcwd())
from tests.bench.bench_guard import assert_bench_target

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("action", choices=["snapshot", "apply", "security", "rollback"])
p.add_argument("--bench", type=Path, required=True)
p.add_argument("--website", type=Path, required=True)
p.add_argument("--api", default="http://127.0.0.1:8710")
p.add_argument("--port", type=int, default=5021)
a = p.parse_args()
assert urlparse(a.api).hostname == "127.0.0.1" and a.port != 4321
assert_bench_target(os.environ["MONGODB_URL"], os.environ["MONGODB_DB_NAME"])
assert os.environ["MONGODB_DB_NAME"] == "e2e_vendefacil_servicios_uniformes"
db = MongoClient(os.environ["MONGODB_URL"])[os.environ["MONGODB_DB_NAME"]]
http = httpx.Client(base_url=a.api + "/api/v1", timeout=30)
seed = json.loads((a.bench / "seed.json").read_text())
tool = a.website / "scripts/prepare-vendefacil-services.mjs"
target = "/platform/sites/vendefacil/pages?route=/&locale=es"
results = []


def check(name, condition, detail=""):
    results.append({"name": name, "pass": bool(condition), "detail": detail})
    print(("PASS " if condition else "FAIL ") + name + (" — " + detail if detail else ""), flush=True)
    assert condition, name


def write(path, data):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, "w") as stream:
        stream.write(json.dumps(data, indent=2, default=str) + "\n")


def data(response):
    assert response.status_code == 200, f"HTTP {response.status_code}: {response.text[:500]}"
    return response.json()["data"]


cache = a.bench / "sessions.json"
if cache.exists():
    sessions = json.loads(cache.read_text())
else:
    def app_token(key):
        return data(http.post("/auth/token", json={"apiKey": key}))["access_token"]
    staff = db.PlatformStaff.find_one({"email": seed["staff"]["staff_pool"][0]})
    claims = {"sub": str(staff["_id"]), "app_id": seed["staff"]["console_app_id"], "type": "staff", "token_version": staff["token_version"]}
    owner = seed["owner"]
    def sign(claims):
        return jwt.encode({**claims, "exp": datetime.now(timezone.utc) + timedelta(hours=3)}, os.environ["JWT_SECRET_KEY"], algorithm="HS256")
    sessions = {"staff": {"Authorization": "Bearer " + app_token(seed["staff"]["console_api_key"]), "x-user-token": sign(claims)},
                "owner": {"Authorization": "Bearer " + app_token(seed["owner_app_key"]), "x-user-token": sign({"sub": owner["id"], "app_id": owner["app_id"], "type": "user", "token_version": owner["token_version"]})}}
    write(cache, sessions)
SH, UH = sessions["staff"], sessions["owner"]


def snapshot():
    return {"manifest": data(http.get("/platform/sites/vendefacil", headers=SH)),
            "documents": data(http.get("/platform/sites/vendefacil/pages", headers=SH))}


def root(s):
    return next(d for d in s["documents"] if d["route"] == "/" and d["locale"] == "es")


def guard(direction, snap, plan=None, success=True):
    write(a.bench / "fresh.json", snap)
    result = subprocess.run(["node", str(tool), "check-" + direction, str(plan or a.bench / "plan/plan.json"), str(a.bench / "fresh.json")], text=True, capture_output=True)
    check(f"{direction} preconditions {'accept' if success else 'refuse'}", (result.returncode == 0) == success,
          result.stdout.strip() if success else result.stderr.strip())


def put(body):
    result = http.put(target, headers=SH, json=body)
    check("staff PUT accepted", result.status_code == 200, str(result.status_code))
    doc = db.site_pages.find_one({"tenant_slug": "vendefacil", "route": "/", "locale": "es"})
    check("HTTP write persisted exactly in Mongo", {"blocks": doc["blocks"], "published": doc["published"]} == body)


try:
    if a.action == "snapshot":
        snap = snapshot()
        check("staff snapshot includes private draft", any(d["route"] == "/bank-draft/" and not d["published"] for d in snap["documents"]))
        public = data(http.get("/sites/vendefacil/pages?locale=es"))
        check("anonymous reader cannot see draft", all(d["route"] != "/bank-draft/" for d in public["pages"]))
        write(a.bench / "before.json", snap)
        result = subprocess.run(["node", str(tool), "plan", str(a.bench / "before.json"), str(a.bench / "plan")], text=True, capture_output=True)
        check("prepare plan from real staff snapshot", result.returncode == 0, result.stdout.strip() or result.stderr.strip())
        plan = json.loads((a.bench / "plan/plan.json").read_text())
        check("45-key diff, 413 to 456, no deletions", (plan["keysBefore"], plan["keysAfter"], plan["added"], plan["changed"], plan["removed"]) == (413, 456, 43, 2, 0))
    elif a.action == "apply":
        page = httpx.get(f"http://127.0.0.1:{a.port}/", headers={"Host": "vendefacil.1platform.pro"})
        check("new renderer available before content", page.status_code == 200 and 'name="photographic-capabilities" content="uniform-services-v1"' in page.text)
        guard("apply", snapshot())
        plan = json.loads((a.bench / "plan/plan.json").read_text())
        bad = json.loads(json.dumps(plan))
        bad["apply"]["blocks"]["photographic.verticals.store.title"] = "Altered plan"
        write(a.bench / "altered-plan.json", bad)
        guard("apply", snapshot(), a.bench / "altered-plan.json", success=False)
        # AC new: a concurrent real edit invalidates the plan, even if reverted later.
        before = plan["rollback"]
        put({**before, "blocks": {**before["blocks"], "photographic.verticals.delivery.title": "Edición concurrente del banco"}})
        guard("apply", snapshot(), success=False)
        put(before)
        # Fresh timestamps require a new plan; retain the original review point.
        (a.bench / "plan").rename(a.bench / "plan-before-drift")
        snap = snapshot()
        write(a.bench / "before.json", snap)
        subprocess.run(["node", str(tool), "plan", str(a.bench / "before.json"), str(a.bench / "plan")], check=True)
        guard("apply", snapshot())
        plan = json.loads((a.bench / "plan/plan.json").read_text())
        put(plan["apply"])
        guard("rollback", snapshot())
        check("manifest, other pages and draft unchanged", snapshot()["manifest"] == snap["manifest"] and [d for d in snapshot()["documents"] if d["route"] != "/"] == [d for d in snap["documents"] if d["route"] != "/"])
    elif a.action == "security":
        before = root(snapshot())
        check("bank has six-service content", len(before["blocks"]) == 456)
        owner_path = f"/users/websites/{seed['landing_id']}/landing/pages?route=/&locale=es"
        pages = data(http.get(owner_path, headers=UH))["pages"]
        home = next(d for d in pages if d["route"] == "/")
        editable, locked = set(home["blocks"]), set(home["locked_keys"])
        for key in ["photographic.verticals.store.title", "photographic.verticals.email.title"]:
            check("owner can edit " + key, key in editable)
        for key in ["photographic.solutions.mode", "photographic.verticals.store.products.0.icon", "photographic.solutions.links.4.href", "photographic.contact.messages.store", "photographic.contact.messages.email", "photographic.verticals.ads.mode"]:
            check("owner cannot configure " + key, key in locked and key not in editable)
            r = http.put(owner_path, headers=UH, json={"updated_at": home["updated_at"], "blocks": {key: before["blocks"][key]}})
            check("owner config write refused " + key, r.status_code == 422 and "not_editable" in r.text, str(r.status_code))
        for text in ["Meta Ads", "Facebook", "Instagram"]:
            r = http.put(target, headers=SH, json={"blocks": {**before["blocks"], "photographic.verticals.email.title": text}, "published": True})
            check("staff literal provider rejected " + text, r.status_code == 422, str(r.status_code))
            r = http.put(owner_path, headers=UH, json={"updated_at": home["updated_at"], "blocks": {"photographic.verticals.email.title": text}})
            check("owner literal provider rejected " + text, r.status_code == 422, str(r.status_code))
        r = http.put(owner_path, headers=UH, json={"updated_at": home["updated_at"], "blocks": {"photographic.verticals.ads.title": "Promocione con {adsName}"}})
        check("owner can edit advertising marker", r.status_code == 200, str(r.status_code))
        guard("rollback", snapshot(), success=False)
        stamp = data(r)["updated_at"]
        r = http.put(owner_path, headers=UH, json={"updated_at": stamp, "blocks": {"photographic.verticals.ads.title": before["blocks"]["photographic.verticals.ads.title"]}})
        check("owner restores original text", r.status_code == 200)
        check("no unauthorized change in Mongo", db.site_pages.find_one({"tenant_slug": "vendefacil", "route": "/", "locale": "es"})["blocks"] == before["blocks"])
        check("owner token cannot enter staff route", http.get("/platform/sites/vendefacil/pages", headers=UH).status_code == 401)
        check("anonymous staff write rejected", http.put(target, json={"blocks": {}, "published": True}).status_code in (401, 403))
        guard("rollback", snapshot())
    else:
        plan = json.loads((a.bench / "plan/plan.json").read_text())
        bad = json.loads(json.dumps(plan))
        bad["rollback"]["blocks"]["photographic.solutions.links.4.label"] = "Changed after review"
        write(a.bench / "altered-rollback.json", bad)
        guard("rollback", snapshot(), a.bench / "altered-rollback.json", success=False)
        guard("rollback", snapshot())
        put(plan["rollback"])
        before = json.loads((a.bench / "plan/before.json").read_text())
        after = snapshot()
        check("rollback keeps manifest and all other documents exact", before["manifest"] == after["manifest"] and [d for d in before["documents"] if d["route"] != "/"] == [d for d in after["documents"] if d["route"] != "/"])
        check("rollback removes only the new content", root(after)["blocks"] == root(before)["blocks"] and root(after)["published"] == root(before)["published"])
        guard("apply", after, success=False)
finally:
    write(a.bench / f"{a.action}-results.json", results)
    http.close()
    db.client.close()
