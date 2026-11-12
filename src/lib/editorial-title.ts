/**
 * The document title of an editorial home: «<home title> · <site name>».
 *
 * alta-de-blog-desde-el-panel (found by /verify-epic-e2e): a blog created from
 * the panel is born with its home title EQUAL to its name, and the page title
 * read «Péptidos GT · Péptidos GT» in the tab and in search results. When the two
 * say the same thing (ignoring case and surrounding spaces) the name goes once.
 */
export function editorialHomeTitle(homeTitle: string | null | undefined, siteName: string): string {
  const home = (homeTitle ?? '').trim()
  if (!home) return siteName
  if (home.toLocaleLowerCase() === siteName.trim().toLocaleLowerCase()) return home
  return `${home} · ${siteName}`
}
