import { fetchNwsAlertSnapshot } from '@/lib/services/nws-alerts-service';
import { selectActiveAlerts } from '@/lib/warnings/active-alerts';
import type { FeedSource } from './feedSources';
import type { ParsedFeed } from './parse-document';
import type { RSSItem } from './parse-feed';

/** Resolve all revisions before mapping cards; identical titles never establish identity. */
export async function fetchNwsNews(source: FeedSource): Promise<ParsedFeed> {
  const snapshot = await fetchNwsAlertSnapshot(source.url);
  const active = new Set<string>();
  if (!snapshot.truncated && !snapshot.rejected && !snapshot.issues.length) {
    try {
      for (const alert of selectActiveAlerts(snapshot.alerts)) active.add(`${alert.id}:${alert.warningEventId}`);
    } catch {
      snapshot.issues.push('NWS revision or geographic coverage could not be verified');
    }
  }
  const items: RSSItem[] = snapshot.alerts.map(alert => {
    const verified = !snapshot.truncated && !snapshot.rejected && !snapshot.issues.length;
    const areas = [...new Set(alert.ugc.length ? alert.ugc : alert.affectedZones)].sort();
    const authoritative = !alert.warningEventId.startsWith('provisional:') && areas.length > 0;
    const warning = /\bwarning\b/i.test(alert.event);
    const eventId = authoritative ? alert.warningEventId : alert.id;
    const bulletinUrl = `https://api.weather.gov/alerts/${encodeURIComponent(alert.id.replace(/^https:\/\/api\.weather\.gov\/alerts\//, ''))}`;
    return {
      id: `nws:${alert.id}:${alert.warningEventId}`,
      title: alert.headline || alert.event, description: alert.description.slice(0, 300),
      url: alert.productUrl ?? bulletinUrl,
      updates: [{ id: alert.id, title: alert.headline || alert.event, url: bulletinUrl, issuedAt: alert.sent }],
      source: source.name, sourceId: source.id, category: source.category,
      priority: ['Extreme', 'Severe'].includes(alert.severity) ? 'high' : 'medium',
      timestamp: new Date(alert.sent), kind: 'hazard',
      lifecycle: !verified ? 'unverified' : warning && active.has(`${alert.id}:${alert.warningEventId}`) ? 'active' : 'inactive',
      identity: { authority: 'nws', eventId, productId: alert.id, areaKey: authoritative ? areas.join('|') : alert.id },
      location: alert.areaDesc,
      hazard: { messageId: alert.id, event: alert.event, effective: alert.effective, expires: alert.expires },
      warning: {
        office: authoritative ? eventId.split('.')[0] : alert.senderName || alert.sender,
        severity: alert.severity, urgency: alert.urgency, certainty: alert.certainty,
        messageType: alert.messageType, action: alert.vtecAction, sent: alert.sent,
        effective: alert.effective, expires: alert.expires, ends: alert.ends, areas, references: alert.referenceIds,
      },
    };
  });
  return { ...snapshot, items };
}
