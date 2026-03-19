import Lenis from 'lenis';

const lenis = new Lenis({
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 2,
});

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
