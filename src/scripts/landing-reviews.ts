/* A module, not a global script: its bindings are its own. */
export {};

/**
 * Progressive enhancement of the reviews block (landing-reviews-tenant).
 *
 * Without this script every public review is visible and the controls stay
 * hidden. With it: the list starts at the tenant's page size, «show more» adds
 * one page and moves focus to the first new review, and the rating filter
 * narrows the list without touching the summary — the average and the
 * distribution are always over every public review, never over the filter or
 * the page.
 */
interface ClientCopy {
  of: string;
  reviewOne: string;
  reviewOther: string;
  starOne: string;
  starOther: string;
  moreAdded: string;
  filterUpdated: string;
  allShown: string;
}

let activeRoot: HTMLElement | null = null;
let release: (() => void) | undefined;

function readCopy(root: HTMLElement): ClientCopy | null {
  try {
    return JSON.parse(root.dataset.copy ?? '') as ClientCopy;
  } catch {
    return null;
  }
}

function initLandingReviews() {
  const root = document.querySelector<HTMLElement>('[data-landing-reviews]');
  if (!root || root === activeRoot) return;
  release?.();
  const copy = readCopy(root);
  const items = [...root.querySelectorAll<HTMLElement>('[data-lr-grid] > li')];
  const toolbar = root.querySelector<HTMLElement>('[data-lr-toolbar]');
  const select = root.querySelector<HTMLSelectElement>('[data-lr-filter]');
  const count = root.querySelector<HTMLElement>('[data-lr-count]');
  const moreWrap = root.querySelector<HTMLElement>('[data-lr-more-wrap]');
  const more = root.querySelector<HTMLButtonElement>('[data-lr-more]');
  const filteredEmpty = root.querySelector<HTMLElement>('[data-lr-filtered-empty]');
  const clear = root.querySelector<HTMLButtonElement>('[data-lr-clear]');
  const grid = root.querySelector<HTMLElement>('[data-lr-grid]');
  const status = root.querySelector<HTMLElement>('[data-lr-status]');
  if (!copy || items.length === 0 || !toolbar || !select || !count || !moreWrap || !more || !grid) return;

  activeRoot = root;
  const controller = new AbortController();
  const { signal } = controller;
  const pageSize = Number(root.dataset.pageSize) === 6 ? 6 : 3;
  let visible = pageSize;
  let rating = 0;

  const label = (shown: number, total: number) => {
    const noun = total === 1 ? copy.reviewOne : copy.reviewOther;
    const filter = rating ? ` · ${rating} ${rating === 1 ? copy.starOne : copy.starOther}` : '';
    return `${shown} ${copy.of} ${total} ${noun}${filter}`;
  };

  const render = (announce = '', focusIndex: number | null = null) => {
    const matching = items.filter((item) => !rating || Number(item.dataset.rating) === rating);
    const shown = matching.slice(0, visible);
    items.forEach((item) => {
      item.hidden = !shown.includes(item);
    });
    grid.hidden = matching.length === 0;
    if (filteredEmpty) filteredEmpty.hidden = matching.length > 0;
    moreWrap.hidden = matching.length <= shown.length;
    count.textContent = label(shown.length, matching.length);
    if (status) status.textContent = announce;
    if (focusIndex !== null) shown[focusIndex]?.querySelector<HTMLElement>('.lr-card')?.focus({ preventScroll: false });
  };

  select.addEventListener('change', () => {
    rating = Number(select.value) || 0;
    visible = pageSize;
    render(copy.filterUpdated);
  }, { signal });
  clear?.addEventListener('click', () => {
    rating = 0;
    select.value = '0';
    visible = pageSize;
    render(copy.allShown);
    select.focus();
  }, { signal });
  more.addEventListener('click', () => {
    const firstNew = visible;
    visible += pageSize;
    render(copy.moreAdded, firstNew);
  }, { signal });

  toolbar.hidden = false;
  render();
  root.dataset.enhanced = 'true';
  release = () => {
    controller.abort();
    activeRoot = null;
  };
}

initLandingReviews();
document.addEventListener('astro:page-load', initLandingReviews);
document.addEventListener('astro:before-swap', () => release?.());
