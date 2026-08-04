/**
 * 16-Bit Weather Platform - Space Weather Alerts API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches Space Weather alerts from NOAA SWPC
 */

import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'

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
function parseAlertType(productId: string): SpaceWeatherAlert['type'] {
  const upper = productId.toUpperCase();
  if (upper.includes('WATCH')) return 'watch';
  if (upper.includes('WARNING')) return 'warning';
  if (upper.includes('ALERT')) return 'alert';
  if (upper.includes('SUMMARY')) return 'summary';
  return 'message';
}

// Determine severity from message content
function parseSeverity(message: string): SpaceWeatherAlert['severity'] {
  const upper = message.toUpperCase();
  if (upper.includes('EXTREME') || upper.includes('G5') || upper.includes('S5') || upper.includes('R5')) return 'extreme';
  if (upper.includes('SEVERE') || upper.includes('G4') || upper.includes('S4') || upper.includes('R4')) return 'severe';
  if (upper.includes('STRONG') || upper.includes('G3') || upper.includes('S3') || upper.includes('R3')) return 'strong';
  if (upper.includes('MODERATE') || upper.includes('G2') || upper.includes('S2') || upper.includes('R2')) return 'moderate';
  if (upper.includes('MINOR') || upper.includes('G1') || upper.includes('S1') || upper.includes('R1')) return 'minor';
  return 'info';
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

export async function GET() {
  try {
    const response = await fetchSwpc('https://services.swpc.noaa.gov/products/alerts.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`NOAA SWPC API error: ${response.status}`);
    }

    const data: NOAAAlert[] = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }

    // Parse and transform alerts (most recent first, limit to 20)
    const alerts: SpaceWeatherAlert[] = data
      .slice(0, 20)
      .map((alert) => ({
        id: alert.product_id || `alert-${Date.now()}`,
        type: parseAlertType(alert.product_id || ''),
        severity: parseSeverity(alert.message || ''),
        title: extractTitle(alert.message || '', alert.product_id || ''),
        issuedAt: alert.issue_datetime || new Date().toISOString(),
        summary: extractSummary(alert.message || ''),
        rawMessage: alert.message || '',
      }));

    // Sort by severity (most severe first)
    const severityOrder = { extreme: 0, severe: 1, strong: 2, moderate: 3, minor: 4, info: 5 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
      source: 'NOAA Space Weather Prediction Center',
    });

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
}
