/**
 * Mounts the home's WebGL scenes after the page is interactive (D-5).
 *
 * The CSS 3D layer is the page: it is what paints first, what the LCP is
 * measured on, and what anyone without WebGL, without JavaScript or with
 * `prefers-reduced-motion` keeps. This module upgrades it when there is
 * headroom — `astro:page-load` → `requestIdleCallback` → dynamic import — and
 * tears everything down in `astro:before-swap`, because ViewTransitions
 * re-runs page-load on every navigation and an undisposed renderer leaks a
 * WebGL context each time.
 */

type SceneModule = { mount(canvas: HTMLCanvasElement): Promise<() => void> };

const REGISTRY: Record<string, () => Promise<SceneModule>> = {
  fan: () => import('@components/home/fan-scene'),
  carousel: () => import('@components/home/carousel-scene'),
};

let cleanups: Array<() => void> = [];

function boot() {
  if (!globalThis.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  // Phones keep the CSS 3D layer: the scene's camera is calibrated against the
  // desktop stage, and a hero animation is the last thing a phone's battery
  // needs. The layer IS the design; WebGL is only ever an upgrade.
  if (!globalThis.matchMedia('(min-width: 769px)').matches) return;

  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-scene]'));
  if (canvases.length === 0) return;

  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2')) return;

  const idle: (cb: () => void) => void =
    'requestIdleCallback' in globalThis
      ? (cb) => (globalThis as unknown as { requestIdleCallback(cb: () => void): void }).requestIdleCallback(cb)
      : (cb) => setTimeout(cb, 200);

  idle(async () => {
    for (const canvas of canvases) {
      const load = REGISTRY[canvas.dataset.scene ?? ''];
      if (!load) continue;
      try {
        const cleanup = await (await load()).mount(canvas);
        cleanups.push(cleanup);
      } catch {
        // The CSS layer stays — a failed upgrade must never cost the page.
      }
    }
  });
}

document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', () => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});
