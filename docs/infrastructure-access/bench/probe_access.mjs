// Sonda de navegador del banco de acceso (website + developer, rama o control).
// Uso: node probe_access.mjs <web-port> <dev-port> <out-dir> [--expect-control]
// Devuelve exit 1 si alguna aserción falla. Capturas en <out-dir>.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const [webPort, devPort, out] = process.argv.slice(2)
const control = process.argv.includes('--expect-control')
mkdirSync(out, { recursive: true })
const WEB = `http://1platform.pro:${webPort}`
const DEV = `http://developer.1platform.pro:${devPort}`
const HOSTS = ['1platform.pro', 'medipago.gt', 'vendefacil.gt', 'sin-acceso.e2e-ls.test', 'developer.1platform.pro']
const LOGIN = 'https://app.1platform.pro/app/auth/login'
const WIDTHS = [320, 390, 844, 1440]
const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }

const browser = await chromium.launch({ args: [`--host-resolver-rules=${HOSTS.map(h => `MAP ${h} 127.0.0.1`).join(',')}`] })

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}
async function contrastOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel); if (!el) return null
    const parse = (c) => {
      let m = c.match(/rgba?\(([^)]+)\)/)
      if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 } }
      m = c.match(/color\(srgb ([^)]+)\)/)
      if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p[3] ?? 1 } }
      return null
    }
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const fg = parse(getComputedStyle(el).color)
    // Fondo realmente pintado bajo el elemento: primera capa opaca en su centro
    // (la cabecera es translúcida sobre el hero, así que subir por ancestros mide el body).
    const rect = el.getBoundingClientRect()
    const stack = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    // Conservador: se componen las capas translúcidas sobre el primer fondo
    // OPACO (los degradados oscuros del hero se ignoran: sólo podrían mejorarlo).
    const layers = []
    let base = { r: 255, g: 255, b: 255 }
    for (const n of stack.slice(1)) { const c = parse(getComputedStyle(n).backgroundColor); if (!c || c.a === 0) continue; if (c.a >= 0.999) { base = c; break } layers.push(c) }
    let bg = base
    for (const c of layers.reverse()) bg = { r: c.r * c.a + bg.r * (1 - c.a), g: c.g * c.a + bg.g * (1 - c.a), b: c.b * c.a + bg.b * (1 - c.a) }
    const [a, b] = [lum(fg) + 0.05, lum(bg) + 0.05]
    return Math.round((Math.max(a, b) / Math.min(a, b)) * 100) / 100
  }, selector)
}

