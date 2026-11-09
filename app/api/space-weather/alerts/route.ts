/**
 * 16-Bit Weather Platform - Space Weather Alerts API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches Space Weather alerts from NOAA SWPC
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchSwpcJson } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

interface NOAAAlert {
  product_id: string;
  issue_datetime: string;
  message: string;
}

export interface SpaceWeatherAlert {
  id: string;
  type: 'watch' | 'warning' | 'alert' | 'summary' | 'message';
  severity: 'info' | 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme';
  title: string;
  issuedAt: string;
  summary: string;
  rawMessage: string;
}

// Parse alert type from product_id
function parseAlertType(productId: string, message: string): SpaceWeatherAlert['type'] {
  // NOAA's short product IDs do not contain English type names. Prefer its
  // dedicated message code, then an anchored headline; unknowns stay neutral.
  const code = message.match(/^Space Weather Message Code:\s*(\w+)/im)?.[1] ?? productId;
  if (/^(WAT|WATCH)/i.test(code)) return 'watch';
  if (/^(WAR|WARNING)/i.test(code)) return 'warning';
  if (/^(ALT|ALERT)/i.test(code)) return 'alert';
  if (/^(SUM|SUMMARY)/i.test(code)) return 'summary';
  const headline = message.match(/^(WATCH|WARNING|ALERT|SUMMARY):/im)?.[1];
  return headline ? headline.toLowerCase() as SpaceWeatherAlert['type'] : 'message';
}

function parseSeverity(message: string): SpaceWeatherAlert['severity'] {
  const declared = [...message.matchAll(/^NOAA Scale(?:s)?:[^\n]*?\b[GRS]([1-5])\b/gim)]
    .map(match => Number(match[1]));
  const maximum = Math.max(0, ...declared);
  return (['info', 'minor', 'moderate', 'strong', 'severe', 'extreme'] as const)[maximum];
}

// Extract title from message
function extractTitle(message: string, productId: string): string {
  // Try to extract first meaningful line
  const lines = message.split('\n').filter(l => l.trim());

  // Look for common title patterns
  for (const line of lines) {
    // Skip header lines
    if (line.startsWith('Space Weather Message Code:')) continue;
    if (line.startsWith('Serial Number:')) continue;
    if (line.startsWith('Issue Time:')) continue;

    // Common alert titles
    if (line.includes('Watch') || line.includes('Warning') || line.includes('Alert') ||
        line.includes('Storm') || line.includes('Flare') || line.includes('CME') ||
        line.includes('Geomagnetic') || line.includes('Solar') || line.includes('Radio')) {
      return line.trim().slice(0, 100);
    }
  }

  // Fallback to product ID
  return productId.replace(/[._-]/g, ' ').toUpperCase();
}

// Extract summary from message
function extractSummary(message: string): string {
  // Find the main content, skipping headers
  const lines = message.split('\n');
  const contentLines: string[] = [];
  let inContent = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines at start
    if (!inContent && !trimmed) continue;

    // Skip header lines
    if (trimmed.startsWith('Space Weather Message Code:') ||
        trimmed.startsWith('Serial Number:') ||
        trimmed.startsWith('Issue Time:') ||
        trimmed.startsWith(':Product:') ||
        trimmed.startsWith(':Issued:')) {
      continue;
    }

    inContent = true;
    if (trimmed) {
      contentLines.push(trimmed);
    }
  }

  // Return first 2-3 meaningful sentences
  const summary = contentLines.slice(0, 3).join(' ');
  return summary.slice(0, 300) + (summary.length > 300 ? '...' : '');
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const data = await fetchSwpcJson<NOAAAlert[]>('https://services.swpc.noaa.gov/products/alerts.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }

    // Parse and transform alerts (most recent first, limit to 20)
    const alerts: SpaceWeatherAlert[] = data
      .map((alert, index) => ({
        id: `${alert.product_id || "message"}-${alert.issue_datetime || index}`,
        type: parseAlertType(alert.product_id || '', alert.message || ''),
        severity: parseSeverity(alert.message || ''),
        title: extractTitle(alert.message || '', alert.product_id || ''),
        issuedAt: alert.issue_datetime ? (/Z$|[+-]\d{2}:?\d{2}$/.test(alert.issue_datetime) ? alert.issue_datetime : alert.issue_datetime.replace(' ', 'T') + 'Z') : '',
        summary: extractSummary(alert.message || ''),
        rawMessage: alert.message || '',
      }))
      .sort((a, b) => (Date.parse(b.issuedAt) || 0) - (Date.parse(a.issuedAt) || 0))
      .slice(0, 20);

    return NextResponse.json({
      alerts,
      validity: 'recent-messages',
      count: alerts.length,
      timestamp: new Date().toISOString(),
      source: 'NOAA Space Weather Prediction Center',
    }, { headers: rateLimitHeaders });

  } catch (error) {
    logRouteError('space-weather/alerts', error);

    return NextResponse.json({
      alerts: [],
      count: 0,
      timestamp: new Date().toISOString(),
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live data',
    }, { status: 500 });
  }
  }, { context: 'space-weather/alerts' });
}
