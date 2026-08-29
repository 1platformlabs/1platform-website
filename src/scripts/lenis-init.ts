import Lenis from 'lenis';

const lenis = new Lenis({
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 2,
});

// The single scroll source (home epic, D-5): the WebGL scenes read the scroll
// from here instead of adding a second reader. Published on globalThis because
// the scenes live in a different script entry.
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
