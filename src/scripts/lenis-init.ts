import Lenis from 'lenis';

const lenis = new Lenis({
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 2,
});

// Keep one scroll source for anchored editorial navigation. Publishing it makes
// the same instance available to small progressive enhancements without a
// second scroll controller.
(globalThis as { __lenis?: Lenis }).__lenis = lenis;

function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  requestAnimationFrame(raf);
}

/**
 * Hand the keyboard to the anchor's target, the way native fragment navigation
 * does. Smooth scrolling cancels the browser's navigation, and with it the move
 * of the sequential focus starting point: the skip link kept focus and the next
 * Tab walked the header it had just asked to skip (#197). A non-focusable target
 * gets `tabindex="-1"` (focusable by script, never by Tab), and focusing it
 * without scrolling leaves the movement to Lenis.
 */
function moveFocusTo(target: HTMLElement) {
  if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

// Delegated on the document, so anchors rendered after a client-side (Astro)
// navigation are covered too; a per-anchor listener only saw the first page.
document.addEventListener('click', (event) => {
  // With no animation frame loop, leave scrolling and focus to the browser.
  if (prefersReducedMotion || event.defaultPrevented) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element | null)?.closest?.('a[href^="#"]');
  const href = anchor?.getAttribute('href');
  if (!href || href === '#') return;
  let target: HTMLElement | null = null;
  try {
    target = document.getElementById(decodeURIComponent(href.slice(1)));
  } catch {
    return;
  }
  if (!target) return;
  event.preventDefault();
  lenis.scrollTo(target);
  if (location.hash !== href) history.pushState(history.state, '', href);
  moveFocusTo(target);
});
