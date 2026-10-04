"""Idempotent real-bank seed. Run with cwd/venv from the isolated Core API.

Input: public, read-only census files (prod-byhost-HOST.json and
prod-pages-SLUG-LOCALE.json). No Website fixture server participates.
--teardown drops only the exact private database, after the same bank guards.
See docs/evidence/vendefacil-servicios-uniformes/BANCO.md for reproduction.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

sys.path.insert(0, os.getcwd())
from tests.bench.bench_guard import assert_bench_contents, assert_bench_target

TAG = "e2e-vfs"
DB_NAME = "e2e_vendefacil_servicios_uniformes"
SITES = (
    ("vendefacil", "vendefacil.1platform.pro", ("es",)),
    ("medipago", "medipago.gt", ("es",)),
    ("oneplatform", "1platform.pro", ("en", "es")),
)


async def main(args):
    from beanie import init_beanie
    from pymongo import AsyncMongoClient
    from app.models.app import App
    from app.models.user import User
    from app.models.website import Website
    from app.models.site_tenant import SiteTenant
    from app.models.site_page import SitePage
    from app.models.platform_staff import PlatformStaff
    from app.models.dashboard.role import Role, Permission
    from app.repositories.dashboard.role_repository import RoleRepository, PermissionRepository
    from app.services.rbac.app_admin_seed import seed_app_admin_role
    from app.utils.date_helpers import utc_now
    from tests.bench.seed_console_staff import apply as seed_staff

    url, name = os.environ["MONGODB_URL"], os.environ["MONGODB_DB_NAME"]
    assert_bench_target(url, name)
    assert name == DB_NAME, "This seed owns only its named database"
    client = AsyncMongoClient(url, serverSelectionTimeoutMS=8000)
    try:
        db = client[name]
        await assert_bench_contents(db)
        if args.teardown:
            await client.drop_database(name)
            print("Private VFS database removed")
            return
        await init_beanie(database=db, document_models=[App, User, Website, SiteTenant, SitePage, PlatformStaff, Role, Permission])
        out = {"tag": TAG, "staff": await seed_staff(console_url="https://localhost:5890"), "sites": {}}
        # AC tenant isolation: actual published forms, including shared catalogues/locales.
        for slug, host, locales in SITES:
            manifest = json.loads((args.census / f"prod-byhost-{host}.json").read_text())["data"]
            assert manifest["slug"] == slug
            if await SiteTenant.find_one(SiteTenant.slug == slug) is None:
                fields = {k: v for k, v in manifest.items() if k not in ("indexable", "redirect_to")}
                await SiteTenant(**fields, domain_is_final=bool(manifest["indexable"]), status="published").insert()
            for locale in locales:
                pages = json.loads((args.census / f"prod-pages-{slug}-{locale}.json").read_text())["data"]["pages"]
                for page in pages:
                    query = {"tenant_slug": slug, "locale": locale, "route": page["route"]}
                    if await SitePage.find_one(query) is None:
                        await SitePage(**query, blocks=page["blocks"], published=True).insert()
            out["sites"][slug] = {"host": host, "locales": locales}
        # AC preservation: a non-public draft must survive the patch too.
        draft = {"tenant_slug": "vendefacil", "locale": "es", "route": "/bank-draft/"}
        if await SitePage.find_one(draft) is None:
            await SitePage(**draft, blocks={"bank.draft.title": "Borrador privado del banco"}, published=False).insert()
        # AC staff vs owner: actual tenant owner, with websites module and role.
        app = await App.find_one(App.slug == f"{TAG}-tenant")
        if app is None:
            app = App(name="Vende Fácil (banco)", slug=f"{TAG}-tenant", status="active", api_key="ak-" + secrets.token_urlsafe(32),
                      is_admin=False, config={"dashboard": {"enabled": True, "allowed_origins": ["https://app.vendefacil.1platform.pro"]}})
            await app.insert()
        subprocess.run([sys.executable, "scripts/seed_dashboard_config.py", "--app-slug", app.slug, "--preset", "publisher"],
                       check=True, stdout=subprocess.DEVNULL)
        role = await seed_app_admin_role(app.id, role_repo=RoleRepository(), permission_repo=PermissionRepository())
        owner = await User.find_one(User.email == f"{TAG}-owner@example.com", User.app_id == app.id)
        if owner is None:
            owner = User(email=f"{TAG}-owner@example.com", username=f"{TAG}-owner", api_key="sk-" + secrets.token_urlsafe(32),
                         app_id=app.id, role_ids=[role.id], verified_at=utc_now())
            await owner.insert()
        await App.get_pymongo_collection().update_one({"_id": app.id}, {"$set": {"owner_id": owner.id}})
        website = await Website.find_one(Website.slug == f"{TAG}-landing")
        if website is None:
            website = Website(url="https://vendefacil.1platform.pro/", domain="vendefacil.1platform.pro", slug=f"{TAG}-landing",
                              user_id=owner.id, active=True, status="active", lang="es", site_type="landing", site_tenant_slug="vendefacil")
            await website.insert()
        out.update(owner={"id": str(owner.id), "app_id": str(app.id), "token_version": owner.token_version},
                   owner_app_key=app.api_key, landing_id=str(website.id))
        fd = os.open(args.out, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w") as stream:
            json.dump(out, stream, indent=2)
        print("VFS seed ready; credentials written to private file only")
    finally:
        await client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--census", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--teardown", action="store_true")
    asyncio.run(main(parser.parse_args()))
