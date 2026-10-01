import { expect } from '@playwright/test';
import type { HostResponse } from './http-host';

/** A retired published address has one explicit destination; other responses
 * still require 200. This does not silently skip a route from content scans. */
export function expectPublishedResponse(response: HostResponse, page: { slug: string; url: string }): void {
  const retired = page.slug === 'oneplatform' && ['/for-developers/', '/es/para-desarrolladores/'].includes(page.url);
  expect(response.status, `${page.slug}${page.url}`).toBe(retired ? 301 : 200);
  if (retired) expect(response.headers.location).toBe('https://developer.1platform.pro/docs/saas/1platform-api/getting-started');
}
