import tokens from '../styles/brand-tokens.json';
import type { SiteTenant } from './site-api';
import { docsUrl, supportUrl } from './site-destinations';
import { i18nKey } from '../i18n/key';
import { makeLocalizePath } from './site-locale';
import type { Locale } from '../i18n/ui';

export function infrastructureChrome(messages: Record<string, string>): boolean {
  return messages['site.theme.profile'] === 'infrastructure';
}

export function siteChrome(tenant: SiteTenant, messages: Record<string, string>, locale: Locale) {
  const prefix = i18nKey('site.');
  const copy = (key: string): string => {
    const value = messages[`${prefix}${key}`];
    if (!value?.trim()) throw new Error(`Missing site chrome content: ${key}`);
    return value;
  };
  const localize = makeLocalizePath(tenant);
  const home = localize('/', locale);
  const resolve = (value: string): string | null => {
    if (value === '@docs') return docsUrl({ tenant }, '/docs/saas/1platform-api/getting-started');
    if (value === '@contact') return supportUrl({ tenant });
    if (value.startsWith('/#')) return `${home}${value.slice(1)}`;
    if (value.startsWith('/') && !value.startsWith('//') && tenant.pages.includes(value)) return localize(value, locale);
    return null;
  };
  const navigation = Array.from({ length: 6 }, (_, i) => ({
    position: i, label: copy(`navigation.${i}.label`), href: resolve(copy(`navigation.${i}.href`)),
  })).filter((entry): entry is { position: number; label: string; href: string } => entry.href !== null);
  const names = { navy: 'navy', navyDeep: 'navy-deep', blue: 'blue', text: 'text', textSecondary: 'muted', surfaceSecondary: 'surface', selection: 'selection' } as const;
  const style = (Object.entries(tokens) as [keyof typeof tokens, string][]).map(([role, value]) => {
    const configured = messages[`site.theme.${role}`] ?? value;
    if (!/^#[a-fA-F0-9]{6}$/.test(configured)) throw new Error(`Invalid site color: ${role}`);
    return `--site-${names[role]}:${configured}`;
  }).join(';');
  return { copy, home, navigation, contact: supportUrl({ tenant }), style };
}
