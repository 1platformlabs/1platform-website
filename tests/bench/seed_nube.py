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

DB = "e2e_nube_disponible"
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
            if args.brand_assets:
                import boto3
                from app.services.website.site_brand_logo_service import logo_object_key
                from app.services.website.site_brand_favicon_service import favicon_object_key
                import hashlib
                import subprocess
                endpoint = os.environ["OBJECT_STORAGE_ENDPOINT"]
                assert endpoint == "http://127.0.0.1:9106"
                bucket = os.environ["OBJECT_STORAGE_BUCKET"]
                assert bucket == "nube-banco-6"
                storage = boto3.client("s3", endpoint_url=endpoint,
                    aws_access_key_id=os.environ["OBJECT_STORAGE_ACCESS_KEY"],
                    aws_secret_access_key=os.environ["OBJECT_STORAGE_SECRET_KEY"],
                    region_name="us-east-1")
                for field, segment in [("brand_logo", "logo"), ("brand_favicon", "favicon")]:
                    if not manifest.get(field):
                        continue
                    sha = manifest[field]["sha256"]
                    content = subprocess.check_output(["curl", "--fail", "--silent", "--show-error", "--max-time", "30",
                        f"https://api.1platform.pro/api/v1/sites/{slug}/{segment}/{sha}.png"])
                    assert hashlib.sha256(content).hexdigest() == sha
                    storage.put_object(Bucket=bucket, Key=(logo_object_key if segment == "logo" else favicon_object_key)(tenant.id, sha), Body=content, ContentType="image/png")
            for locale in locales:
                pages = json.loads((args.census / f"prod-pages-{slug}-{locale}.json").read_text())["data"]["pages"]
                for page in pages:
                    query = {"tenant_slug": slug, "locale": locale, "route": page["route"]}
                    previous = await SitePage.find_one(query)
                    blocks = dict(page["blocks"])
                    # NUBE-01: only the two availability labels change; all other
                    # tenants, routes and public text retain the live census.
                    key = "infrastructure.capabilities.cloud.status"
                    if args.available and slug == "oneplatform" and key in blocks:
                        blocks[key] = {"es": "DISPONIBLE", "en": "AVAILABLE"}[locale]
                    document = SitePage(**query, blocks=blocks, published=True)
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
parser.add_argument("--brand-assets", action="store_true")
parser.add_argument("--available", action="store_true", help="Apply only the Nube labels in the private bank")
asyncio.run(main(parser.parse_args()))
