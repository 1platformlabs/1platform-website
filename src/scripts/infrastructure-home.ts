/** Progressive enhancement of an illustrative map; it never calls a service. */
let activeRoot: HTMLElement | null = null;
let release: (() => void) | undefined;

function initInfrastructureHome() {
  const root = document.querySelector<HTMLElement>('[data-infrastructure-home]');
  if (!root || root === activeRoot) return;
  release?.();
  activeRoot = root;
  const controller = new AbortController();
  const { signal } = controller;
  const capabilities = [...root.querySelectorAll<HTMLButtonElement>('[data-capability]')];
  const selectedList = root.querySelector<HTMLElement>('[data-selected-list]');
  const selectionCount = root.querySelector<HTMLElement>('[data-selection-count]');

  const updatePreview = () => {
    if (!selectedList || !selectionCount) return;
    const selected = capabilities.filter((button) => button.getAttribute('aria-pressed') === 'true');
    const items = selected.map((button) => {
      const item = document.createElement('li');
      item.textContent = button.dataset.capability ?? '';
      return item;
    });
    if (items.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = root.dataset.selectionEmpty ?? '';
      empty.className = 'is-empty';
      items.push(empty);
    }
    selectedList.replaceChildren(...items);
    const label = selected.length === 1 ? root.dataset.selectionOne : root.dataset.selectionMany;
    selectionCount.textContent = label?.replace('{count}', String(selected.length)) ?? '';
  };
  capabilities.forEach((button) => button.addEventListener('click', () => {
    const selected = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-selected', selected);
    updatePreview();
  }, { signal }));
  updatePreview();

  const more = root.querySelector<HTMLButtonElement>('[data-capabilities-more]');
  const extra = capabilities.slice(8);
  const setExpanded = (expanded: boolean) => {
    if (!more) return;
    extra.forEach(button => { button.hidden = !expanded; });
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = (expanded ? more.dataset.less : more.dataset.more) ?? '';
  };
  const revealHash = () => {
    const id = location.hash.slice(1);
    if (!id) return;
    const target = extra.find(button => button.id === id || [...button.querySelectorAll('[id]')].some(child => child.id === id));
    if (target) { setExpanded(true); target.scrollIntoView({block: 'start'}); }
  };
  if (more && extra.length) {
    more.hidden = false;
    setExpanded(false);
    more.addEventListener('click', () => setExpanded(more.getAttribute('aria-expanded') !== 'true'), {signal});
    window.addEventListener('hashchange', revealHash, {signal});
    revealHash();
  }

  const aiSwitch = root.querySelector<HTMLButtonElement>('[data-ai-switch]');
  const aiDemo = root.querySelector<HTMLElement>('[data-ai-demo]');
  const aiLabel = root.querySelector<HTMLElement>('[data-ai-switch-label]');
  const aiExamples = [...root.querySelectorAll<HTMLElement>('[data-ai-base][data-ai-on]')];
  aiSwitch?.addEventListener('click', () => {
    const enabled = aiSwitch.getAttribute('aria-pressed') !== 'true';
    aiSwitch.setAttribute('aria-pressed', String(enabled));
    aiDemo?.classList.toggle('is-enabled', enabled);
    if (aiLabel) aiLabel.textContent = (enabled ? root.dataset.aiEnabled : root.dataset.aiDisabled) ?? '';
    aiExamples.forEach((example) => {
      example.textContent = (enabled ? example.dataset.aiOn : example.dataset.aiBase) ?? '';
    });
  }, { signal });

  const hero = root.querySelector<HTMLElement>('.hero');
  let observer: IntersectionObserver | undefined;
  if (hero && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(([entry]) => {
      hero.classList.toggle('is-visible', entry?.isIntersecting === true);
    }, { threshold: 0.15 });
    observer.observe(hero);
  }
  const updateVisibility = () => root.classList.toggle('is-page-hidden', document.hidden);
  updateVisibility();
  document.addEventListener('visibilitychange', updateVisibility, { signal });
  release = () => {
    controller.abort();
    observer?.disconnect();
    activeRoot = null;
  };
}

initInfrastructureHome();
document.addEventListener('astro:page-load', initInfrastructureHome);
document.addEventListener('astro:before-swap', () => release?.());
