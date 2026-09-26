import type { SiteTenant } from './site-api'
import { DISPLAY_FONT_STACKS } from './tenant-theme'

/** This composition consumes the same request-local SitePage dictionary as every home. */
export function photographicContent(messages: Record<string, string>, tenant: SiteTenant) {
  const copy = (key: string): string => {
    const value = messages[`photographic.${key}`]
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
  const support = new URL(tenant.destinations.support ?? '')
  if (support.protocol !== 'https:' || support.username || support.password) {
    throw new Error('Photographic service requires an HTTPS support destination')
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
  const faqs = Array.from({ length: 4 }, (_, index) => ({
    question: copy(`faq.items.${index}.question`), answer: copy(`faq.items.${index}.answer`),
  }))
  if (copy('calculator.currency') !== 'GTQ' || copy('panel.currency') !== 'GTQ') {
    throw new Error('This composition currently presents quetzales only')
  }
  const calculator = {
    currency: 'GTQ' as const,
    commissionBasisPoints: integer('calculator.commissionBasisPoints', 0, 10000),
    changed: copy('calculator.changed'), empty: copy('calculator.empty'), invalid: copy('calculator.invalid'),
  }
  const panel = {
    summary: copy('panel.summary'), billing: copy('panel.billing'), withdrawals: copy('panel.withdrawals'),
    currency: 'GTQ' as const,
    filterStatusOne: copy('ui.movements_one'), filterStatusMany: copy('ui.movements_many'),
    sample: { creditGTQ: integer('panel.sample.creditGTQ', 0, 999999999), withdrawGTQ: integer('panel.sample.withdrawGTQ', 0, 999999999) },
    movements: Array.from({ length: 2 }, (_, index) => {
      const type = copy(`panel.movements.${index}.type`)
      if (type !== 'expense' && type !== 'income') throw new Error('Invalid demonstration movement')
      return {
        type, text: copy(`panel.movements.${index}.text`), date: copy(`panel.movements.${index}.date`),
        cents: integer(`panel.movements.${index}.cents`, -999999999, 999999999),
      }
    }),
  }
  if (panel.movements.reduce((total, movement) => total + movement.cents, 0) !== panel.sample.creditGTQ) {
    throw new Error('Demonstration credits do not reconcile')
  }
  const font = DISPLAY_FONT_STACKS[tenant.theme.display_font]
  if (!font || !/^#[\da-f]{6}$/i.test(tenant.theme.accent) || !/^#[\da-f]{6}$/i.test(tenant.theme.accent_contrast)) {
    throw new Error('Invalid photographic theme')
  }
  return {
    copy, contactHref, navigation, steps, audiences, faqs, calculator, panel,
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
