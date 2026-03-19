let pipelineObserver: IntersectionObserver | null = null;

function initPipeline() {
  const pipeline = document.querySelector('.pipeline');
  if (!pipeline) return;

  const steps = pipeline.querySelectorAll('.pipeline__step');
  if (!steps.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    steps.forEach((step) => step.classList.add('is-active'));
    return;
  }

  pipelineObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const step = entry.target;
          if (!(step instanceof HTMLElement)) return;
          const index = parseInt(step.dataset.index || '0', 10);
          setTimeout(() => {
            step.classList.add('is-active');
          }, index * 200);
        }
      });
    },
    {
      threshold: 0.5,
      rootMargin: '0px 0px -100px 0px',
    }
  );

  steps.forEach((step) => pipelineObserver!.observe(step));
}

// Cleanup observer before Astro swaps the page (View Transitions)
document.addEventListener('astro:before-swap', () => {
  pipelineObserver?.disconnect();
  pipelineObserver = null;
});

document.addEventListener('astro:page-load', initPipeline);
