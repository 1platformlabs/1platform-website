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
 * One thing deliberately stays in English in both trees because it is brand,
 * not copy: the product name "1Platform". The slogan ("One platform. Every
 * solution.") lives with the home copy (`pages/home.ts`), where the section
 * that carries it is.
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
    'nav.aria.toggleMenu': 'Open or close the menu',

    'nav.solutions.onlineStore': 'Online Store',
    'nav.solutions.website': 'Website Builder',
    'nav.solutions.content': 'AI Content',
    'nav.solutions.deliveries': 'Deliveries',
    'nav.solutions.ads': 'Advertising',
    'nav.solutions.whitelabel': 'Whitelabel Dashboard',
    'nav.solutions.payments': 'Payments & Invoicing',
    'nav.solutions.viewAll': 'View all solutions',

    'cta.getStarted': 'Get Started Free',
    'cta.signIn': 'Sign In',
    'cta.launchStore': 'Launch Your Store',
    'cta.viewDocs': 'View Documentation',

    // — Announcement bar ————————————————————————————————————————
    'announcement.aria': 'Latest update',
    'announcement.cta': 'See what changed',

    // — Footer ————————————————————————————————————————————————
    // `footer.cta.body` is still read by /solutions/; the footer itself no
    // longer carries a closing CTA (LMW-10).
    'footer.cta.body':
      'Start with one platform. Sell online, issue invoices, and publish content — from one dashboard, one API, one bill.',
    'footer.col.product': 'Product',
    'footer.col.resources': 'Resources',
    'footer.col.company': 'Company',
    'footer.signup.title': 'Don’t miss out',
    'footer.signup.body': 'Enter your email for news and updates',
    'footer.signup.label': 'Email address',
    'footer.signup.placeholder': 'Enter your email',
    'footer.signup.submit': 'Send',
    'footer.signup.subject': 'Keep me posted about 1Platform',
    'footer.signup.status': 'Opening your email app…',
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
    'footer.link.cookiePreferences': 'Cookie preferences',
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
    // Three jobs, three keys. The visible label is deliberately terser than the
    // accessible name — collapsing them onto one key renamed the button AND
    // shortened its accessible name, which is an accessibility regression
    // wearing a rename's clothes.
    'code.copy': 'Copy',
    'code.copyAria': 'Copy code to clipboard',
    'code.copied': 'Copied!',
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
    'nav.aria.toggleMenu': 'Abrir o cerrar el menú',

    'nav.solutions.onlineStore': 'Tienda online',
    'nav.solutions.website': 'Creador de sitios web',
    'nav.solutions.content': 'Contenido con IA',
    'nav.solutions.deliveries': 'Envíos',
    'nav.solutions.ads': 'Publicidad',
    'nav.solutions.whitelabel': 'Panel de marca blanca',
    'nav.solutions.payments': 'Pagos y facturación',
    'nav.solutions.viewAll': 'Ver todas las soluciones',

    'cta.getStarted': 'Empieza gratis',
    'cta.signIn': 'Iniciar sesión',
    'cta.launchStore': 'Lanza tu tienda',
    'cta.viewDocs': 'Ver la documentación',

    // — Barra de novedades ————————————————————————————————————
    'announcement.aria': 'Última novedad',
    'announcement.cta': 'Ver qué cambió',

    // — Pie de página —————————————————————————————————————————
    'footer.cta.body':
      'Empieza con una sola plataforma. Vende por internet, emite facturas y publica contenido — desde un panel, una API y una sola factura.',
    'footer.col.product': 'Producto',
    'footer.col.resources': 'Recursos',
    'footer.col.company': 'Empresa',
    'footer.signup.title': 'No te lo pierdas',
    'footer.signup.body': 'Deja tu correo para recibir novedades',
    'footer.signup.label': 'Correo electrónico',
    'footer.signup.placeholder': 'Escribe tu correo',
    'footer.signup.submit': 'Enviar',
    'footer.signup.subject': 'Quiero recibir las novedades de 1Platform',
    'footer.signup.status': 'Abriendo tu aplicación de correo…',
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
    'footer.link.cookiePreferences': 'Preferencias de cookies',
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
    'code.copy': 'Copiar',
    'code.copyAria': 'Copiar el código al portapapeles',
    'code.copied': '¡Copiado!',
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
