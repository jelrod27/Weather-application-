# Contributing

16-Bit Weather is a solo-maintained project. Issues and pull requests are
welcome. For anything larger than a small fix, open an issue first so the
direction can be agreed before you spend time on it.

## Setup

- Node 22 (`.nvmrc`), `npm` only.
- `npm ci`, then copy `.env.example` to `.env.local` and fill in the Supabase
  values (see `CLAUDE.md`, "Environment Variables").
- `npm run dev` serves http://localhost:3000.
- Install `gitleaks`: the pre-commit and pre-push hooks scan for secrets and
  hard-fail without it.

## Before opening a pull request

Run the gates CI runs:

    npm run lint
    npm run typecheck && npm run typecheck:tests
    npm test
    npm run knip

Playwright E2E (`npm run test:e2e`) and Lighthouse (`npm run lighthouse`) run
on every PR; run them locally if you touched pages or API routes.

## Conventions

Read `CODING.md` before changing code. In short: strict TypeScript, `import
type` for type-only imports, API routes wrapped with `withApiRoute`, and no
`NEXT_PUBLIC_` prefix on anything secret.

## Security

Do not open public issues for vulnerabilities. See `SECURITY.md`.

## License

Contributions are accepted under the Fair Source License 0.9 in `LICENSE`.
