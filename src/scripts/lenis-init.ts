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

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = (anchor as HTMLAnchorElement).getAttribute('href');
    if (href && href !== '#') {
      e.preventDefault();
      lenis.scrollTo(href);
    }
  });
});
