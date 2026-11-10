#!/usr/bin/env python3
"""Build the DEVELOPMENT fixture of the editorial preset (blog-sitio-de-marca-generado §23 E-9).

Two sites, the same code:

* ``peptidos`` — the first customer. Its eight posts, dates and byline come
  from the approved prototype (``epics/website-multitenant/prototipo/peptidos/``)
  and are DEVELOPMENT FIXTURES: never published, never imported to production.
* ``cuaderno-demo`` — an invented site with another brand, taxonomy, content
  and destination, bilingual (es default + en). It shares the post slug
  ``leer-documentacion`` and the category id ``guias`` with the first site on
  purpose, so isolation is tested where identifiers collide.

Output: ``tests/fixtures/editorial-tenants.json`` — read by the fake site API of
the browser suite and by the Core's local seed
(``1platform-api/scripts/seed_local_editorial_tenants.py --file …``). One file,
two readers: no second source of truth.

Usage: python3 scripts/build_editorial_fixture.py <path-to-prototype-dir>
Stdlib only. Deterministic (sorted, fixed dates): two runs give the same bytes.
"""

from __future__ import annotations

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

MONTHS = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12}
OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "editorial-tenants.json"

FILES = {
    "leer-documentacion": "articulo.html",
    "numero-lote": "articulo-numero-lote.html",
    "leer-investigacion": "articulo-leer-investigacion.html",
    "almacenamiento-documentado": "articulo-almacenamiento-documentado.html",
    "glosario-documental": "articulo-glosario-documental.html",
    "comparar-presentaciones": "articulo-comparar-presentaciones.html",
    "fuentes-fechas": "articulo-fuentes-fechas.html",
    "preguntas-documentacion": "articulo-preguntas-documentacion.html",
}


class Body(HTMLParser):
    """The <article class="prose"> sections → the blog grammar (## / ### / > / tables)."""

    def __init__(self):
        super().__init__()
        self.out: list[str] = []
        self.depth = 0
        self.inside = False
        self.skip = 0
        self.buf: list[str] = []
        self.mode: str | None = None
        self.quote = False
        self.row: list[str] | None = None
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "article" and "prose" in (a.get("class") or ""):
            self.inside = True
            return
        if not self.inside:
            return
        if tag in ("nav", "aside", "figure", "caption", "cite") or (tag == "div" and "article-end" in (a.get("class") or "")):
            self.skip += 1
        if self.skip:
            return
        if tag in ("h2", "h3", "p"):
            self.mode, self.buf = tag, []
        elif tag == "blockquote":
            self.quote = True
        elif tag == "tr":
            self.row = []
        elif tag in ("td", "th"):
            self.mode, self.buf = "cell", []

    def handle_endtag(self, tag):
        if not self.inside:
            return
        if tag == "article":
            self.inside = False
            return
        if tag in ("nav", "aside", "figure", "caption", "cite") and self.skip:
            self.skip -= 1
            return
        if tag == "div" and self.skip:
            self.skip -= 1
            return
        if self.skip:
            return
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        if tag in ("h2", "h3") and self.mode == tag:
            self.out.append(("## " if tag == "h2" else "### ") + text)
            self.mode = None
        elif tag == "p" and self.mode == "p":
            self.out.append(("> " if self.quote else "") + text)
            self.mode = None
        elif tag == "blockquote":
            self.quote = False
        elif tag in ("td", "th") and self.mode == "cell":
            self.row.append(text.replace("|", "/"))
            self.mode = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None
        elif tag == "table":
            header, *rest = self.rows
            lines = ["| " + " | ".join(header) + " |", "| " + " | ".join("---" for _ in header) + " |"]
            lines += ["| " + " | ".join(r) + " |" for r in rest]
            self.out.append("\n".join(lines))
            self.rows = []

    def handle_data(self, data):
        if self.inside and not self.skip and self.mode:
            self.buf.append(data)


def _date(text: str) -> str:
    day, month, year = text.split()
    return f"{year}-{MONTHS[month]:02d}-{int(day):02d}T15:00:00+00:00"


def peptidos_posts(proto: Path) -> list[dict]:
    meta = json.loads((proto / "evidencia" / "contenido-fixture.json").read_text())["posts"]
    posts = []
    for entry in meta:
        body = Body()
        body.feed((proto / FILES[entry["slug"]]).read_text())
        posts.append(
            {
                "locale": "es",
                "slug": entry["slug"],
                "translation_key": entry["slug"],
                "title": html.unescape(entry["title"]),
                "description": html.unescape(entry["desc"]),
                "body": "\n\n".join(body.out) + "\n",
                "category": entry["cat"],
                "illustration": entry["art"],
                "reading_minutes": int(entry.get("minutes") or 3),
                "status": "published",
                "published_at": _date(entry["date"]),
                "updated_at": _date(entry["date"]),
            }
        )
    return posts


