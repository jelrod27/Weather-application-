# Agent Guidelines for 16-Bit Weather

This is the model-facing entrypoint for Hermes, ChatGPT, Codex, Claude, and other AI coding agents working in this repository.

Before making code changes, read and follow `./CODING.md`. Treat `CODING.md` as the durable engineering handbook for architecture, commands, style, tests, security, and PR workflow.

## Project Snapshot

16-Bit Weather is a retro-styled weather education platform built with Next.js 16 App Router and React 19. It includes real-time weather data, educational content, interactive games, global weather tracking, tool-backed AI assistance, and Supabase-backed user AI memory.

Product specs live in `planning/prds/`. Start with `planning/prds/README.md` for product-level changes.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS v4
- Supabase
- Open-Meteo weather data
- Jest unit tests
- Playwright E2E tests
- Lighthouse CI performance validation
- Vercel-oriented deployment

## Dev Environment Tips

- Use `npm` commands in this repo; do not switch package managers.
- Use `rg` for code search when shell access is available.
- Read relevant files before editing and prefer existing utilities in `lib/`.
- For product-level changes, check `planning/prds/README.md` first.
- Keep `CODING.md` as the source of truth for detailed engineering rules.

## Testing Instructions

```bash
npm run dev
npm run build
npm run lint
npm test
npx playwright test
npm run validate:pr
```

Use targeted commands first, then broaden validation when changing shared behavior.

## PR Instructions

- Use `gh` for GitHub workflow tasks when requested.
- Before opening a PR, summarize what changed, why it changed, tests run, and known risks.
- Do not push, open PRs, bypass hooks, delete files, or reset git state unless explicitly asked.
- The pre-push hook runs Playwright, production build, and Lighthouse CI.

## Agent Operating Rules

- Preserve unrelated user changes. Do not revert files you did not intentionally edit.
- Keep changes scoped to the requested task.
- Prefer existing patterns, utilities, and folder structure.
- Read relevant files before editing.
- Update or add tests when behavior changes.
- Never commit secrets, `.env.local`, API keys, or tokens.
- When using GitHub workflows, use `gh` and report the important result.

## Required Closeout

When finished, report:

- files changed
- tests or checks run
- any tests not run and why
- risks or follow-ups that matter
