"""Activación del acceso de 1Platform (`oneplatform`) — plan, aplicación y reversión.

Corre DENTRO de un runtime del Core (banco local o contenedor del API) con
``PYTHONPATH`` en la raíz del API. Escribe sólo a través de los servicios del
Core (``SitePageService.put_page`` / ``SiteTenantService.patch_tenant``), así que
cada escritura pasa por las mismas validaciones que la API administrativa.

Fases (sin ``--apply`` todas son de sólo lectura y muestran el diff):

  plan       snapshot de lo que la activación toca + diff previsto
  documents  crea los 4 documentos EN/ES (contenido; no cambia el manifiesto)
  manifest   agrega las 2 rutas a ``pages`` y fija ``destinations.app``
  verify     comprueba el estado activado
  rollback   revierte desde un snapshot en dos fases: --phase manifest, esperar
             el refresco de caché, --phase documents

Orden obligatorio: ``documents`` → esperar a que la caché de contenido del
website se refresque (≥2 min con tráfico EN y ES) → ``manifest``. Al revés en
``rollback``. La cabecera sólo muestra «Acceder» cuando ``pages`` trae ambas
rutas, y entonces exige las claves ``access.*`` en el contenido.

Nunca reemplaza el manifiesto entero: lee el estado vivo y escribe sólo
``pages`` (lista viva + rutas faltantes) y ``destinations.app``.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone

from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.repositories.site_page_repository import SitePageRepository
from app.repositories.site_tenant_repository import SiteTenantRepository
from app.repositories.app_repository import AppRepository
from app.services.site_page_service import SitePageService, SitePageWriteRequest
from app.services.site_tenant_service import (
    SiteDestinationsPatch,
    SiteTenantPatchRequest,
    SiteTenantService,
)


def _load(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _services():
    pages = SitePageRepository()
    tenants = SiteTenantRepository()
    return SitePageService(pages, tenants), SiteTenantService(tenants, AppRepository()), pages, tenants


async def _state(pkg: dict) -> dict:
    """Lo que la activación toca, leído en vivo. Es el snapshot de reversión."""
    _, _, pages, tenants = _services()
    tenant = await tenants.get_by_slug(pkg["tenant_slug"])
    if tenant is None:
        raise SystemExit(f"no existe el sitio {pkg['tenant_slug']!r}")
    docs = {}
    for doc in pkg["documents"]:
        current = await pages.get(tenant.slug, doc["route"], doc["locale"])
        docs[f"{doc['route']}|{doc['locale']}"] = (
            None
            if current is None
            else {"blocks": dict(current.blocks), "published": current.published}
        )
    return {
        "taken_at": datetime.now(timezone.utc).isoformat(),
        "tenant_slug": tenant.slug,
        "status": tenant.status.value,
        "pages": list(tenant.pages),
        "destinations": tenant.destinations.model_dump(),
        "documents": docs,
    }


def _print(obj) -> None:
    print(json.dumps(obj, ensure_ascii=False, indent=2, default=str))


async def cmd_plan(pkg: dict, out: str | None) -> int:
    state = await _state(pkg)
    if out:
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(state, fh, ensure_ascii=False, indent=2, default=str)
        print(f"snapshot escrito en {out}")
    missing_routes = [r for r in pkg["add_routes"] if r not in state["pages"]]
    diff = {
        "pages_add": missing_routes,
        "pages_kept": len(state["pages"]),
        "destinations.app": [state["destinations"].get("app"), pkg["destinations_patch"]["app"]],
        "destinations.support (sin cambio)": state["destinations"].get("support"),
        "documents": {
            k: ("crear" if v is None else ("igual" if _same(v, pkg, k) else "DIFIERE — revisar"))
            for k, v in state["documents"].items()
        },
    }
    _print(diff)
    return 0


def _pkg_doc(pkg: dict, key: str) -> dict:
    route, locale = key.split("|")
    return next(d for d in pkg["documents"] if d["route"] == route and d["locale"] == locale)


def _same(current: dict, pkg: dict, key: str) -> bool:
    want = _pkg_doc(pkg, key)
    return current["published"] == want["published"] and current["blocks"] == want["blocks"]


async def cmd_documents(pkg: dict, apply: bool) -> int:
    service, _, _, _ = _services()
    state = await _state(pkg)
    for key, current in state["documents"].items():
        if current is not None and _same(current, pkg, key):
            print(f"igual   {key}")
            continue
        if current is not None:
            print(f"DIFIERE {key}: existe con otro contenido; no se pisa. Revisar a mano.")
            return 2
        want = _pkg_doc(pkg, key)
        if not apply:
            print(f"crearía {key} ({len(want['blocks'])} claves)")
            continue
        await service.put_page(
            pkg["tenant_slug"],
            want["route"],
            want["locale"],
            SitePageWriteRequest(blocks=want["blocks"], published=want["published"]),
        )
        print(f"creado  {key}")
    return 0


async def cmd_manifest(pkg: dict, apply: bool) -> int:
    _, tenants_service, _, _ = _services()
    state = await _state(pkg)
    absent = [k for k, v in state["documents"].items() if v is None or not _same(v, pkg, k)]
    if absent:
        print(f"faltan documentos o difieren: {absent}. Correr `documents` primero.")
        return 2
    pages = list(state["pages"]) + [r for r in pkg["add_routes"] if r not in state["pages"]]
    app = pkg["destinations_patch"]["app"]
    if pages == state["pages"] and state["destinations"].get("app") == app:
        print("manifiesto ya activado; nada que escribir")
        return 0
    body = SiteTenantPatchRequest(pages=pages, destinations=SiteDestinationsPatch(app=app))
    if not apply:
        _print({"pages": pages, "destinations": {"app": app}})
        return 0
    updated = await tenants_service.patch_tenant(pkg["tenant_slug"], body)
    print(f"manifiesto escrito: {len(updated.pages)} rutas, app={updated.destinations.app}, support={updated.destinations.support}")
    return 0


async def cmd_verify(pkg: dict) -> int:
    state = await _state(pkg)
    ok = all(r in state["pages"] for r in pkg["add_routes"])
    ok &= state["destinations"].get("app") == pkg["destinations_patch"]["app"]
    ok &= all(v is not None and _same(v, pkg, k) for k, v in state["documents"].items())
    _print({"activado": ok, "pages": len(state["pages"]), "destinations": state["destinations"]})
    return 0 if ok else 1


async def cmd_rollback(pkg: dict, snapshot: dict, apply: bool, phase: str) -> int:
    """Dos fases separadas por el refresco de caché del website (≥2 min con tráfico).

    ``manifest`` quita las rutas agregadas y restaura ``destinations.app``;
    ``documents`` borra o restaura los documentos y se NIEGA mientras las rutas
    sigan publicadas. Medido en el banco: borrar los documentos en el mismo paso
    dejó todas las páginas en inglés en 503 hasta que el manifiesto caducó.
    Preserva cambios ajenos.
    """
    page_service, tenants_service, _, _ = _services()
    state = await _state(pkg)
    added = [r for r in pkg["add_routes"] if r not in snapshot["pages"]]
    pages = [r for r in state["pages"] if r not in added]
    patch: dict = {}
    if pages != state["pages"]:
        patch["pages"] = pages
    snap_app = snapshot["destinations"].get("app")
    if state["destinations"].get("app") != snap_app:
        if state["destinations"].get("app") == pkg["destinations_patch"]["app"]:
            patch["destinations"] = SiteDestinationsPatch(app=snap_app)
        else:
            print(f"AVISO destinations.app cambió por otra vía ({state['destinations'].get('app')!r}); no se toca")
    if phase == "manifest":
        print(f"manifiesto: {'sin cambios' if not patch else list(patch)}")
        if patch and apply:
            await tenants_service.patch_tenant(pkg["tenant_slug"], SiteTenantPatchRequest(**patch))
        return 0
    still = [r for r in added if r in state["pages"]]
    if still:
        print(f"las rutas {still} siguen publicadas: correr primero --phase manifest y esperar el refresco de caché")
        return 2
    for key, before in snapshot["documents"].items():
        now = state["documents"].get(key)
        route, locale = key.split("|")
        if before is None and now is not None:
            if not _same(now, pkg, key):
                print(f"AVISO {key} fue editado después de la activación; no se borra")
                continue
            print(f"borrar  {key}")
            if apply:
                await page_service.delete_page(pkg["tenant_slug"], route, locale)
        elif before is not None and now != before:
            print(f"restaurar {key}")
            if apply:
                await page_service.put_page(
                    pkg["tenant_slug"], route, locale,
                    SitePageWriteRequest(blocks=before["blocks"], published=before["published"]),
                )
    return 0


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["plan", "documents", "manifest", "verify", "rollback"])
    ap.add_argument("--package", required=True)
    ap.add_argument("--snapshot-out")
    ap.add_argument("--snapshot")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--phase", choices=["manifest", "documents"])
    args = ap.parse_args()
    pkg = _load(args.package)
    client = AsyncMongoClient(settings.MONGODB_URL)
    # Los mismos modelos que el arranque del Core: los servicios consultan más
    # colecciones que las dos que escriben (p. ej. App al validar hosts).
    # skip_indexes: este script no crea ni toca índices.
    from app.main import document_models

    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=document_models(),
        skip_indexes=True,
    )
    print(f"db={settings.MONGODB_DB_NAME} comando={args.command} apply={args.apply}", file=sys.stderr)
    if args.command == "plan":
        return await cmd_plan(pkg, args.snapshot_out)
    if args.command == "documents":
        return await cmd_documents(pkg, args.apply)
    if args.command == "manifest":
        return await cmd_manifest(pkg, args.apply)
    if args.command == "verify":
        return await cmd_verify(pkg)
    if not args.snapshot or not args.phase:
        raise SystemExit("rollback exige --snapshot y --phase manifest|documents")
    return await cmd_rollback(pkg, _load(args.snapshot), args.apply, args.phase)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
