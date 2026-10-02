import type { SiteTenant } from './site-api'
import { DISPLAY_FONT_STACKS } from './tenant-theme'
import { i18nKey } from '../i18n/key'

/** This composition consumes the same request-local SitePage dictionary as every home. */
export function photographicContent(messages: Record<string, string>, tenant: SiteTenant) {
  const prefix = i18nKey('photographic.')
  const copy = (key: string): string => {
    const value = messages[`${prefix}${key}`]
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing photographic content: ${key}`)
    return value
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
    const icon = copy(`audience.items.${index}.icon`)
    if (!['person', 'clock', 'team'].includes(icon)) throw new Error('Unrecognised audience icon')
    return { icon, title: copy(`audience.items.${index}.title`), text: copy(`audience.items.${index}.text`) }
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
  if (!['calculate', 'quote'].includes(calculatorMode)) throw new Error('Invalid landing pricing mode')
  if (calculatorMode === 'calculate' && copy('calculator.currency') !== 'GTQ') {
    throw new Error('The fixed-rate calculator presents quetzales only')
  }
  const calculator = calculatorMode === 'calculate' ? {
    currency: 'GTQ' as const,
    commissionBasisPoints: integer('calculator.commissionBasisPoints', 0, 10000),
    changed: copy('calculator.changed'), empty: copy('calculator.empty'), invalid: copy('calculator.invalid'),
  } : null
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
  return {
    copy, contactHref, navigation, steps, audiences, faqs, calculator, panel, fontKey,
    palette: messages['photographic.theme.palette'] === 'brand' ? 'brand' : 'service',
    brandStyle: `--accent:${tenant.theme.accent};--accent-ink:${tenant.theme.accent_contrast};--tenant-font-family:${font}`,
    clientConfig: {
      calculator,
      panel: { summary: panel.summary, billing: panel.billing, withdrawals: panel.withdrawals, filterStatusOne: panel.filterStatusOne, filterStatusMany: panel.filterStatusMany },
      navigationLabels: { open: copy('ui.menu_toggle_aria_label'), close: copy('ui.menu_close') },
    },
  }
}

/** Escape raw script data, including a tenant-authored closing script tag. */
export const safeJson = (value: unknown): string => JSON.stringify(value)
  .replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')
