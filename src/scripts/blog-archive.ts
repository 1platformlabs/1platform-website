/** Progressive enhancement: links and GET form work without JavaScript.
 * The query carries filter state through reloads and browser history. */
let disposeArchive: (() => void) | undefined;
function initialiseArchive() {
  disposeArchive?.();
  const archive = document.querySelector<HTMLElement>('[data-blog-archive]');
  if (!archive) return;
  const controller = new AbortController();
  const { signal } = controller;
  const filters = [...archive.querySelectorAll<HTMLAnchorElement>('[data-filter]')];
  const rows = [...archive.querySelectorAll<HTMLElement>('.archive-item[data-category]')];
  const select = archive.querySelector<HTMLSelectElement>('#archive-topic');
  const counter = archive.querySelector<HTMLElement>('.filter-count');
  const validCategories = new Set(filters.map((filter) => filter.dataset.filter));
  function renderCategory(requested: string | null) {
    const category = requested && validCategories.has(requested) ? requested : 'all';
    filters.forEach((filter) => {
      if (filter.dataset.filter === category) filter.setAttribute('aria-current', 'true');
      else filter.removeAttribute('aria-current');
    });
    if (select) select.value = category;
    let visible = 0;
    rows.forEach((row) => {
      row.hidden = category !== 'all' && row.dataset.category !== category;
      if (!row.hidden) visible += 1;
    });
    const template = visible === 1 ? archive?.dataset.countOne : archive?.dataset.countOther;
    if (counter && template) counter.textContent = template.replace('__COUNT__', String(visible));
  }
  function navigateCategory(category: string) {
    const url = new URL(window.location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    if (url.href !== window.location.href) history.pushState(history.state, '', url);
    renderCategory(category);
  }
  filters.forEach((filter) => filter.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateCategory(filter.dataset.filter ?? 'all');
  }, { signal }));
  select?.addEventListener('change', () => navigateCategory(select.value), { signal });
  window.addEventListener('popstate', () => renderCategory(new URL(location.href).searchParams.get('category')), { signal });
  renderCategory(new URL(location.href).searchParams.get('category'));
  disposeArchive = () => controller.abort();
}
document.addEventListener('astro:page-load', initialiseArchive);
document.addEventListener('astro:before-swap', () => disposeArchive?.());
initialiseArchive();
