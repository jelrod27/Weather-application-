/**
 * 16-Bit Weather Platform - Dynamic OG Image Generator
 * 
 * Generates Open Graph images dynamically for social sharing.
 * Uses Next.js ImageResponse API for edge-compatible image generation.
 * 
 * Usage: /api/og?title=Page+Title&subtitle=Optional+Subtitle
 */

import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Get parameters with defaults
  const title = searchParams.get('title') || '16 Bit Weather'
  const subtitle = searchParams.get('subtitle') || 'Retro Terminal Weather Forecast'
  
  // Theme colors
  const colors = {
    bg: '#0a0a1a',
    primary: '#00d4ff',
    secondary: '#ff00ff',
    accent: '#00ff9d',
    text: '#e0e0e0',
    grid: '#1a1a2e',
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
        {/* Top border accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`,
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            textAlign: 'center',
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <span
              style={{
                color: colors.primary,
                fontSize: '28px',
                fontWeight: 'bold',
                letterSpacing: '4px',
                textTransform: 'uppercase',
              }}
            >
              16 BIT WEATHER
            </span>
          </div>

          {/* Main title */}
          <h1
            style={{
              color: colors.text,
              fontSize: title.length > 30 ? '48px' : '64px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              margin: '20px 0',
              textShadow: `0 0 30px ${colors.primary}`,
              maxWidth: '900px',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              color: colors.primary,
              fontSize: '24px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              margin: '10px 0 0 0',
              opacity: 0.9,
            }}
          >
            {subtitle}
          </p>

          {/* Decorative elements */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '40px',
              gap: '20px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '4px',
                background: colors.secondary,
              }}
            />
            <span
              style={{
                color: colors.secondary,
                fontSize: '16px',
                letterSpacing: '4px',
              }}
            >
              PRESS START
            </span>
            <div
              style={{
                width: '60px',
                height: '4px',
                background: colors.secondary,
              }}
            />
          </div>
        </div>

        {/* Bottom border accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.secondary}, ${colors.primary})`,
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
