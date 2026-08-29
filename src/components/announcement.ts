/**
 * Which changelog entry the announcement bar shows.
 *
 * Pure on purpose: the bar itself reads the collection through
 * `src/i18n/collections.ts` (never a bare `getCollection`, which mixes
 * languages), and this is the one decision worth testing without a build —
 * the newest entry wins, and an empty changelog means no bar at all rather
 * than an invented announcement (D-9).
 */
export type AnnouncementEntry = { title: string; date: Date };

export function pickAnnouncement<T extends AnnouncementEntry>(entries: readonly T[]): T | null {
  if (entries.length === 0) return null;
  return entries.reduce((newest, e) => (e.date.valueOf() > newest.date.valueOf() ? e : newest));
}
