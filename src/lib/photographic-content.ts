import type { SiteTenant } from './site-api'
import { DISPLAY_FONT_STACKS } from './tenant-theme'
import { i18nKey } from '../i18n/key'
import { isAdvertisingChannel, nameAdvertisingChannel } from './advertising-channels'

/** Symbols of the composition's sprite that content may pick by name. */
export const ILLUSTRATION_ICONS = ['phone', 'link', 'receipt', 'chat', 'person', 'clock', 'team', 'home', 'card', 'truck', 'megaphone'] as const
type IllustrationIcon = typeof ILLUSTRATION_ICONS[number]
/** Anchors a tenant's solution shortcuts may point at, each to a block the page renders. */
const SOLUTION_ANCHORS = { '#cobros-presenciales': 'card1', '#enlaces-de-cobro': 'card2', '#facturacion': 'card3', '#delivery': 'delivery', '#anuncios': 'ads' } as const

/** This composition consumes the same request-local SitePage dictionary as every home. */
export function photographicContent(messages: Record<string, string>, tenant: SiteTenant) {
  const prefix = i18nKey('photographic.')
  const has = (key: string): boolean => messages[`${prefix}${key}`] !== undefined
  /** Optional text: absent or blank falls back instead of failing the page. */
  const filled = (key: string): boolean => (messages[`${prefix}${key}`] ?? '').trim() !== ''
  const adsChannel = messages['photographic.verticals.ads.mode']
  if (adsChannel !== undefined && !isAdvertisingChannel(adsChannel)) throw new Error('Unrecognised advertising channel')
  const copy = (key: string): string => {
    const value = messages[`${prefix}${key}`]
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing photographic content: ${key}`)
    // Markers stay literal for a tenant without the channel: an owner who types
    // one cannot take the public page down, and nothing is named on its behalf.
    return adsChannel === undefined ? value : nameAdvertisingChannel(value, adsChannel)
  }
  const icon = (key: string, fallback?: IllustrationIcon): IllustrationIcon => {
    const value = fallback !== undefined && !has(key) ? fallback : copy(key)
    if (!(ILLUSTRATION_ICONS as readonly string[]).includes(value)) throw new Error(`Unrecognised photographic icon: ${key}`)
    return value as IllustrationIcon
  }
  /** Indexes of an optional numbered list, which must start at 0 and be contiguous. */
  const listIndexes = (pattern: RegExp, min: number, max: number, label: string): number[] => {
    const indexes = [...new Set(Object.keys(messages).flatMap((key) => {
      const match = pattern.exec(key)
      return match ? [Number(match[1])] : []
    }))].sort((a, b) => a - b)
    if (indexes.length === 0) return []
    if (indexes.length < min || indexes.length > max || indexes.some((value, index) => value !== index)) {
      throw new Error(`Invalid photographic ${label} configuration`)
    }
    return indexes
  }
  const integer = (key: string, min: number, max: number): number => {
    const raw = copy(key)
    const value = Number(raw)
    if (!/^-?\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
      throw new Error(`Invalid photographic integer: ${key}`)
    }
    return value
  }
  const support = new URL(tenant.destinations.support ?? tenant.destinations.app ?? '')
  if (support.protocol !== 'https:' || support.username || support.password) {
    throw new Error('Photographic service requires an HTTPS support or app destination')
  }
  const contactHref = (context: string): string => {
    const url = new URL(support)
    // Only the configured messaging service understands this parameter. Other
    // support destinations are kept verbatim; no phone number is manufactured.
    if (url.hostname === 'wa.me' || url.hostname === 'api.whatsapp.com') {
      url.searchParams.set('text', copy(`contact.messages.${context}`))
    }
    return url.toString()
  }
  const anchors = new Set(['#como-cobras', '#como-funciona', '#su-panel', '#para-quien', '#calculadora', '#preguntas'])
  const navigation = Array.from({ length: 6 }, (_, index) => {
    const href = copy(`navigation.${index}.href`)
    if (!anchors.has(href)) throw new Error('Unrecognised photographic navigation anchor')
    return { href, label: copy(`navigation.${index}.label`) }
  })
  const steps = Array.from({ length: 3 }, (_, index) => ({
    title: copy(`how.steps.${index}.title`), text: copy(`how.steps.${index}.text`),
  }))
  const audiences = Array.from({ length: 3 }, (_, index) => {
    const audienceIcon = copy(`audience.items.${index}.icon`)
    if (!['person', 'clock', 'team', 'home', 'link'].includes(audienceIcon)) throw new Error('Unrecognised audience icon')
    return { icon: audienceIcon, title: copy(`audience.items.${index}.title`), text: copy(`audience.items.${index}.text`) }
  })
  const faqIndexes = [...new Set(Object.keys(messages).flatMap((key) => {
    const match = /^photographic\.faq\.items\.(\d+)\.(question|answer)$/.exec(key)
    return match ? [Number(match[1])] : []
  }))].sort((a, b) => a - b)
  if (faqIndexes.length < 1 || faqIndexes.length > 20 || faqIndexes.some((value, index) => value !== index)) {
    throw new Error('Invalid photographic FAQ configuration')
  }
  const faqs = faqIndexes.map((index) => ({
    question: copy(`faq.items.${index}.question`), answer: copy(`faq.items.${index}.answer`),
  }))
  const calculatorMode = messages['photographic.calculator.mode'] ?? 'calculate'
  if (!['calculate', 'quote', 'manual'].includes(calculatorMode)) throw new Error('Invalid landing pricing mode')
  if (calculatorMode === 'calculate' && copy('calculator.currency') !== 'GTQ') {
    throw new Error('The fixed-rate calculator presents quetzales only')
  }
  const calculator = calculatorMode === 'calculate' ? {
    currency: 'GTQ' as const,
    commissionBasisPoints: integer('calculator.commissionBasisPoints', 0, 10000),
    changed: copy('calculator.changed'), empty: copy('calculator.empty'), invalid: copy('calculator.invalid'),
  } : null
  // The visitor types the percentage; the page carries no tenant rate at all.
  const manualCalculator = calculatorMode === 'manual' ? {
    mode: 'manual' as const, currency: 'GTQ' as const,
    changed: copy('calculator.changed'), empty: copy('calculator.empty'), incomplete: copy('calculator.incomplete'), done: copy('calculator.done'),
    invalidAmount: copy('calculator.invalidAmount'), invalidRate: copy('calculator.invalidRate'),
  } : null
  const heroFeatures = (['phone', 'link', 'receipt'] as const).map((fallback, index) => ({
    label: copy(`hero.feature${index + 1}`),
    icon: icon(`hero.feature${index + 1}.icon`, fallback),
  }))
  const delivery = has('verticals.delivery.title') ? {
    eyebrow: copy('verticals.delivery.eyebrow'), title: copy('verticals.delivery.title'),
    description: copy('verticals.delivery.description'), stageLabel: copy('verticals.delivery.stageLabel'),
    panelTitle: copy('verticals.delivery.panelTitle'), tag: copy('verticals.delivery.tag'),
    orderTitle: copy('verticals.delivery.orderTitle'), orderNote: copy('verticals.delivery.orderNote'),
    milestones: [0, 1, 2].map((index) => ({
      title: copy(`verticals.delivery.milestones.${index}.title`), text: copy(`verticals.delivery.milestones.${index}.text`),
    })),
    benefits: [0, 1].map((index) => copy(`verticals.delivery.benefits.${index}`)),
    cta: copy('verticals.delivery.cta'),
  } : null
  const ads = has('verticals.ads.title') ? {
    eyebrow: copy('verticals.ads.eyebrow'), title: copy('verticals.ads.title'),
    description: copy('verticals.ads.description'), stageLabel: copy('verticals.ads.stageLabel'),
    panelTitle: copy('verticals.ads.panelTitle'), tag: copy('verticals.ads.tag'),
    brand: copy('verticals.ads.brand'), creative: copy('verticals.ads.creative'), channels: copy('verticals.ads.channels'),
    plan: [0, 1].map((index) => ({ term: copy(`verticals.ads.plan.${index}.term`), value: copy(`verticals.ads.plan.${index}.value`) })),
    benefits: [0, 1].map((index) => copy(`verticals.ads.benefits.${index}`)),
    cta: copy('verticals.ads.cta'),
  } : null
  const rendered = new Set<string>(['card1', 'card2', 'card3', ...(delivery ? ['delivery'] : []), ...(ads ? ['ads'] : [])])
  const solutionLinks = listIndexes(/^photographic\.solutions\.links\.(\d+)\.(label|href|footerLabel)$/, 2, 8, 'solution link').map((index) => {
    const href = copy(`solutions.links.${index}.href`)
    if (!Object.hasOwn(SOLUTION_ANCHORS, href) || !rendered.has(SOLUTION_ANCHORS[href as keyof typeof SOLUTION_ANCHORS])) {
      throw new Error('Unrecognised photographic solution anchor')
    }
    const label = copy(`solutions.links.${index}.label`)
    return { href, label, footerLabel: filled(`solutions.links.${index}.footerLabel`) ? copy(`solutions.links.${index}.footerLabel`) : label }
  })
  const route = listIndexes(/^photographic\.route\.items\.(\d+)\.(title|text|icon)$/, 2, 6, 'route').map((index) => ({
    title: copy(`route.items.${index}.title`), text: copy(`route.items.${index}.text`),
    icon: icon(`route.items.${index}.icon`),
  }))
  const typeScale = messages['photographic.theme.typeScale']
  if (typeScale !== undefined && typeScale !== 'compact') throw new Error('Invalid photographic type scale')
  const panelCurrency = copy('panel.currency')
  if (panelCurrency !== 'GTQ' && panelCurrency !== 'USD') throw new Error('Invalid demonstration currency')
  const panelMode = messages['photographic.panel.mode'] ?? 'credits'
  if (panelMode !== 'credits' && panelMode !== 'collections') throw new Error('Invalid demonstration mode')
  const amountKey = (current: string, legacy: string) => messages[`${prefix}${current}`] === undefined ? legacy : current
  const panel = {
    mode: panelMode,
    summary: copy('panel.summary'), billing: copy('panel.billing'), withdrawals: copy('panel.withdrawals'),
    currency: panelCurrency,
    filterStatusOne: copy('ui.movements_one'), filterStatusMany: copy('ui.movements_many'),
    filterTypes: panelMode === 'collections' ? ['card', 'link'] : ['expense', 'income'],
    sample: {
      // Collections are gross receipts. They are never treated as service
      // credits or as a settlement estimate available for withdrawal.
      balanceCents: integer(panelMode === 'collections' ? 'panel.sample.collectedCents' : amountKey('panel.sample.creditCents', 'panel.sample.creditGTQ'), 0, 999999999),
      withdrawCents: integer(amountKey('panel.sample.withdrawCents', 'panel.sample.withdrawGTQ'), 0, 999999999),
    },
    movements: Array.from({ length: 2 }, (_, index) => {
      const type = copy(`panel.movements.${index}.type`)
      const validTypes = panelMode === 'collections' ? ['card', 'link'] : ['expense', 'income']
      if (!validTypes.includes(type)) throw new Error('Invalid demonstration movement')
      return {
        type, text: copy(`panel.movements.${index}.text`), date: copy(`panel.movements.${index}.date`),
        cents: integer(`panel.movements.${index}.cents`, panelMode === 'collections' ? 0 : -999999999, 999999999),
      }
    }),
  }
  if (panel.movements.reduce((total, movement) => total + movement.cents, 0) !== panel.sample.balanceCents) {
    throw new Error('Demonstration movements do not reconcile')
  }
  const fontKey = messages['photographic.theme.displayFont'] ?? tenant.theme.display_font
  const font = Object.hasOwn(DISPLAY_FONT_STACKS, fontKey) ? DISPLAY_FONT_STACKS[fontKey as keyof typeof DISPLAY_FONT_STACKS] : undefined
  if (!font || !/^#[\da-f]{6}$/i.test(tenant.theme.accent) || !/^#[\da-f]{6}$/i.test(tenant.theme.accent_contrast)) {
    throw new Error('Invalid photographic theme')
  }
  const icons = new Set<string>([...heroFeatures.map((item) => item.icon), ...route.map((item) => item.icon), ...audiences.map((item) => item.icon)])
  if (delivery) icons.add('truck')
  if (ads) icons.add('megaphone')
  return {
    copy, contactHref, navigation, steps, audiences, faqs, calculator, manualCalculator, panel, fontKey,
    heroFeatures, delivery, ads, solutionLinks, route, typeScale,
    routeLabel: route.length > 0 ? copy('route.label') : null,
    // The link card's footnote historically repeats the second hero capability.
    linkFootnote: filled('illustrations.linkFootnote') ? copy('illustrations.linkFootnote') : copy('hero.feature2'),
    footerAction: filled('actions.footer') ? copy('actions.footer') : copy('actions.header'),
    /** Optional symbols the sprite must carry, beyond the composition's fixed set. */
    extraIcons: (['truck', 'megaphone'] as const).filter((name) => icons.has(name)),
    palette: messages['photographic.theme.palette'] === 'brand' ? 'brand' : 'service',
    brandStyle: `--accent:${tenant.theme.accent};--accent-ink:${tenant.theme.accent_contrast};--tenant-font-family:${font}`,
    clientConfig: {
      calculator: manualCalculator ?? calculator,
      panel: { summary: panel.summary, billing: panel.billing, withdrawals: panel.withdrawals, filterStatusOne: panel.filterStatusOne, filterStatusMany: panel.filterStatusMany },
      navigationLabels: { open: copy('ui.menu_toggle_aria_label'), close: copy('ui.menu_close') },
    },
  }
}

/** Escape raw script data, including a tenant-authored closing script tag. */
export const safeJson = (value: unknown): string => JSON.stringify(value)
  .replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')
