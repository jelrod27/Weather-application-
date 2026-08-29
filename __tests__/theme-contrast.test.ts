import fs from 'fs'
import path from 'path'

import { themeTokens } from '@/lib/theme-tokens'
import { THEME_LIST } from '@/lib/theme-config'

/**
 * Contrast regression guard.
 *
 * accentText once resolved to --primary-foreground, which is the text colour
 * for content sitting ON a primary fill and is therefore ~equal to the
 * background in every theme. As standalone text it rendered at ~1:1. On the
 * five dark themes `.glow` painted a primary-coloured text-shadow behind it,
 * which disguised the problem; daybreak suppresses glow, so the text was
 * simply invisible — on the default theme every guest sees.
 *
 * A text-shadow is not a contrast mechanism, so this asserts the real numbers
 * straight out of theme.css rather than asserting a class name.
 */

const THEME_CSS = fs.readFileSync(path.join(process.cwd(), 'app', 'theme.css'), 'utf8')

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100
  const lig = l / 100
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lig - c / 2
  const sextant = Math.floor(h / 60) % 6
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sextant]
  return [r, g, b].map((v) => Math.round((v + m) * 255)) as [number, number, number]
}

function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Reads a bare `H S% L%` custom property out of one [data-theme] block. */
function token(theme: string, name: string): [number, number, number] {
  const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n  \\}`).exec(THEME_CSS)
  if (!block) throw new Error(`No theme block for ${theme}`)
  const decl = new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`).exec(block[1])
  if (!decl) throw new Error(`No --${name} in ${theme}`)
  return hslToRgb(Number(decl[1]), Number(decl[2]), Number(decl[3]))
}

describe('theme contrast', () => {
  it.each(THEME_LIST)('%s: accent text is legible on the page background', (theme) => {
    // Full AA, not the 3:1 large-text allowance: 51 of the 110 accentText call
    // sites are regular-weight body text, including text-sm links
    // (app/auth/reset-password/page.tsx) and text-xs ones
    // (components/auth/auth-form.tsx). A 3:1 bar would let a palette pass here
    // while failing WCAG AA for half its consumers.
    expect(contrast(token(theme, 'primary'), token(theme, 'background'))).toBeGreaterThanOrEqual(
      4.5,
    )
  })

  it.each(THEME_LIST)('%s: body text meets WCAG AA', (theme) => {
    expect(contrast(token(theme, 'foreground'), token(theme, 'background'))).toBeGreaterThanOrEqual(
      4.5,
    )
  })

  it('accentText does not resolve to the on-fill text colour', () => {
    // --primary-foreground is ~the background in every theme; using it as
    // standalone text is the bug this suite exists to prevent.
    for (const tokens of Object.values(themeTokens)) {
      expect(tokens.accentText).not.toBe('text-primary-foreground')
    }
  })

  it('confirms why: primary-foreground really is invisible on the background', () => {
    for (const theme of THEME_LIST) {
      expect(contrast(token(theme, 'primary-foreground'), token(theme, 'background'))).toBeLessThan(
        1.5,
      )
    }
  })
})
