---
name: sentry-triage
description: Triage, rank, and fix Sentry errors with proper discipline. Use when asked to go into Sentry to find and fix errors, clear the worst issues, investigate a specific Sentry issue, or decide what to fix first. Ranks by impact not raw count, reproduces before fixing, and resolves in Sentry only after the fix is verified.
---

# Sentry Triage and Fix

Bring discipline to two recurring judgments: which errors actually deserve a fix, and how to fix them without papering over root cause. Use the connected Sentry MCP tools for all Sentry interaction.

## Phase 1: Rank by impact, not count

Raw event count is the wrong sort key. A noisy handled log can outrank a crash that hits three users on a core path. Pull the issue list with `search_issues`, then rank on damage:

- Crash vs handled: an unhandled crash or unwinnable state beats a caught-and-logged error every time.
- Users affected: weight by distinct users, not total events. One bug firing 10000 times for one user matters less than one firing twice for 200 users.
- Regression vs chronic: new and climbing is worse than old and flat. Check first-seen and the event trend. A spike right after a deploy is a regression and jumps the queue.
- Path criticality: errors on a core path (the play loop, scoring, auth, the agent's main execution path) outrank errors on a rarely-hit surface.
- Project weighting is a tiebreaker only. Rank on the four signals above first; use project to break ties, not to set the order.

Output a ranked shortlist with one line each: title, severity call, users, trend, and the one reason it ranks where it does. Get agreement on the target before fixing, unless told to just proceed.

## Phase 2: Fix with discipline

For each issue you take on, in this order. Do not skip ahead.

1. Understand it. Use `analyze_issue_with_seer` for root-cause analysis and `search_issue_events` / `get_issue_tag_values` to see the conditions: which release, platform, inputs, user segment. Read the stack trace against the actual code.
2. Reproduce it. Confirm you can trigger the error or, for a deterministic system, construct the exact state that produces it. If you cannot reproduce it, say so and do not claim a fix; a fix for a bug you cannot trigger is a guess.
3. Write a failing test first. The test should fail on the current bug and pass once fixed. This is what proves the fix is real and stops the issue from silently returning.
4. Fix root cause, not the symptom. A try/catch that swallows the error, a null guard that hides why the value was null, or a Sentry filter that mutes the issue are not fixes. If the honest fix is larger than the time available, say that plainly rather than shipping a suppressant.
5. Verify. Run the new test and the full suite green. Confirm the change addresses the conditions Seer and the event data showed, not just the one stack frame.
6. Resolve in Sentry last. Only after the fix is merged and verified, update the issue with `update_issue`. Resolving before verifying is how ghosts come back. If the issue is already dormant (killed by an unrelated change), confirm that with the event trend before resolving, and note it.

## Rules

- One issue at a time through the full cycle. Do not batch fixes across unrelated root causes in one change.
- Never resolve an issue you have not verified is actually fixed or actually dormant.
- Never suppress to make a number go down.
- No em dashes or emojis in commits, PR descriptions, or Sentry comments.
- End with: what was fixed, the root cause in one sentence, the test that pins it, and what you deliberately left for later and why.
