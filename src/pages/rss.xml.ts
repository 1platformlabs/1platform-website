import type { APIContext } from 'astro';
import { blogFeed } from '@i18n/feeds';

export const GET = (context: APIContext) => blogFeed(context, 'en');
