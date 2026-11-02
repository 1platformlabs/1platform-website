"""Reproduce public landing data in the isolated Core bank, never in QA/PROD.

Run from the API worktree with its verified venv and explicit local environment.
Input is census_vendefacil_services.py's read-only public snapshots.
"""
import argparse
import asyncio
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, os.getcwd())
from tests.bench.bench_guard import assert_bench_contents, assert_bench_target

DB = "e2e_landing_whatsapp_float"
SITES = [("oneplatform", "1platform.pro", ["en", "es"]),
         ("medipago", "medipago.gt", ["es"]),
         ("vendefacil", "vendefacil.1platform.pro", ["es"])]

async def main(args):
    from beanie import init_beanie
    from pymongo import AsyncMongoClient
    from app.models.site_tenant import SiteTenant
    from app.models.site_page import SitePage
    url, name = os.environ["MONGODB_URL"], os.environ["MONGODB_DB_NAME"]
    assert_bench_target(url, name)
    assert name == DB, "This seed owns only its named database"
    client = AsyncMongoClient(url)
    try:
        db = client[name]
        await assert_bench_contents(db)
        if args.teardown:
            await client.drop_database(name)
            return
        await init_beanie(database=db, document_models=[SiteTenant, SitePage])
        for slug, host, locales in SITES:
            manifest = json.loads((args.census / f"prod-byhost-{host}.json").read_text())["data"]
            assert manifest["slug"] == slug
            fields = {k: v for k, v in manifest.items() if k not in ("indexable", "redirect_to")}
            existing = await SiteTenant.find_one(SiteTenant.slug == slug)
            tenant = SiteTenant(**fields, domain_is_final=bool(manifest["indexable"]), status="published")
            if existing:
                tenant.id = existing.id
                await tenant.replace()
            else:
                await tenant.insert()
            for locale in locales:
                pages = json.loads((args.census / f"prod-pages-{slug}-{locale}.json").read_text())["data"]["pages"]
                for page in pages:
                    query = {"tenant_slug": slug, "locale": locale, "route": page["route"]}
                    previous = await SitePage.find_one(query)
                    document = SitePage(**query, blocks=page["blocks"], published=True)
                    if previous:
                        document.id = previous.id
                        await document.replace()
                    else:
                        await document.insert()
            print(slug, "published content persisted")
    finally:
        await client.close()

parser = argparse.ArgumentParser()
parser.add_argument("--census", type=Path, required=True)
parser.add_argument("--teardown", action="store_true")
asyncio.run(main(parser.parse_args()))
