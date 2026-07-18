/**
 * Reveal-on-scroll — one sober fade-up, applied uniformly.
 *
 * Deliberately does NOT support per-element or per-index delays: the staggered
 * cascade (and the animated vanity counters that used to live here) read as
 * template choreography rather than as design.
 */

/** Active observers tracked for cleanup during View Transitions. */
let activeObservers: IntersectionObserver[] = [];

function cleanupObservers() {
  activeObservers.forEach((obs) => obs.disconnect());
  activeObservers = [];
}

function getPrefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initRevealAnimations() {
  if (getPrefersReducedMotion()) {
    document.querySelectorAll('.reveal').forEach((el) => {
      el.classList.add('is-visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  activeObservers.push(observer);

  document.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el);
  });
}

// Cleanup observers before Astro swaps the page (View Transitions)
document.addEventListener('astro:before-swap', cleanupObservers);

document.addEventListener('astro:page-load', () => {
  initRevealAnimations();
});
