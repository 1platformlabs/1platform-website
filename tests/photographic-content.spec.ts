import { expect, test } from '@playwright/test'
import fixture from './fixtures/photographic-site.json' with { type: 'json' }
import { photographicContent, safeJson } from '../src/lib/photographic-content'
import { isTenant, type SiteTenant } from '../src/lib/site-api'
import messages from '../src/i18n/messages/pages/photographic-home'
import { repoTenantForHost } from '../src/data/site-tenants'

const data = () => ({ messages: structuredClone(fixture.pagesResponse.data.messages) as Record<string, string>, tenant: structuredClone(fixture.tenant) as SiteTenant })

test('the public contract selects a composition with tenant-owned money, brand and support', () => {
  const { messages, tenant } = data()
  expect(isTenant(tenant)).toBe(true)
  const site = photographicContent(messages, tenant)
  expect(site.calculator?.commissionBasisPoints).toBe(490)
  expect(site.panel.sample).toEqual({ creditCents: 48000, withdrawCents: 0 })
  const href = new URL(site.contactHref('calculator'))
  expect(href.origin + href.pathname).toBe(tenant.destinations.support)
  expect(href.searchParams.get('text')).toContain('4.9%')
  expect(site.faqs[2].answer).toContain('automáticamente')
  expect(site.brandStyle).toContain('--tenant-font-family:\'Manrope\'')
})

test('missing copy, unsafe theme, absent destinations and invalid numeric configuration fail closed', () => {
  const cases: Array<(d: ReturnType<typeof data>) => void> = [
    (d) => { delete d.messages['photographic.calculator.changed'] },
    (d) => { d.tenant.theme.accent = 'red;display:none' },
    (d) => { d.tenant.destinations.support = 'javascript:alert(1)' },
    (d) => { d.tenant.destinations.support = null },
    (d) => { d.tenant.destinations.support = 'https://user:pass@example.com/' },
    (d) => { d.messages['photographic.navigation.0.href'] = '//evil.example/' },
    (d) => { d.messages['photographic.calculator.commissionBasisPoints'] = '4.9' },
    (d) => { d.messages['photographic.calculator.commissionBasisPoints'] = '10001' },
    (d) => { d.messages['photographic.calculator.currency'] = 'USD' },
    (d) => { d.messages['photographic.panel.currency'] = 'INVALID' },
    (d) => { d.messages['photographic.panel.sample.creditGTQ'] = '48001' },
    (d) => { d.messages['photographic.panel.movements.0.type'] = 'payment' },
    (d) => { d.messages['photographic.audience.items.0.icon'] = 'unknown' },
  ]
  for (const change of cases) {
    const d = data(); change(d)
    expect(() => photographicContent(d.messages, d.tenant)).toThrow()
  }
})

test('support URLs and request-local configuration cannot inherit another tenant', () => {
  const first = data(), second = data()
  second.tenant.destinations.support = 'https://contact.example/request?source=home'
  second.tenant.theme.accent = '#234567'
  second.messages['photographic.calculator.commissionBasisPoints'] = '200'
  second.messages['photographic.onboarding.description'] = 'Correo propio para su negocio.'
  const a = photographicContent(first.messages, first.tenant)
  const b = photographicContent(second.messages, second.tenant)
  expect(b.contactHref('hero')).toBe(second.tenant.destinations.support)
  expect(a.calculator?.commissionBasisPoints).toBe(490)
  expect(b.calculator?.commissionBasisPoints).toBe(200)
  expect(a.brandStyle).not.toContain('#234567')
  expect(b.brandStyle).toContain('#234567')
  expect(b.copy('onboarding.description')).toBe('Correo propio para su negocio.')
  expect(a.copy('onboarding.description')).toContain('consulta@minombre.com')
  expect(b.contactHref('onboarding')).toBe(second.tenant.destinations.support)
})

test('tenant strings cannot terminate a JSON script element', () => {
  const hostile = { name: '</script><img src=x onerror=alert(1)>&' }
  const serialized = safeJson(hostile)
  expect(serialized).not.toMatch(/[<>&]/)
  expect(JSON.parse(serialized)).toEqual(hostile)
})

for (const locale of ['en', 'es'] as const) {
  test(`1Platform ${locale} shares the layout while keeping its app, USD pricing and brand`, () => {
    const tenant = structuredClone(repoTenantForHost('1platform.pro')!)
    expect(tenant.home_template).toBe('photographic-service')
    expect(tenant.theme.display_font).toBe('space-grotesk')
    const site = photographicContent(messages[locale], tenant)
    expect(site.fontKey).toBe('manrope')
    expect(site.palette).toBe('brand')
    expect(site.copy('hero.image')).toBe('commerce')
    expect(site.contactHref('hero')).toBe(tenant.destinations.app)
    expect(site.contactHref('onboarding')).toBe(tenant.destinations.app)
    expect(site.copy('onboarding.description')).toContain('consulta@minombre.com')
    expect(site.calculator).toBeNull()
    expect(site.panel.currency).toBe('USD')
    expect(site.panel.sample).toEqual({ creditCents: 48000, withdrawCents: 0 })
    expect(Object.values(messages[locale]).join(' ')).not.toMatch(/Medipago|médicos?|consultorio|4\.9%|WhatsApp|\bGTQ\b/i)
    expect(site.brandStyle).toContain(tenant.theme.accent)
    const medical = data()
    expect(photographicContent(medical.messages, medical.tenant).panel.currency).toBe('GTQ')
    expect(photographicContent(medical.messages, medical.tenant).calculator?.commissionBasisPoints).toBe(490)
  })
}

test('app fallback and home font remain validated tenant configuration', () => {
  const tenant = structuredClone(repoTenantForHost('1platform.pro')!)
  tenant.destinations.app = 'javascript:alert(1)'
  expect(() => photographicContent(messages.en, tenant)).toThrow()
  tenant.destinations.app = null
  expect(() => photographicContent(messages.en, tenant)).toThrow()
  tenant.destinations.app = 'https://account.example/'
  expect(() => photographicContent({ ...messages.en, 'photographic.theme.displayFont': 'x;display:none' }, tenant)).toThrow()
  expect(() => photographicContent({ ...messages.en, 'photographic.calculator.mode': 'unknown' }, tenant)).toThrow()
  expect(repoTenantForHost('clinicas.1platform.dev')?.home_template).toBe('platform-commerce')
})
