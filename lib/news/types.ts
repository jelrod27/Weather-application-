/** Shared news priority type for RSS items and UI indicators. */
export type NewsPriority = 'high' | 'medium' | 'low';

export type NewsKind = 'hazard' | 'outlook' | 'event' | 'story';
export type NewsSourceState = 'fresh' | 'partial' | 'delayed' | 'unavailable';

export interface NewsIdentity {
  authority: 'nws' | 'usgs' | 'nhc';
  eventId: string;
  productId: string;
  /** Exact geographic segment set; an event ID alone must not merge areas. */
  areaKey?: string;
}

export interface NewsUpdate {
  id: string;
  title: string;
  url: string;
  issuedAt: string;
}

export interface NewsSourceHealth {
  id: string;
  name: string;
  url: string;
  state: NewsSourceState;
  lastAttemptAt: string;
  lastSuccessAt: string | null;
  freshUntil: string | null;
  retainedUntil: string | null;
  coverage: string;
  received: number;
  accepted: number;
  rejected: number;
  truncated: boolean;
  pages: number;
  oldestItemAt: string | null;
  newestItemAt: string | null;
  issues: string[];
}