// ── Website: cabecera, menú, pie por ancho e idioma ───────────────────────
for (const [lang, home, accessPath, requestPath, entry] of [['es', '/es/', '/es/acceso/', '/es/solicitar-acceso/', 'Acceder'], ['en', '/', '/access/', '/request-access/', 'Access']]) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await ctx.newPage()
    const r = await page.goto(WEB + home, { waitUntil: 'networkidle' })
    const tag = `web ${lang} ${width}px`
    check(`${tag} home 200`, r.status() === 200, String(r.status()))
    const headerAccess = page.locator('header .brand-access[data-access-entry]')
    if (control) {
      check(`${tag} CONTROL sin Acceder en cabecera`, (await headerAccess.count()) === 0)
      await ctx.close(); continue
    }
    check(`${tag} Acceder visible en cabecera`, await headerAccess.isVisible())
    check(`${tag} texto «${entry}»`, (await headerAccess.textContent())?.trim() === entry)
    check(`${tag} destino ${accessPath}`, new URL(await headerAccess.getAttribute('href'), WEB).pathname === accessPath)
    const box = await headerAccess.boundingBox()
    check(`${tag} objetivo táctil ≥44px`, box && box.height >= 44, box && `${Math.round(box.width)}x${Math.round(box.height)}`)
    const ratio = await contrastOf(page, 'header .brand-access')
    check(`${tag} contraste Acceder ≥4.5`, ratio >= 4.5, String(ratio))
    check(`${tag} sin overflow horizontal`, (await overflow(page)) <= 0, String(await overflow(page)))
    const footer = page.locator('footer.brand-footer')
    check(`${tag} pie con Acceder`, (await footer.locator(`a[data-access-entry][href$="${accessPath}"]`).count()) === 1)
    check(`${tag} pie con Solicitar`, (await footer.locator(`a[href$="${requestPath}"]`).count()) === 1)
    await page.screenshot({ path: `${out}/web-${lang}-${width}-cabecera.png` })
    const toggle = page.locator('.brand-menu-toggle')
    if (await toggle.isVisible()) {
      await toggle.click()
      const menu = page.locator('#brand-mobile-nav')
      check(`${tag} menú abre`, await menu.isVisible())
      check(`${tag} menú con Acceder`, await menu.locator(`a[data-access-entry][href$="${accessPath}"]`).isVisible())
      check(`${tag} menú sin overflow`, (await overflow(page)) <= 0)
      await page.screenshot({ path: `${out}/web-${lang}-${width}-menu.png` })
      await page.keyboard.press('Escape')
      check(`${tag} Escape cierra`, await menu.isHidden())
      check(`${tag} foco vuelve al botón`, await toggle.evaluate((el) => el === document.activeElement))
    } else {
      // Teclado en escritorio: Tab llega a Acceder antes que al CTA de contacto.
      await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); document.body.setAttribute('tabindex', '-1'); document.body.focus(); document.body.removeAttribute('tabindex') })
      let reached = false
      for (let i = 0; i < 25 && !reached; i++) { await page.keyboard.press('Tab'); reached = await headerAccess.evaluate((el) => el === document.activeElement) }
      check(`${tag} Tab alcanza Acceder`, reached)
      if (reached) {
        const outline = await headerAccess.evaluate((el) => { const s = getComputedStyle(el); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 })
        check(`${tag} foco visible`, outline)
        await page.screenshot({ path: `${out}/web-${lang}-${width}-foco.png` })
      }
    }
    await footer.screenshot({ path: `${out}/web-${lang}-${width}-pie.png` })
    await ctx.close()
  }
  // Páginas de acceso y solicitud
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await ctx.newPage()
    const ra = await page.goto(WEB + accessPath, { waitUntil: 'networkidle' })
    const tag = `web ${lang} ${width}px ${accessPath}`
    if (control) { check(`${tag} CONTROL responde`, [200, 404].includes(ra.status()), String(ra.status())); await ctx.close(); continue }
    check(`${tag} 200`, ra.status() === 200, String(ra.status()))
    check(`${tag} diseño infraestructura`, (await page.locator('body[data-access-layout="infrastructure"]').count()) === 1)
    const login = page.locator(`a[href="${LOGIN}"]`)
    check(`${tag} Iniciar sesión → login aprobado`, (await login.count()) >= 1)
    check(`${tag} enlace a solicitud`, (await page.locator(`a[href$="${requestPath}"]`).count()) >= 1)
    check(`${tag} noindex`, ((await page.locator('meta[name="robots"]').getAttribute('content')) || '').includes('noindex'))
    check(`${tag} sin overflow`, (await overflow(page)) <= 0)
    await page.screenshot({ path: `${out}/web-${lang}-${width}-acceso.png`, fullPage: true })
    const rr = await page.goto(WEB + requestPath, { waitUntil: 'networkidle' })
    check(`${tag} solicitud 200`, rr.status() === 200, String(rr.status()))
    const support = page.locator('a[href^="https://wa.me/50253946564"]')
    check(`${tag} solicitud → soporte del tenant con mensaje`, (await support.count()) >= 1 && (await support.first().getAttribute('href')).includes('text='))
    check(`${tag} solicitud sin overflow`, (await overflow(page)) <= 0)
    await page.screenshot({ path: `${out}/web-${lang}-${width}-solicitud.png`, fullPage: true })
    await ctx.close()
  }
}

