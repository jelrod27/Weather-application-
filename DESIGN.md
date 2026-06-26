---
version: alpha
name: 16bitweather
description: Retro terminal weather platform — warm parchment, Inconsolata mono UI, amber accent on deep ink.
colors:
  background: "#f8f6f1"
  background-elevated: "#fcfbf7"
  foreground: "#362c26"
  foreground-muted: "#72655a"
  primary: "#0f74bd"
  primary-foreground: "#f7f5f2"
  accent: "#f57d14"
  accent-foreground: "#3d2410"
  secondary: "#fce8d0"
  secondary-foreground: "#362c26"
  destructive: "#dc2626"
  destructive-foreground: "#f7f5f2"
  card: "#fbf9f3"
  card-foreground: "#362c26"
  card-tint: "#3c2d1e08"
  card-hover: "#3c2d1e0d"
  border: "#dbd3c7"
  border-subtle: "#3c2d1e1f"
  border-hover: "rgba(240, 140, 40, 0.4)"
  border-focus: "rgba(240, 140, 40, 0.55)"
  border-invisible: "#3c2d1e14"
  muted: "#e8e2d6"
  muted-foreground: "#8a7a6b"
  ring: "#0f74bd"
  severity-light: "#21c45d"
  severity-moderate: "#facc14"
  severity-severe: "#f97415"
  severity-extreme: "#ef4343"
  severity-light-bg: "#21c45d1f"
  severity-moderate-bg: "#facc141f"
  severity-severe-bg: "#f974151f"
  severity-extreme-bg: "#ef43431f"
typography:
  body:
    fontFamily: "IBM Plex Sans"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: "1.6"
  body-lg:
    fontFamily: "IBM Plex Sans"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: "1.556"
  h1:
    fontFamily: "IBM Plex Sans"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: "1.4"
    letterSpacing: "-0.025em"
  h2:
    fontFamily: "IBM Plex Sans"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "1.333"
  h3:
    fontFamily: Inconsolata
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: "1.333"
    letterSpacing: "0.1em"
    textTransform: uppercase
  label-caps:
    fontFamily: Inconsolata
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.1em"
    textTransform: uppercase
  label-mono:
    fontFamily: Inconsolata
    fontSize: "0.875rem"
    fontWeight: 400
  button:
    fontFamily: Inconsolata
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.7px"
    textTransform: uppercase
  input:
    fontFamily: "JetBrains Mono"
    fontSize: 1rem
    fontWeight: 400
    letterSpacing: "0.8px"
    textTransform: uppercase
  terminal-display:
    fontFamily: VT323
    fontSize: "2rem"
    fontWeight: 400
  hero-xl:
    fontFamily: "IBM Plex Sans"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  hero-2xl:
    fontFamily: "IBM Plex Sans"
    fontSize: "6rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  nav-bar:
    backgroundColor: "{colors.background}"
    padding: 0
  nav-link:
    textColor: "{colors.foreground-muted}"
    typography: label-mono
  nav-link-active:
    textColor: "{colors.accent}"
    typography: "{typography.label-mono}"
  footer:
    backgroundColor: "oklab(0 0 0 / 0.03)"
    textColor: "{colors.foreground-muted}"
  footer-link:
    textColor: "{colors.foreground-muted}"
    typography: label-mono
  search-input:
    backgroundColor: "{colors.background-elevated}"
    textColor: "{colors.foreground}"
    typography: input
    rounded: "{rounded.md}"
    padding: 16px
  search-input-focus:
    backgroundColor: "{colors.background-elevated}"
    textColor: "{colors.foreground}"
    typography: input
    rounded: "{rounded.md}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: button
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: button
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: button
    rounded: "{rounded.md}"
    padding: "8px 16px"
  severity-badge:
    textColor: "{colors.severity-severe}"
    typography: label-caps
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  severity-badge-light:
    textColor: "{colors.severity-light}"
    typography: label-caps
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  severity-badge-extreme:
    textColor: "{colors.severity-extreme}"
    typography: label-caps
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 16px
  card-hover:
    backgroundColor: "{colors.card-hover}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 16px
---

## Overview

16 Bit Weather pairs a retro terminal aesthetic with modern weather data. The
visual language draws from vintage computing — monospace typography, amber
accent on warm parchment, severity-colored status indicators — while keeping
readability and accessibility at the forefront. The result is a premium retro
feel: think flight information display meets broadsheet weather page.

