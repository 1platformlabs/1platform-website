let cleanup: (() => void) | undefined;
function initializeChrome() {
  cleanup?.();
  const header = document.querySelector<HTMLElement>('.brand-header');
  const toggle = document.querySelector<HTMLButtonElement>('.brand-menu-toggle');
  const menu = document.querySelector<HTMLElement>('.brand-mobile-nav');
  if (!header || !toggle || !menu) return;
  const controller = new AbortController();
  const { signal } = controller;
  const setOpen = (open: boolean, focus = false) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', (open ? toggle.dataset.closeLabel : toggle.dataset.openLabel) ?? '');
    menu.hidden = !open;
    document.body.classList.toggle('brand-menu-open', open);
    if (focus) toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(menu.hidden), { signal });
  menu.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link) return;
    setOpen(false);
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.pathname !== location.pathname || !destination.hash) return;
    let id: string;
    try { id = decodeURIComponent(destination.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    const previous = target.getAttribute('tabindex');
    target.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
    target.addEventListener('blur', () => {
      if (previous === null) target.removeAttribute('tabindex');
      else target.setAttribute('tabindex', previous);
    }, { once: true, signal });
  }, { signal });
  document.addEventListener('keydown', (event) => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
    if (event.key !== 'Tab') return;
    const links = [...menu.querySelectorAll<HTMLAnchorElement>('a[href]')];
    const first = links[0]; const last = links.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); toggle.focus(); }
    else if (event.shiftKey && document.activeElement === toggle) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); toggle.focus(); }
    else if (!event.shiftKey && document.activeElement === toggle) { event.preventDefault(); first?.focus(); }
  }, { signal });
  const desktop = window.matchMedia('(min-width: 1291px)');
  desktop.addEventListener('change', () => { if (desktop.matches) setOpen(false); }, { signal });
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 28);
  window.addEventListener('scroll', update, { passive: true, signal });
  update();
  cleanup = () => { controller.abort(); setOpen(false); };
}
initializeChrome();
document.addEventListener('astro:page-load', initializeChrome);
document.addEventListener('astro:before-swap', () => cleanup?.());
