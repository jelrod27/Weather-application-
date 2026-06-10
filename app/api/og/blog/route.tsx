/**
 * 16-Bit Weather Blog - Dynamic OG Image Generator
 *
 * Generates Open Graph images for blog posts with type-based accent colors.
 * Uses Next.js ImageResponse API for edge-compatible image generation.
 *
 * Usage: /api/og/blog?title=Post+Title&subtitle=March+29+2026&type=severe
 * Types: severe (red), space (cyan), education (green), record (amber), dispatch (magenta)
 */

import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const accentColors: Record<string, string> = {
  severe: '#ff3333',
  space: '#00d4ff',
  education: '#00ff9d',
  record: '#ffaa00',
  dispatch: '#ff00ff',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const title = searchParams.get('title') || 'Weekly Dispatch'
  const subtitle = searchParams.get('subtitle') || ''
  const type = searchParams.get('type') || 'dispatch'

  const accent = accentColors[type] || accentColors.dispatch

  const colors = {
    bg: '#0a0a1a',
    text: '#e0e0e0',
    grid: '#1a1a2e',
    muted: '#888899',
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
          backgroundImage: `
            linear-gradient(${colors.grid} 1px, transparent 1px),
            linear-gradient(90deg, ${colors.grid} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: accent,
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 80px',
            textAlign: 'center',
          }}
        >
          {/* Header label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '3px',
                background: accent,
              }}
            />
            <span
              style={{
                color: accent,
                fontSize: '20px',
                fontWeight: 'bold',
                letterSpacing: '6px',
                textTransform: 'uppercase',
              }}
            >
              16BITBOT // WEEKLY DISPATCH
            </span>
            <div
              style={{
                width: '40px',
                height: '3px',
                background: accent,
              }}
            />
          </div>

          {/* Main title */}
          <h1
            style={{
              color: colors.text,
              fontSize: title.length > 40 ? '42px' : '52px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              margin: '24px 0 16px 0',
              textShadow: `0 0 30px ${accent}`,
              maxWidth: '1000px',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>

          {/* Subtitle / date line */}
          {subtitle && (
            <p
              style={{
                color: colors.muted,
                fontSize: '22px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                margin: '0',
              }}
            >
              {subtitle}
            </p>
          )}

          {/* Decorative footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '40px',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '3px',
                background: accent,
                opacity: 0.5,
              }}
            />
            <span
              style={{
                color: accent,
                fontSize: '14px',
                letterSpacing: '4px',
                opacity: 0.7,
              }}
            >
              16BITWEATHER.CO
            </span>
            <div
              style={{
                width: '80px',
                height: '3px',
                background: accent,
                opacity: 0.5,
              }}
            />
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: accent,
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
