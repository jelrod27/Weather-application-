# Newsletter temporal consistency — November 8, 2026

## Trigger and resulting behavior

The November 8 edition paired Wednesday–Thursday with November 12–13 (Thursday–Friday) and called the November 3 SPC log afternoon-only despite report times spanning 10:10 a.m.–1:08 p.m. CST. A valid publication receipt proves which content was approved, not whether these statements agree with their source timestamps.

The new bounded consistency gate supplies deterministic UTC weekdays for forecast dates and compact local-clock summaries for every validated SPC report in a source day. The latter is retained in the existing source-audit snapshot field and includes reports beyond the prompt's 20-example cap. IANA rules provide daylight-saving conversion only for unambiguous statewide zones; split-zone/unsupported states stay unknown and need exact UTC wording. A report timestamp does not establish the publication time of a bulletin.

Explicit supported weekday/date contradictions and unsupported all-morning/all-afternoon report-day descriptions enter the existing two-retry generation correction budget. Exhaustion fails before image selection or publication; a later similarity rewrite is checked again. The publication CLI and changed-post CI gate repeat the comparison against the dated audit. Updating a receipt cannot bypass it. Existing source disclosures and publication/image/receipt rules remain in place.

## Verification

- Pure temporal regressions: eight intended failures against the no-op gate, then fourteen passing calendar/clock cases, including the original contradictions, explicit historical years, cross-year ranges, invalid dates, DST, local-date rollover, unknown zones and quoted/code/reference exclusions. Independent review added three failing cases for an earlier duplicate disclosure heading, count-qualified prose and explicit years on both range endpoints; all seventeen cases pass after correcting them.
- Pipeline regressions: four intended failures before integration, then four passing retry/exhaustion/rewrite/edited-receipt cases using the real Sunday generation and publication seams with only external/model boundaries mocked.
- Source evidence regression: removing the new audit snapshot caused the full-report clock test to fail; restoring it passed. Twenty afternoon examples plus a twenty-first morning report correctly retain both local hours even though the model receives only twenty examples.
- Existing newsletter collection/publication tests pass with the new clock metadata. Full integrated checks and independent review are recorded in the PR.
- After review corrections, all 303 newsletter tests across 22 suites passed, as did the expanded test TypeScript project. Forced lint of the normally ignored scripts reported no errors and ten existing console-statement warnings.
- PR #708 review reproduced comment removal joining surrounding tokens and collapsing quote boundaries. Comments are now masked with spaces while retaining line breaks, which also avoids recreating HTML comment delimiters (CodeQL #335). Two regressions failed before the correction and pass after it.
- CodeRabbit also reproduced numeric weather asides such as `Friday, November 13 — 5 percent chance` being mistaken for invalid date ranges. A spaced em-dash aside now requires an additional weekday, month or year qualifier to establish a range end. Calendar separators such as en dashes and `through` still validate bare endpoints. Both aside cases failed before the correction; independent review added three bare-range regressions against an initially overbroad qualifier rule. All six invalid-range cases remain rejected, and all **313 newsletter tests / 22 suites** pass after these changes; focused forced lint is clean.

## Limits

This is not a general natural-language factual verifier. The parser recognizes full weekday/month names with explicit date pairs and qualified aggregate SPC clock claims. It does not certify every narrative time phrase, historical context, forecast amount or weather mechanism. Unqualified years use the closest edition calendar date; historical statements should provide their year. Line quotes, fenced examples, comments and the immutable source disclosure are excluded. Older posts are not rewritten or assigned invented clock evidence.

The time-of-day comparison deliberately uses broad clock bands (morning before noon, afternoon noon–18:00, evening after 18:00, and a broad overnight band). For precise timing, use explicit UTC bounds. The statewide lookup is intentionally incomplete; it is not a coordinate-to-time-zone service.
