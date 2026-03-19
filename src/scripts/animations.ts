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
        if (entry.isIntersecting) {
          const el = entry.target;
          if (!(el instanceof HTMLElement)) return;
          const delay = el.dataset.delay ? parseInt(el.dataset.delay, 10) : 0;
          setTimeout(() => {
            el.classList.add('is-visible');
          }, delay);
          observer.unobserve(el);
        }
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

function initStaggeredCards() {
  if (getPrefersReducedMotion()) return;

  document.querySelectorAll('.stagger-grid').forEach((grid) => {
    const cards = grid.querySelectorAll('.reveal');
    cards.forEach((card, i) => {
      if (card instanceof HTMLElement) {
        card.dataset.delay = String(i * 100);
      }
    });
  });
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count-to]');
  if (!counters.length) return;

  const prefersReducedMotion = getPrefersReducedMotion();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          if (!(el instanceof HTMLElement)) return;
          const target = parseInt(el.dataset.countTo || '0', 10);
          const suffix = el.dataset.countSuffix || '';
          const prefix = el.dataset.countPrefix || '';
          const duration = prefersReducedMotion ? 0 : 1500;

          if (duration === 0) {
            el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
            observer.unobserve(el);
            return;
          }

          let start = 0;
          const startTime = performance.now();

          function animate(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);

            if (current !== start) {
              start = current;
              el.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
            }
          }

          requestAnimationFrame(animate);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.3 }
  );

  activeObservers.push(observer);

  counters.forEach((counter) => observer.observe(counter));
}

// Cleanup observers before Astro swaps the page (View Transitions)
document.addEventListener('astro:before-swap', cleanupObservers);

document.addEventListener('astro:page-load', () => {
  initStaggeredCards();
  initRevealAnimations();
  initCounters();
});
