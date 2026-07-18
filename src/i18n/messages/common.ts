import { defineMessages } from '@i18n/ui';

/**
 * Shell copy: header, footer, layouts and the shared components.
 *
 * Terminology follows the vocabulary already in use on developer.1platform.pro,
 * which is Spanish-only and which a visitor experiences as the same product:
 * contenido, dominios, saldo, facturación, tienda, panel, funciones, precios,
 * soluciones. Where that site and this one name the same thing, they now name
 * it with the same word.
 *
 * Two things deliberately stay in English in both trees because they are brand,
 * not copy: the product name "1Platform" and the slogan "One platform. Every
 * solution." — the sibling site keeps the slogan in English on its Spanish
 * pages (src/theme/Footer/index.tsx:87), and a brand line that changes per
 * language is no longer a brand line.
 */
export default defineMessages({
  en: {
    // — Header ————————————————————————————————————————————————
    'nav.solutions': 'Solutions',
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.docs': 'Docs',
    'nav.blog': 'Blog',
    'nav.aria.main': 'Main navigation',
    'nav.aria.mobile': 'Mobile navigation',
    'nav.aria.toggleMenu': 'Toggle navigation menu',
    'nav.aria.toggleSubmenu': 'Toggle {label} menu',
    'nav.aria.submenu': '{label} menu',

    'nav.solutions.onlineStore': 'Online Store',
    'nav.solutions.website': 'Website Builder',
    'nav.solutions.content': 'AI Content',
    'nav.solutions.whitelabel': 'Whitelabel Dashboard',
    'nav.solutions.payments': 'Payments & Invoicing',
    'nav.solutions.viewAll': 'View all solutions',

    'cta.getStarted': 'Get Started Free',
    'cta.launchStore': 'Launch Your Store',
    'cta.viewDocs': 'View Documentation',

    // — Footer ————————————————————————————————————————————————
    'footer.cta.title': 'Stop juggling separate tools',
    'footer.cta.body':
      'Start with one platform. Sell online, issue invoices, and publish content — from one dashboard, one API, one bill.',
    'footer.col.solutions': 'Solutions',
    'footer.col.resources': 'Resources',
    'footer.col.company': 'Company',
    'footer.col.legal': 'Legal',
    'footer.link.forAgencies': 'For Agencies',
    'footer.link.forDevelopers': 'For Developers',
    'footer.link.allSolutions': 'All Solutions',
    'footer.link.documentation': 'Documentation',
    'footer.link.apiReference': 'API Reference',
    'footer.link.codeExamples': 'Code Examples',
    'footer.link.changelog': 'Changelog',
    'footer.link.about': 'About',
    'footer.link.terms': 'Terms of Service',
    'footer.link.privacy': 'Privacy Policy',
    'footer.link.cookies': 'Cookie Policy',
    'footer.copyright': '© {year} 1Platform Labs. All rights reserved.',

    // — Layout chrome —————————————————————————————————————————
    'layout.skipToContent': 'Skip to main content',
    'layout.logoLabel': '1Platform Home',
    'layout.rssTitle': '1Platform Blog',

    // — Shared components —————————————————————————————————————
    'check.yes': 'Yes',
    'check.no': 'No',
    'breadcrumb.aria': 'Breadcrumb',
    'breadcrumb.home': 'Home',
    'toc.title': 'On this page',
    'toc.aria': 'Table of contents',
    'related.title': 'Keep reading',
    'share.label': 'Share',
    'share.x': 'Share on X (Twitter)',
    'share.linkedin': 'Share on LinkedIn',
    'share.copyLink': 'Copy link',
    'share.copied': 'Link copied',
    'share.copyFailed': 'Could not copy the link',
    'code.copy': 'Copy code',
    'code.copied': 'Copied',
    'code.copyFailed': 'Failed',

    // — Legal document set —————————————————————————————————————
    'legal.eyebrow': 'Legal',
    'legal.lastUpdated': 'Last updated',
    'legal.docsAria': 'Legal documents',
    'legal.doc.terms': 'Terms of Service',
    'legal.doc.privacy': 'Privacy Policy',
    'legal.doc.cookies': 'Cookie Policy',

    // — Language switcher —————————————————————————————————————
    'lang.label': 'Language',
    'lang.aria.current': 'Language: {language}',
    'lang.aria.switchTo': 'View this page in {language}',
    'lang.unavailable': 'Not available in {language}',
  },
  es: {
    // — Cabecera ——————————————————————————————————————————————
    'nav.solutions': 'Soluciones',
    'nav.features': 'Funciones',
    'nav.pricing': 'Precios',
    'nav.docs': 'Docs',
    'nav.blog': 'Blog',
    'nav.aria.main': 'Navegación principal',
    'nav.aria.mobile': 'Navegación móvil',
    'nav.aria.toggleMenu': 'Abrir o cerrar el menú de navegación',
    'nav.aria.toggleSubmenu': 'Abrir o cerrar el menú {label}',
    'nav.aria.submenu': 'Menú {label}',

    'nav.solutions.onlineStore': 'Tienda online',
    'nav.solutions.website': 'Creador de sitios web',
    'nav.solutions.content': 'Contenido con IA',
    'nav.solutions.whitelabel': 'Panel de marca blanca',
    'nav.solutions.payments': 'Pagos y facturación',
    'nav.solutions.viewAll': 'Ver todas las soluciones',

    'cta.getStarted': 'Empezar gratis',
    'cta.launchStore': 'Lanza tu tienda',
    'cta.viewDocs': 'Ver la documentación',

    // — Pie de página —————————————————————————————————————————
    'footer.cta.title': 'Deja de hacer malabares con herramientas sueltas',
    'footer.cta.body':
      'Empieza con una sola plataforma. Vende por internet, emite facturas y publica contenido — desde un panel, una API y una sola factura.',
    'footer.col.solutions': 'Soluciones',
    'footer.col.resources': 'Recursos',
    'footer.col.company': 'Empresa',
    'footer.col.legal': 'Legal',
    'footer.link.forAgencies': 'Para agencias',
    'footer.link.forDevelopers': 'Para desarrolladores',
    'footer.link.allSolutions': 'Todas las soluciones',
    'footer.link.documentation': 'Documentación',
    'footer.link.apiReference': 'Referencia de la API',
    'footer.link.codeExamples': 'Ejemplos de código',
    'footer.link.changelog': 'Novedades',
    'footer.link.about': 'Nosotros',
    'footer.link.terms': 'Términos del servicio',
    'footer.link.privacy': 'Política de privacidad',
    'footer.link.cookies': 'Política de cookies',
    'footer.copyright': '© {year} 1Platform Labs. Todos los derechos reservados.',

    // — Estructura de la página ———————————————————————————————
    'layout.skipToContent': 'Saltar al contenido principal',
    'layout.logoLabel': 'Inicio de 1Platform',
    'layout.rssTitle': 'Blog de 1Platform',

    // — Componentes compartidos ———————————————————————————————
    'check.yes': 'Sí',
    'check.no': 'No',
    'breadcrumb.aria': 'Ruta de navegación',
    'breadcrumb.home': 'Inicio',
    'toc.title': 'En esta página',
    'toc.aria': 'Índice de contenidos',
    'related.title': 'Sigue leyendo',
    'share.label': 'Compartir',
    'share.x': 'Compartir en X (Twitter)',
    'share.linkedin': 'Compartir en LinkedIn',
    'share.copyLink': 'Copiar enlace',
    'share.copied': 'Enlace copiado',
    'share.copyFailed': 'No se pudo copiar el enlace',
    'code.copy': 'Copiar código',
    'code.copied': 'Copiado',
    'code.copyFailed': 'Error',

    // — Conjunto de documentos legales —————————————————————————
    'legal.eyebrow': 'Legal',
    'legal.lastUpdated': 'Última actualización',
    'legal.docsAria': 'Documentos legales',
    'legal.doc.terms': 'Términos del servicio',
    'legal.doc.privacy': 'Política de privacidad',
    'legal.doc.cookies': 'Política de cookies',

    // — Selector de idioma ————————————————————————————————————
    'lang.label': 'Idioma',
    'lang.aria.current': 'Idioma: {language}',
    'lang.aria.switchTo': 'Ver esta página en {language}',
    'lang.unavailable': 'No disponible en {language}',
  },
});
