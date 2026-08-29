# Notation and reading typography are invariant across themes

Education Guides are drawn in meteorology's own chart language: frontal symbols, isobars, wind barbs, station models. Two things in that system do not follow the active theme.

**Notation colors are fixed.** A cold front is blue and a warm front is red in all six themes, because those colors are standardized meaning rather than decoration — recoloring them to `--primary` would make the diagram say something different. The substrate does follow the theme: paper, ink, grid and chrome all read from the normal tokens.

**Reading typography is fixed.** Guide prose sets in `--font-reading`, defined once on `:root`, not per theme. This exists because `app/theme.css` couples typeface to palette: all four premium themes set `--font-body` to a monospace face, and `synthwave84` and `matrix` set it to VT323, a pixel display face. That is survivable at 84 words and unreadable at 900. Themes color the page and style the furniture; they do not decide whether prose is legible. Monospace is retained where it is correct — labels, values, and chart annotation.

## Consequences

Hardcoded notation colors will look like a theming bug to the next reader, and the instinct will be to route them through theme tokens. They are not a bug. `theme.css` is deliberately untouched by this decision; `--font-reading` is additive.
