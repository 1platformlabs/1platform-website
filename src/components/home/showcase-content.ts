import type { IconName } from '@components/icons';
import { i18nKey } from '@i18n/key';
import { SHOWCASE_NODE_COUNT, type ShowcaseSlug } from './media-slots';

/**
 * What each showcase panel shows: the solution, its destination, and the
 * nodes — the steps a business actually goes through with that module, drawn
 * as connected cards in the language of `InterconnectDiagram`.
 *
 * Coordinates are the desktop board (780 × 559, measured on the reference:
 * panel at x 650, cards of 170–330 px, connectors between the card that
 * produces something and the card that consumes it). Below 769 px the board
 * becomes a three-column grid and the connectors are not drawn — the nodes are
 * what carries the meaning; the wires are how the reference draws it at
 * desktop widths.
 *
 * Copy keys resolve in the i18n catalogue (`pages/home.ts`): the tab label is
 * the solution's own name from the header (`nav.solutions.*`), so the showcase
 * can never disagree with the menu about what a module is called.
 */

export type ShowcaseNode = {
  /** 1-based, matches the media slot `showcase-<slug>-node-<n>`. */
  n: number;
  /** Board position and card width in the 780 × 559 desktop board. */
  x: number;
  y: number;
  w: number;
  /** A node that links to another solution's page (Website, Whitelabel). */
  href?: string;
};

export type ShowcaseSolution = {
  slug: ShowcaseSlug;
  /** `nav.solutions.*` key — the tab label and the entry row. */
  labelKey: string;
  href: string;
  icon: IconName;
  nodes: ShowcaseNode[];
  /** Pairs of node indices (1-based) a connector joins, source → target. */
  wires: [number, number][];
};

export const SHOWCASE: ShowcaseSolution[] = [
  {
    slug: 'store',
    labelKey: i18nKey('nav.solutions.onlineStore'),
    href: '/solutions/online-store/',
    icon: 'cart',
    nodes: [
      { n: 1, x: 36, y: 60, w: 236 },
      { n: 2, x: 320, y: 36, w: 196 },
      { n: 3, x: 320, y: 300, w: 196 },
      { n: 4, x: 556, y: 130, w: 196 },
      { n: 5, x: 556, y: 350, w: 170, href: '/solutions/website/' },
    ],
    wires: [
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 5],
    ],
  },
  {
    slug: 'payments',
    labelKey: i18nKey('nav.solutions.payments'),
    href: '/payments-invoicing/',
    icon: 'card',
    nodes: [
      { n: 1, x: 40, y: 48, w: 220 },
      { n: 2, x: 40, y: 318, w: 196 },
      { n: 3, x: 310, y: 120, w: 260 },
      { n: 4, x: 600, y: 200, w: 150 },
    ],
    wires: [
      [1, 3],
      [2, 3],
      [3, 4],
    ],
  },
  {
    slug: 'content',
    labelKey: i18nKey('nav.solutions.content'),
    href: '/solutions/content/',
    icon: 'content',
    nodes: [
      { n: 1, x: 36, y: 200, w: 170 },
      { n: 2, x: 250, y: 40, w: 236 },
      { n: 3, x: 250, y: 318, w: 196 },
      { n: 4, x: 530, y: 100, w: 220 },
      { n: 5, x: 560, y: 340, w: 190, href: '/solutions/whitelabel/' },
    ],
    wires: [
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 5],
    ],
  },
  {
    slug: 'deliveries',
    labelKey: i18nKey('nav.solutions.deliveries'),
    href: '/solutions/deliveries/',
    icon: 'truck',
    nodes: [
      { n: 1, x: 60, y: 120, w: 236 },
      { n: 2, x: 340, y: 240, w: 196 },
      { n: 3, x: 580, y: 80, w: 170 },
    ],
    wires: [
      [1, 2],
      [2, 3],
    ],
  },
  {
    slug: 'ads',
    labelKey: i18nKey('nav.solutions.ads'),
    href: '/solutions/ads/',
    icon: 'megaphone',
    nodes: [
      { n: 1, x: 40, y: 80, w: 260 },
      { n: 2, x: 360, y: 200, w: 196 },
      { n: 3, x: 590, y: 60, w: 170 },
    ],
    wires: [
      [1, 2],
      [2, 3],
    ],
  },
];

/* A node card is its media (a square, the card's width minus 16 px of padding)
   under a 32 px label row; the chip overlaps the media's top-left corner. */
export const NODE_LABEL_ROW = 32;
export const NODE_PADDING = 8;
export function nodeHeight(w: number): number {
  return NODE_LABEL_ROW + (w - 2 * NODE_PADDING) + NODE_PADDING;
}

/** Cubic connector from a node's right edge to the next node's left edge. */
export function wirePath(from: ShowcaseNode, to: ShowcaseNode): string {
  const x1 = from.x + from.w;
  const y1 = from.y + nodeHeight(from.w) / 2;
  const x2 = to.x;
  const y2 = to.y + nodeHeight(to.w) / 2;
  const dx = Math.max(40, (x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

// The content table and the media contract must agree, or a panel would ask
// for a slot that no capture can ever fill.
for (const solution of SHOWCASE) {
  if (solution.nodes.length !== SHOWCASE_NODE_COUNT[solution.slug]) {
    throw new Error(
      `[showcase] ${solution.slug} declares ${solution.nodes.length} nodes but media-slots.ts expects ${SHOWCASE_NODE_COUNT[solution.slug]}`,
    );
  }
}
