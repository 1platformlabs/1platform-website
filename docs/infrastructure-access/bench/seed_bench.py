"""Semilla del banco local de la activación de acceso (sólo banco; nunca QA/PROD).

Carga por driver —sin pasar por los modelos, para conservar las formas reales—
el snapshot de PROD de `oneplatform`, `medipago` y `vendefacil`, y agrega un
sitio de infraestructura SIN activar (`e2e-ls-sin-acceso`), copia de
`oneplatform` con otro host, para comprobar que la activación no se propaga.

Uso: python seed_bench.py <mongo-url> <db> <snapshot.json>   (idempotente: borra y recarga)
"""

import sys

from bson import ObjectId, json_util
from pymongo import MongoClient

SIN_ACCESO = "e2e-ls-sin-acceso"
SIN_ACCESO_HOST = "sin-acceso.e2e-ls.test"


def main(url: str, name: str, snapshot_path: str) -> None:
    with open(snapshot_path, encoding="utf-8") as fh:
        snap = json_util.loads(fh.read())
    db = MongoClient(url)[name]
    slugs = [t["slug"] for t in snap["tenants"]] + [SIN_ACCESO]
    db.site_tenants.delete_many({"slug": {"$in": slugs}})
    db.site_pages.delete_many({"tenant_slug": {"$in": slugs}})
    db.site_tenants.insert_many(snap["tenants"])
    db.site_pages.insert_many(snap["pages"])

    base = next(t for t in snap["tenants"] if t["slug"] == "oneplatform")
    clone = {**base, "_id": ObjectId(), "slug": SIN_ACCESO, "domain": SIN_ACCESO_HOST, "host_aliases": []}
    clone["destinations"] = {**base["destinations"], "app": "https://app.sin-acceso.e2e-ls.test/app/auth/login"}
    db.site_tenants.insert_one(clone)
    db.site_pages.insert_many(
        [{**p, "_id": ObjectId(), "tenant_slug": SIN_ACCESO} for p in snap["pages"] if p["tenant_slug"] == "oneplatform"]
    )
    for t in db.site_tenants.find({}, {"slug": 1, "domain": 1, "pages": 1, "destinations.app": 1}):
        print(t["slug"], t["domain"], "access" if "/access/" in t["pages"] else "-", t["destinations"].get("app"))
    print("site_pages:", db.site_pages.count_documents({}))


if __name__ == "__main__":
    main(*sys.argv[1:4])