def peptidos(proto: Path) -> dict:
    cats = {
        "guias": ("Guías básicas", "Conceptos y documentos para empezar a leer con orden."),
        "investigacion": ("Investigación", "Cómo acercarte a una publicación sin quedarte con el titular."),
        "calidad": ("Calidad y almacenamiento", "Qué documentación pedir y cómo conservarla."),
        "preguntas": ("Preguntas frecuentes", "Respuestas breves a las dudas que más se repiten."),
    }
    return {
        "manifest": {
            "slug": "peptidos",
            "brand_name": "péptidos.gt",
            "brand_mark": None,
            "brand_wordmark": "péptidos.gt",
            "domain": "peptidos.localhost",
            "locales": ["es"],
            "default_locale": "es",
            "region": "GT",
            "home_template": "editorial-blog",
            "theme": {"accent": "#203d30", "accent_contrast": "#ffffff", "display_font": "manrope"},
            "destinations": {"docs": None, "app": None, "support": None, "status": None},
            "pages": ["/", "/blog/"],
            "indexable": False,
            "google_site_verification": None,
        },
        "editorial": {
            "categories": [{"id": k, "labels": {"es": {"name": n, "description": d}}} for k, (n, d) in cats.items()],
            "home": {
                "es": {
                    "kicker": "Péptidos, con contexto · Guatemala",
                    "title": "Entiende más. Elige con criterio.",
                    "intro": "Tu punto de partida para entender los péptidos, leer sus documentos y hacer mejores preguntas.",
                    "featured_post": "leer-documentacion",
                }
            },
            "illustration": "connections",
            "reading_paths": [
                {"id": "entender", "labels": {"es": {"title": "Quiero entender lo básico.", "description": "Ficha, etiqueta e informe: pon cada término en su lugar.", "post": "glosario-documental"}}},
                {"id": "comparar", "labels": {"es": {"title": "Estoy comparando presentaciones.", "description": "Ordena las diferencias antes de seguir explorando.", "post": "comparar-presentaciones"}}},
                {"id": "revisar", "labels": {"es": {"title": "Quiero revisar los documentos.", "description": "Conecta la ficha, el lote y las preguntas pendientes.", "post": "numero-lote"}}},
            ],
            "cta": {
                "url": "https://aurumlabsgt.com/",
                "presentation": "band",
                "labels": {
                    "es": {
                        "title": "Más contexto. Mejores preguntas.",
                        "body": "Lleva lo que aprendiste a las fichas de Aurum Labs. Revisa la información de cada presentación y consulta lo que necesites aclarar.",
                        "button": "Explorar Aurum Labs",
                    }
                },
            },
            "byline": {"es": "Redacción péptidos.gt"},
            "legal": {"approved": False, "labels": {"es": {"text": "PENDIENTE DE REDACCIÓN LEGAL DEL DUEÑO"}}},
            "newsletter": {"enabled": False, "consent_version": None, "labels": {}},
            "palette": {"canvas": "#fafbf6", "ink": "#17231d", "highlight": "#705421"},
            "reading_font": "system-serif",
        },
        "posts": peptidos_posts(proto),
    }


