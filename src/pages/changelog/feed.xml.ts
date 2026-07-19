import type { APIContext } from 'astro';
import { changelogFeed } from '@i18n/feeds';

export const GET = (context: APIContext) => changelogFeed(context, 'en');
