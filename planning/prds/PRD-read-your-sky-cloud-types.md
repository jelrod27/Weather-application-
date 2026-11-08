# Read your sky v2: scientific cloud names

**Status: research complete — no-go for production as of 2026-11-08.** Tracked by [issue #666](https://github.com/jelrod27/Weather-application-/issues/666). This document defines the bounded next decision; it is not implementation or launch approval. The shipped cloud-cover experience remains specified in [PRD-read-your-sky.md](./PRD-read-your-sky.md).

## Decision and evidence

The [source audit](../research/cloud-types-source-audit-2026-11-08.md) decoded actual DWD international SYNOP/BUFR data and reviewed Meteomatics satellite Cloud Type and meteoblue Cloud Type documentation. Twelve coordinates/policies were declared before scoring. Public retention allowed **23 hourly slots × 12 coordinates = 276**, not the requested week; all **2,016 requested slots** remain in the results, including **1,740 outside the retained window**.

Baseline DWD results: 7 explicit-genus slots (2.54%), 7 ambiguous, 47 stale, 100 missing, 115 outside geographic policy; zero selected clear/obscured/unclassified slots. The source can report scientific genera at particular nearby stations, but this does not establish dependable point overhead detection or launch-ready regional availability. San Ramon has no qualifying station in this sample. Commercial taxonomy/entitlement and independent genus accuracy remain unvalidated. No source, region or genus is launch approved.

## Preserved product direction

Identify scientific cloud names automatically where defensible evidence exists for the selected forecast location; no visitor image upload or manual identification is required. Geography is availability-driven. Extend **A — Field note** with a scientific name, concise explanation, reviewed original genus illustration and existing learning/return navigation. Restrict any later launch to supported WMO genera; species/varieties are out of scope.

Keep **reported nearby genus**, **estimated genus** and **satellite category** distinct. A station's sky remains a nearby report with source/time/distance, never exact overhead detection. A broad low/high category or cover percentage cannot establish a genus. Preserve alternatives and optional membership rather than turning “A or B” into two confirmed types. Keep observation, source receipt if available, publication proxy and retrieval times separate.

Retain the existing approximately two-hour **cloud-cover** outlook. No current genus observation may become a future genus forecast. With ambiguous, stale, obscured, unavailable, unsupported or conflicting evidence, retain the independent shipped sky estimate and explain that available evidence could not identify the cloud type. Missing must never become clear.

## Hard gates before implementation or launch

- Explicit approval of named supported stations/regions/genera, the value of nearby-only reports and fallback wording.
- Current usable evidence and a sustained sample with all failed/missing slots included; agree cohort/window and operational availability threshold before scoring. The present short sample is insufficient.
- Meteorological review of code mapping, optional/alternative membership, observing-method/quality limitations and geographic/terrain suitability. Age/distance/elevation cutoffs are application policies, not representativeness guarantees.
- Verified public display, attribution, caching/retention/redistribution rights and an accepted operating budget at both traffic scenarios.
- For any classifier: independent matched per-class/day/night validation and abstention/error analysis against the predeclared candidate thresholds; accuracy remains unvalidated until then.
- An approved evidence contract, source-specific freshness/quality rules, honest illustrations and complete failure/conflict states, followed by normal engineering/security/preview gates and separate launch approval.

## Draft next task boundaries

**Optional station-only research prototype, requiring separate approval:** pick a small named cohort independently of successful observations; obtain an explicitly stated longer window through already authorized archives or a separately authorized collection; reproduce provenance and independent age/distance/elevation sensitivity; review station observation methods, terrain exclusions and mapping; evaluate whether clearly labeled nearby reports provide sufficient user value. Keep the prototype outside production UI/API/database paths. The audit supplies reproducible fixtures, every sampled slot and eleven Field note A evidence/content examples.

**Optional commercial clarification, requiring separate authorization for access/contact/spend:** establish Meteomatics native footprint/product version/quality and display/cache rights; establish meteoblue result value semantics, model provenance, exact domains and point extraction/Maps licence; obtain exact all-in prices, limits and permitted fixtures. No provider contact, paid trial, credentials, purchase or new task creation is authorized here.

Production adapters, source ingestion infrastructure, UI, database changes, rollout, new illustrations and an all-ten-genus/global commitment remain outside this completed research issue.