// ── Aislamiento entre sitios ──────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const r1 = await page.goto(`http://sin-acceso.e2e-ls.test:${webPort}/es/`, { waitUntil: 'networkidle' })
  check('aislamiento: sitio sin activar 200', r1.status() === 200, String(r1.status()))
  check('aislamiento: sitio sin activar sin Acceder', (await page.locator('[data-access-entry]').count()) === 0)
  const r2 = await page.goto(`http://sin-acceso.e2e-ls.test:${webPort}/es/acceso/`)
  check('aislamiento: sitio sin activar /es/acceso/ 404', r2.status() === 404, String(r2.status()))
  const r3 = await page.goto(`http://medipago.gt:${webPort}/acceso/`, { waitUntil: 'networkidle' })
  check('aislamiento: medipago acceso 200', r3.status() === 200, String(r3.status()))
  check('aislamiento: medipago conserva su login', (await page.locator('a[href="https://app.medipago.gt/app/auth/login"]').count()) >= 1)
  check('aislamiento: medipago no apunta al login de 1Platform', (await page.locator(`a[href="${LOGIN}"]`).count()) === 0)
  const r4 = await page.goto(`http://vendefacil.gt:${webPort}/acceso/`, { waitUntil: 'networkidle' })
  check('aislamiento: vendefacil conserva su login', r4.status() === 200 && (await page.locator('a[href="https://app.vendefacil.gt/app/auth/login"]').count()) >= 1)
  await ctx.close()
}

// ── Developer: navbar, drawer, pie ────────────────────────────────────────
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await ctx.newPage()
  const r = await page.goto(DEV + '/docs/saas/1platform-api/getting-started', { waitUntil: 'networkidle' })
  const tag = `dev ${width}px`
  check(`${tag} 200`, r.status() === 200, String(r.status()))
  const nav = page.locator('.navbar .navbar__items a.navbar__access')
  if (control) { check(`${tag} CONTROL sin Acceder`, (await page.locator('a.navbar__access').count()) === 0); await ctx.close(); continue }
  const footerAccess = page.locator(`footer a[href="${WEB}/es/acceso/"]`)
  check(`${tag} pie con Acceder`, (await footerAccess.count()) === 1)
  check(`${tag} pie con Solicitar acceso`, (await page.locator(`footer a[href="${WEB}/es/solicitar-acceso/"]`).count()) === 1)
  check(`${tag} sin overflow`, (await overflow(page)) <= 0, String(await overflow(page)))
  if (await nav.isVisible()) {
    check(`${tag} Acceder en barra → website`, (await nav.getAttribute('href')) === `${WEB}/es/acceso/`)
    const ratio = await contrastOf(page, '.navbar .navbar__items a.navbar__access')
    check(`${tag} contraste ≥4.5`, ratio >= 4.5, String(ratio))
    const b = await nav.boundingBox(); check(`${tag} objetivo ≥44px`, b.height >= 44, `${Math.round(b.height)}`)
    await page.screenshot({ path: `${out}/dev-${width}-barra.png` })
  } else {
    const toggle = page.locator('.navbar__toggle')
    await toggle.click()
    const drawer = page.locator('.navbar-sidebar a.navbar__access')
    await page.waitForTimeout(600)
    // En páginas de docs el drawer nativo abre en el índice; «Acceder» vive en el panel principal.
    const back = page.locator('.navbar-sidebar__back')
    if (await back.isVisible()) { await back.click(); await page.waitForTimeout(600) }
    const db = await drawer.boundingBox()
    check(`${tag} drawer: Acceder dentro del viewport`, db && db.x >= 0 && db.x + db.width <= width, db && `${Math.round(db.x)},${Math.round(db.y)}`)
    check(`${tag} drawer con Acceder → website`, (await drawer.getAttribute('href')) === `${WEB}/es/acceso/`)
    check(`${tag} drawer sin overflow`, (await overflow(page)) <= 0)
    await page.screenshot({ path: `${out}/dev-${width}-drawer.png` })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    check(`${tag} Escape cierra drawer`, !(await page.locator('.navbar-sidebar--show, .navbar.navbar-sidebar--show').count()))
  }
  await page.locator('footer').screenshot({ path: `${out}/dev-${width}-pie.png` })
  await ctx.close()
}
// Recorrido completo: Developer → Acceder → página de acceso del website
if (!control) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(DEV + '/', { waitUntil: 'networkidle' })
  await Promise.all([page.waitForURL(`${WEB}/es/acceso/`), page.locator('.navbar__items a.navbar__access').click()])
  check('recorrido Developer → /es/acceso/ carga', (await page.locator(`a[href="${LOGIN}"]`).count()) >= 1)
  await page.screenshot({ path: `${out}/recorrido-dev-a-acceso.png` })
  await ctx.close()
}

await browser.close()
const failed = results.filter((x) => !x.ok)
console.log(`\nRESULTADO ${results.length - failed.length}/${results.length}`)
process.exit(failed.length ? 1 : 0)
