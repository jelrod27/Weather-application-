/**
 * 16-Bit Weather Platform - RSS Aggregator Service
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Server-side RSS feed fetching, parsing, and aggregation.
 * Implementation is split across fetch-feed, parse-feed, aggregate-cache,
 * and enrich-images. This module is the stable public entry.
 */

import { clearCache } from './aggregate-cache';
import { __testing as parseTesting } from './parse-feed';

export type { AggregatedResult } from './aggregate-cache';
export type { RSSItem } from './parse-feed';
export {
  aggregateFeeds,
  cacheControlForCategories,
  getCategoryConfig,
  getFeaturedItem,
} from './aggregate-cache';
export { MISSING_ITEM_TIMESTAMP } from './parse-feed';

/**
 * Internal helpers exposed for unit testing only (PRD §14). Not part of the
 * module's runtime API — do not import from application code.
 */
export const __testing = {
  ...parseTesting,
  clearCache,
};
