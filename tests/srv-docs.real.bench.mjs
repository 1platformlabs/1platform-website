import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const out = process.env.SRV_EVIDENCE + "/public";
mkdirSync(out, { recursive: true });
for (const width of [1440, 390])
  test(`real manifest landing and guide links ${width}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      ignoreHTTPSErrors: true,
      reducedMotion: "reduce",
      locale: "es-GT",
    });
    const page = await context.newPage();
    const results = [],
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      for (const lang of ["es", "en"]) {
        const home = "https://127.0.0.1:4822/" + (lang === "es" ? "es/" : "");
        await context.addCookies([
          { name: "1p_lang", value: lang, url: "https://127.0.0.1:4822" },
        ]);
        await page.goto(home);
        await expect(page.locator(".capability-documentation")).toHaveCount(10);
        await page
          .locator(".capability-documentation")
          .first()
          .scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${out}/landing-${lang}-${width}.png` });
        const links = await page
          .locator(".capability-documentation")
          .evaluateAll((es) =>
            es.map((e) => ({
              href: e.href,
              label: e.getAttribute("aria-label"),
            })),
          );
        const select = page.locator("button.capability").first();
        const selected = await select.getAttribute("aria-pressed");
        await select.click();
        await expect(select).toHaveAttribute(
          "aria-pressed",
          selected === "true" ? "false" : "true",
        );
        await expect(page).toHaveURL(home);
        for (let i = 0; i < links.length; i++) {
          await page.goto(home);
          const link = page.locator(".capability-documentation").nth(i);
          await link.click();
          await expect(page.locator("main h1")).toBeVisible();
          const heading = await page.locator("main h1").innerText();
          expect(heading).not.toMatch(/not found|no encontrada/i);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          );
          expect(overflow).toBeFalsy();
          results.push({ lang, href: links[i].href, heading, overflow });
        }
      }
      for (const [name, path] of [
        ["analytics", "analitica/trafico-del-sitio"],
        ["heatmap", "analitica/mapas-de-calor"],
        ["email", "correo-transaccional/enviar-y-consultar"],
        ["notices", "plataforma/avisos"],
        ["webhooks", "plataforma/webhooks-entregas"],
      ]) {
        const response = await page.goto(
          "https://127.0.0.1:5501/docs/saas/1platform-api/" + path + "/",
        );
        await expect(page.locator("main h1")).toBeVisible();
        expect(response.status()).toBe(200);
        const axe = (await new AxeBuilder({ page }).analyze()).violations;
        results.push({
          name,
          heading: await page.locator("main h1").innerText(),
          axe: axe.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
        await page.screenshot({ path: `${out}/${name}-${width}.png` });
        expect(axe).toEqual([]);
      }
      expect(errors).toEqual([]);
    } finally {
      writeFileSync(
        `${out}/links-${width}.json`,
        JSON.stringify({ results, errors }, null, 2),
      );
      await context.close();
    }
  });
