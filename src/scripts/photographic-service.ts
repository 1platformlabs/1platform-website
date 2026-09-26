import { calculateLandingAmount } from '../lib/landing-calculator';

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function readConfig(root: HTMLElement): JsonRecord {
  try {
    const value: unknown = JSON.parse(root.querySelector('#landing-config')?.textContent ?? '{}');
    return isRecord(value) ? value : {};
  } catch {
    // The server-rendered page remains usable if enhancement data is unavailable.
    return {};
  }
}

function section(config: JsonRecord, name: string): JsonRecord {
  const value = config[name];
  return isRecord(value) ? value : {};
}

function stringValue(config: JsonRecord, key: string): string | undefined {
  const value = config[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

let activeRoot: HTMLElement | null = null;
let releaseEnhancements: (() => void) | undefined;

function initPhotographicService() {
  const root = document.querySelector<HTMLElement>('.photographic-service');
  if (!root || root === activeRoot) return;
  releaseEnhancements?.();
  activeRoot = root;
  const controller = new AbortController();
  const { signal } = controller;
  const observers: IntersectionObserver[] = [];
  const config = readConfig(root);
  releaseEnhancements = () => {
    controller.abort();
    observers.forEach((observer) => observer.disconnect());
    activeRoot = null;
  };

  const header = root.querySelector<HTMLElement>('.site-header');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', updateHeader, { passive: true, signal });
  updateHeader();

  const hero = root.querySelector<HTMLElement>('.hero');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sequenceStates = [...root.querySelectorAll<HTMLElement>('[data-sequence]')]
    .map((element) => ({ element, visible: false }));
  const replayButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-replay]')];
  let heroVisible = true;

  function updateMotion() {
    const reduced = reducedMotion.matches;
    if (hero) {
      hero.dataset.motion = reduced ? 'reduced' : !heroVisible || document.hidden ? 'paused' : 'playing';
      if (reduced) hero.removeAttribute('data-enter');
    }
    sequenceStates.forEach(({ element, visible }) => {
      element.dataset.playing = String(visible && !reduced && !document.hidden);
      if (reduced) delete element.dataset.animated;
      else if (visible) element.dataset.animated = '';
    });
    replayButtons.forEach((button) => { button.hidden = reduced; });
  }

  if (hero) {
    if (!reducedMotion.matches) hero.setAttribute('data-enter', '');
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) heroVisible = entry.isIntersecting;
      updateMotion();
    });
    observer.observe(hero);
    observers.push(observer);
  }
  reducedMotion.addEventListener('change', updateMotion, { signal });
  document.addEventListener('visibilitychange', updateMotion, { signal });
  const sequenceObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const state = sequenceStates.find((item) => item.element === entry.target);
      if (state) state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.18;
    });
    updateMotion();
  }, { threshold: [0, 0.18] });
  sequenceStates.forEach(({ element }) => sequenceObserver.observe(element));
  observers.push(sequenceObserver);
  replayButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (reducedMotion.matches) return;
      const selector = button.dataset.replay === 'flow' ? '.flow-panel' : '.service-card';
      root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        // Rewind the approved finite sequences; no animation timers or layout reads.
        element.getAnimations({ subtree: true }).forEach((animation) => { animation.currentTime = 0; });
      });
    }, { signal });
  });
  updateMotion();

  const menuToggle = root.querySelector<HTMLButtonElement>('.menu-toggle');
  const menu = root.querySelector<HTMLElement>('#mobile-menu');
  if (menuToggle && menu) {
    const navigationCopy = section(config, 'navigationLabels');
    const openLabel = stringValue(navigationCopy, 'open') ?? menuToggle.dataset.openLabel ?? menuToggle.getAttribute('aria-label');
    const closeLabel = stringValue(navigationCopy, 'close') ?? menuToggle.dataset.closeLabel;
    const closeMenu = (returnFocus = false) => {
      menu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
      if (openLabel) menuToggle.setAttribute('aria-label', openLabel);
      if (returnFocus) menuToggle.focus();
    };
    closeMenu();
    menuToggle.hidden = false;
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') !== 'true';
      menu.hidden = !open;
      menuToggle.setAttribute('aria-expanded', String(open));
      const label = open ? closeLabel : openLabel;
      if (label) menuToggle.setAttribute('aria-label', label);
    }, { signal });
    menu.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
        // Local section links transfer focus to the destination without blocking native scrolling.
        if (link.origin !== location.origin || link.pathname !== location.pathname || !link.hash) return;
        let id: string;
        try { id = decodeURIComponent(link.hash.slice(1)); } catch { return; }
        const destination = document.getElementById(id);
        if (!destination || !root.contains(destination)) return;
        destination.setAttribute('tabindex', '-1');
        destination.focus({ preventScroll: true });
      }, { signal });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) closeMenu(true);
    }, { signal });
    document.addEventListener('click', (event) => {
      if (event.target instanceof Node && !menu.hidden && !menu.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
    }, { signal });
    window.matchMedia('(min-width: 981px)').addEventListener('change', (event) => {
      if (event.matches) closeMenu();
    }, { signal });
  }

  const calculator = root.querySelector<HTMLFormElement>('#price-calculator');
  const amountField = root.querySelector<HTMLInputElement>('#calc-amount');
  const calcError = root.querySelector<HTMLElement>('#calc-error');
  const calcStatus = root.querySelector<HTMLElement>('#calc-status');
  const calcNet = root.querySelector<HTMLElement>('#calc-net');
  const calcFee = root.querySelector<HTMLElement>('#calc-fee');
  const calculatorCopy = section(config, 'calculator');
  const rate = calculatorCopy.commissionBasisPoints;
  const changed = stringValue(calculatorCopy, 'changed');
  const empty = stringValue(calculatorCopy, 'empty');
  const invalid = stringValue(calculatorCopy, 'invalid');
  if (
    calculator && amountField && calcError && calcStatus && calcNet && calcFee &&
    calculatorCopy.currency === 'GTQ' && typeof rate === 'number' &&
    Number.isSafeInteger(rate) && rate >= 0 && rate <= 10_000 && changed && empty && invalid
  ) {
    const money = new Intl.NumberFormat(document.documentElement.lang, { style: 'currency', currency: 'GTQ', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2 });
    const clearCalculation = () => {
      calcNet.textContent = '—';
      calcFee.textContent = '—';
      calcError.textContent = '';
      amountField.removeAttribute('aria-invalid');
      calcStatus.textContent = changed;
    };
    const calculate = () => {
      clearCalculation();
      const result = calculateLandingAmount(amountField.value, rate);
      if (!result.ok) {
        calcStatus.textContent = empty;
        calcError.textContent = invalid;
        amountField.setAttribute('aria-invalid', 'true');
        return false;
      }
      calcNet.textContent = money.format(result.net / 100);
      calcFee.textContent = money.format(result.fee / 100);
      calcStatus.textContent = '';
      return true;
    };
    amountField.disabled = false;
    calculator.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((button) => {
      button.disabled = false;
      button.hidden = false;
    });
    amountField.addEventListener('input', clearCalculation, { signal });
    calculator.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!calculate()) amountField.focus();
    }, { signal });
    calculate();
  }

  const demo = root.querySelector<HTMLElement>('.panel-demo');
  if (demo) {
    const panelCopy = section(config, 'panel');
    const tabs = [...demo.querySelectorAll<HTMLButtonElement>('[data-panel-tab]')];
    const tablist = demo.querySelector<HTMLElement>('.panel-tabs');
    const narrow = window.matchMedia('(max-width: 760px)');
    const screens = tabs.map((tab) => {
      const name = tab.dataset.panelTab;
      const screen = name ? document.getElementById(`panel-${name}`) : null;
      return screen && demo.contains(screen) ? screen : null;
    });
    if (tablist && tabs.length > 0 && screens.every((screen) => screen !== null)) {
      const syncOrientation = () => tablist.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
      tablist.setAttribute('role', 'tablist');
      tablist.hidden = false;
      syncOrientation();
      narrow.addEventListener('change', syncOrientation, { signal });
      tabs.forEach((tab, index) => {
        const screen = screens[index];
        if (!screen) return;
        tab.hidden = false;
        tab.setAttribute('role', 'tab');
        tab.id ||= `panel-tab-${tab.dataset.panelTab}`;
        tab.setAttribute('aria-controls', screen.id);
        screen.setAttribute('role', 'tabpanel');
        screen.setAttribute('aria-labelledby', tab.id);
        screen.tabIndex = 0;
      });
      const select = (name: string | undefined, moveFocus = false) => {
        const activeIndex = tabs.findIndex((tab) => tab.dataset.panelTab === name);
        if (activeIndex < 0) return;
        tabs.forEach((tab, index) => {
          const active = index === activeIndex;
          tab.setAttribute('aria-selected', String(active));
          tab.tabIndex = active ? 0 : -1;
          if (active && moveFocus) tab.focus();
          const screen = screens[index];
          if (screen) screen.hidden = !active;
        });
        const locationLabel = demo.querySelector<HTMLElement>('#panel-location');
        if (locationLabel) locationLabel.textContent = tabs[activeIndex].textContent?.trim() ?? '';
      };
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => select(tab.dataset.panelTab), { signal });
        tab.addEventListener('keydown', (event) => {
          const previous = narrow.matches ? 'ArrowLeft' : 'ArrowUp';
          const next = narrow.matches ? 'ArrowRight' : 'ArrowDown';
          if (![previous, next, 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
            (index + (event.key === next ? 1 : -1) + tabs.length) % tabs.length;
          select(tabs[target]?.dataset.panelTab, true);
        }, { signal });
      });
      demo.querySelectorAll<HTMLButtonElement>('[data-panel-go]').forEach((button) => {
        button.hidden = false;
        button.addEventListener('click', () => select(button.dataset.panelGo, true), { signal });
      });
      select(tabs[0].dataset.panelTab);
    }
    const filters = [...demo.querySelectorAll<HTMLButtonElement>('[data-panel-filter]')];
    const rows = [...demo.querySelectorAll<HTMLTableRowElement>('#panel-transaction-rows [data-panel-movement]')];
    const status = demo.querySelector<HTMLElement>('#panel-filter-status');
    const filter = (type: string | undefined, announce = true) => {
      let count = 0;
      rows.forEach((row) => {
        row.hidden = type !== 'all' && row.dataset.panelMovement !== type;
        if (!row.hidden) count += 1;
      });
      filters.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.panelFilter === type)));
      const label = stringValue(panelCopy, count === 1 ? 'filterStatusOne' : 'filterStatusMany');
      if (status && announce && label) status.textContent = label.replace('{count}', String(count));
    };
    if (rows.length > 0) {
      filters.forEach((button) => {
        button.hidden = false;
        button.addEventListener('click', () => filter(button.dataset.panelFilter), { signal });
      });
      filter('all', false);
    }
  }
  root.dataset.enhanced = 'true';
}

initPhotographicService();
document.addEventListener('astro:page-load', initPhotographicService);
document.addEventListener('astro:before-swap', () => releaseEnhancements?.());