def cuaderno() -> dict:
    def post(locale, slug, key, title, desc, cat, date, body, art):
        return {
            "locale": locale, "slug": slug, "translation_key": key, "title": title, "description": desc,
            "body": body, "category": cat, "illustration": art, "reading_minutes": 4, "status": "published",
            "published_at": date, "updated_at": date,
        }

    es_body = (
        "## Antes de encender el fuego\n\nLee la receta completa una vez, sin cocinar. Marca los pasos que necesitan espera.\n\n"
        "> Una receta leída dos veces se cocina una sola vez.\n\n"
        "### Qué anotar\n\n| Paso | Tiempo |\n| --- | --- |\n| Remojo | Una noche |\n| Cocción | Dos horas |\n\n"
        "## Después de cocinar\n\nAnota qué cambiarías la próxima vez.\n"
    )
    en_body = (
        "## Before you light the stove\n\nRead the whole recipe once, without cooking. Mark the steps that need waiting.\n\n"
        "> A recipe read twice is cooked once.\n\n## After cooking\n\nWrite down what you would change next time.\n"
    )
    return {
        "manifest": {
            "slug": "cuaderno-demo",
            "brand_name": "Cuaderno de Cocina Lenta",
            "brand_mark": "C",
            "brand_wordmark": "Cuaderno",
            "domain": "cuaderno.localhost",
            "locales": ["es", "en"],
            "default_locale": "es",
            "region": None,
            "home_template": "editorial-blog",
            "theme": {"accent": "#8a3b1f", "accent_contrast": "#ffffff", "display_font": "system-serif"},
            "destinations": {"docs": None, "app": None, "support": None, "status": None},
            "pages": ["/", "/blog/"],
            "indexable": False,
            "google_site_verification": None,
        },
        "editorial": {
            "categories": [
                {"id": "guias", "labels": {"es": {"name": "Guías de cocina", "description": "Técnica antes que receta."}, "en": {"name": "Cooking guides", "description": "Technique before recipe."}}},
                {"id": "recetas", "labels": {"es": {"name": "Recetas", "description": "Platos para una tarde larga."}, "en": {"name": "Recipes", "description": "Dishes for a long afternoon."}}},
                {"id": "despensa", "labels": {"es": {"name": "Despensa", "description": "Qué guardar y cómo."}, "en": {"name": "Pantry", "description": "What to keep and how."}}},
            ],
            "home": {
                "es": {"kicker": "Cuaderno · Edición demo", "title": "Cocina despacio. Anota todo.", "intro": "Notas para cocinar sin prisa y repetir lo que salió bien.", "featured_post": "leer-documentacion"},
                "en": {"kicker": "Notebook · Demo edition", "title": "Cook slowly. Write it down.", "intro": "Notes for unhurried cooking.", "featured_post": "read-the-recipe"},
            },
            "illustration": "grid",
            "reading_paths": [
                {"id": "empezar", "labels": {"es": {"title": "Empiezo de cero.", "description": "Lo primero que conviene leer.", "post": "leer-documentacion"}, "en": {"title": "Starting out.", "description": "Read this first.", "post": "read-the-recipe"}}},
                {"id": "guardar", "labels": {"es": {"title": "Quiero ordenar mi despensa.", "description": "Qué guardar y cómo.", "post": "despensa-basica"}, "en": {"title": "Organising the pantry.", "description": "What to keep.", "post": "read-the-recipe"}}},
                {"id": "cocinar", "labels": {"es": {"title": "Tengo una tarde libre.", "description": "Un plato largo y tranquilo.", "post": "frijoles-de-olla"}, "en": {"title": "A free afternoon.", "description": "A long, calm dish.", "post": "read-the-recipe"}}},
            ],
            "cta": {
                "url": "https://mercado-demo.example/",
                "presentation": "card",
                "labels": {
                    "es": {"title": "¿Te faltan ingredientes?", "body": "El mercado asociado de esta demo tiene lo de la lista.", "button": "Ir al mercado"},
                    "en": {"title": "Missing ingredients?", "body": "This demo's partner market has the list.", "button": "Go to the market"},
                },
            },
            "byline": {"es": "Equipo del Cuaderno", "en": "The Notebook team"},
            "legal": {"approved": True, "labels": {"es": {"text": "Sitio de demostración. Contenido ficticio."}, "en": {"text": "Demo site. Fictional content."}}},
            "newsletter": {
                "enabled": True,
                "consent_version": "demo-2026-11",
                "labels": {
                    "es": {"title": "Una receta al mes.", "body": "Sin prisa, como el resto.", "consent_text": "Acepto recibir el boletín de esta demostración.", "button": "Suscribirme"},
                    "en": {"title": "One recipe a month.", "body": "Unhurried, like everything else.", "consent_text": "I agree to receive this demo's newsletter.", "button": "Subscribe"},
                },
            },
            "palette": {"canvas": "#fbf6ef", "ink": "#2b1a12", "highlight": "#8a3b1f"},
            "reading_font": "system-sans",
        },
        "posts": [
            post("es", "leer-documentacion", "leer-la-receta", "Leer la receta antes de empezar", "Una lectura completa ahorra la mitad de los errores.", "guias", "2026-11-05T15:00:00+00:00", es_body, "pages"),
            post("es", "frijoles-de-olla", "frijoles-de-olla", "Frijoles de olla, sin apuro", "Remojo largo y fuego bajo.", "recetas", "2026-11-03T15:00:00+00:00", "## La olla\n\nUna olla de barro o de hierro.\n\n## El tiempo\n\nDos horas a fuego bajo.\n", "orbit"),
            post("es", "despensa-basica", "despensa-basica", "Una despensa básica", "Lo mínimo para cocinar una semana.", "despensa", "2026-10-30T15:00:00+00:00", "## Granos\n\nFrijol, arroz y maíz.\n\n## Especias\n\nPocas y frescas.\n", "labels"),
            post("es", "cuaderno-de-notas", "cuaderno-de-notas", "Cómo llevar un cuaderno de cocina", "Fecha, cambio y resultado.", "guias", "2026-10-28T15:00:00+00:00", "## Una página por plato\n\nAnota fecha, cambio y resultado.\n", "lines"),
            post("en", "read-the-recipe", "leer-la-receta", "Read the recipe before you start", "A full read saves half the mistakes.", "guias", "2026-11-05T15:00:00+00:00", en_body, "pages"),
        ],
    }


def main() -> int:
    proto = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if proto is None or not (proto / "articulo.html").exists():
        print(__doc__)
        return 2
    data = {"note": "DEVELOPMENT FIXTURE — not approved content; never import to production.", "tenants": [peptidos(proto), cuaderno()]}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False) + "\n")
    print(f"wrote {OUT} ({sum(len(t['posts']) for t in data['tenants'])} posts)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