## Colors

The palette is rooted in warm neutrals with a single amber accent.

- **Background (#f8f6f1):** Warm limestone — softer than pure white, reduces
  glare in a data-dense interface.
- **Foreground (#362c26):** Deep warm ink for body text and headings. High
  contrast on the parchment background.
- **Accent (#f57d14):** Amber — the sole interaction color. Used for active
  states, focus rings, and the primary CTA.
- **Primary (#0f74bd):** Weather blue — used for links and the primary weather
  data brand color.
- **Foreground Muted (#72655a):** Warm slate for secondary text, captions, and
  metadata.
- **Border (#dbd3c7):** Subtle warm gray for structural dividers.

### Severity Scale

Weather alert severity uses a four-step scale with both solid and translucent
background variants:

| Level | Color | Background |
|-------|-------|------------|
| Light | #21c45d | #21c45d1f (12% opacity) |
| Moderate | #facc14 | #facc141f |
| Severe | #f97415 | #f974151f |
| Extreme | #ef4343 | #ef43431f |

## Typography

Three font families create the retro-modern tension:

- **IBM Plex Sans** — body text, headings, hero text. Clean, technical,
  slightly humanist.
- **Inconsolata** — UI chrome: navigation, buttons, footer links, section
  labels, severity badges. Monospace gives the terminal feel without being
  purely decorative.
- **JetBrains Mono** — search input. More compact than Inconsolata for
  data-entry context.
- **VT323** — decorative terminal display text (hero, large retro numerals).

Letter-spacing is deliberate: tight on large headings (-0.025em), wide on
uppercase labels (0.1em / 0.7px). This reinforces the terminal aesthetic where
caps + wide tracking = system chrome.

## Layout

Container widths follow a modular scale from 20rem (320px) to 80rem (1280px).
The base spacing unit is 4px — all spacing derives from multiples of 4.

| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |

Nav uses backdrop-blur (12px) with 80% opacity background for a frosted glass
effect over content. Footer is minimal — 3% black overlay, no padding, single
top border.

## Elevation & Depth

Shadows use a warm-tinted black (#3c2d1e) rather than neutral black, keeping
the vintage feel. Four levels:

| Token | Value |
|-------|-------|
| subtle | 0 1px 2px #3c2d1e12 |
| container | 0 1px 3px #3c2d1e17, 0 8px 24px -12px #3c2d1e33 |
| medium | 0 4px 12px -6px #3c2d1e29 |
| strong | 0 8px 24px -10px #3c2d1e3d |

Focus and hover states use amber-tinted ring shadows instead of traditional
box-shadows: `0 0 0 2px rgba(240, 140, 40, 0.5)` on focus, `0 0 0 1px
rgba(240, 140, 40, 0.35)` on hover.

## Shapes

Border radius follows a restrained scale. Most UI elements use 8px (md). Cards
use 12px (lg). Pills (severity badges, status dots) use 9999px.

## Components

- **nav-bar** uses backdrop blur + warm translucent background. The only
  structural border is a 1px bottom.
- **search-input** uses JetBrains Mono with uppercase + wide letter-spacing to
  feel like a terminal command prompt.
- **button-primary** is amber on dark — the single high-emphasis action per
  view. Ghost buttons use transparent backgrounds with the same type styling.
- **severity-badge** is a pill with solid foreground and translucent background
  from the severity scale. Variants per severity level use the same shape
  with different textColor references.
- **card** uses a warm tinted shadow (container level), subtle border, and a
  near-white background with a faint warm tint (#fbf9f3).

## Do's and Don'ts

- **Do** use Inconsolata for any UI element that should feel like system chrome
  (labels, badges, nav, buttons).
- **Do** use the severity scale for any status indicator — don't invent new
  status colors.
- **Don't** use pure white (#fff) as a background. Always use the warm
  limestone (#f8f6f1) or elevated (#fcfbf7).
- **Don't** use neutral black for shadows. Always use the warm-tinted
  #3c2d1e at low opacity.
- **Don't** apply border-radius larger than 12px except for pills.
- **Don't** mix more than two font families in a single component.
- **Note:** Ghost buttons on transparent backgrounds and footer text on 3%
  overlay fail WCAG AA contrast (4.5:1). Only use ghost buttons over
  sufficiently dark backgrounds; use foreground (#362c26) for footer text if
  contrast matters.