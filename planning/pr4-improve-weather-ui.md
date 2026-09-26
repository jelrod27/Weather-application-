# PR 4: Improve the weather experience

Approved September 26, 2026. Everyday users first, with depth for enthusiasts.

## Design decision

Use the **Day Plan** prototype's hierarchy and tighter typography with the existing **Daybreak** palette: cream surfaces, sky-blue actions and restrained sunrise-amber accents. Keep other supported themes working through existing theme variables. The approved sample-data prototype is preserved on local branch `codex/prototype-weather-ui`, commit `9806729`; it is a design reference, not production code.

## Six commits and acceptance criteria

1. **Local forecast briefing and hierarchy.** Put a compact, data-derived next-few-hours briefing beside current conditions on desktop and above them on mobile. Use current hourly timestamps, temperature, precipitation probability and available wind. Preserve units and location time zone; omit unavailable metrics and never fabricate conditions or precise rain arrival. Make hourly planning prominent, retain the daily forecast and all detailed metrics, and use the approved tighter typography without changing the site's global font system.
2. **Connected weather journeys.** Connect forecast, hourly, radar and an explanation with the viewed city and coordinates preserved. Provide explicit return links. Keep warning-to-radar context intact; sanitize return destinations and reject external redirects. Never confuse the viewed city with a subscribed warning pin.
3. **Compact mobile radar.** Keep place, selected frame time/age and play/pause accessible; move secondary controls into an accessible expandable area on small screens. Retain desktop controls, layers, presets, source/status and historical-data caveats. No new radar provider or predicted arrival time.
4. **One set of travel controls.** Use one Fly/Drive choice and one day choice for the form, result and national outlook. Clear results when inputs change and ignore stale responses after edits. Preserve existing corridor/airport limits and errors, and do not imply departure optimization. Aviation data is live only: Fly selects Today and explains why future days are unavailable.
5. **Illustrated weather lessons.** Provide short, source-backed cloud, storm and radar explanations with usable diagrams and simple interactive steps. Connect them to the forecast/radar journey and return to the originating view. Keep probabilities distinct from radar history. Reuse existing education content/diagrams where appropriate.
6. **Keyboard-accessible learning cards.** Replace mouse-only card controls in cloud types, weather systems and fun facts with native buttons or disclosures, visible focus and clear expanded state. Preserve source/detail links as separate usable links. Verify the full journey on desktop and phone-sized layouts.

## Boundaries and validation

No new providers, paid services, database changes, global theme rewrite, or sample-data production screens. Keep existing data correctness and recovery behavior from PRs 1–3. Preserve unrelated local `.agents/` files.

Add focused behavior regressions for summaries, journey context, travel controls and accessible learning interactions. Run relevant unit tests, both TypeScript checks, lint, production build and focused browser journeys. After all six commits, run the local code-review skill's independent Standards and Spec reviews against the agreed baseline, fix findings, then push and open one PR. Do not merge it.
