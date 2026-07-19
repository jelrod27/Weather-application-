# Newsletter Gitleaks Setup Design

## Problem

The Sunday newsletter workflow generates and validates its post, then fails at
`git commit` because the fail-closed Husky hook requires `gitleaks` and the
GitHub-hosted runner does not install it. The Wednesday workflow uses the same
commit path and is affected as well.

## Design

Add a setup step to both newsletter workflows before post generation. The step
downloads a pinned official Linux x64 `gitleaks` release archive, verifies its
published SHA-256 checksum, and installs the binary on the runner's `PATH`.
The existing Husky hook remains enabled and performs the staged secret scan
during `git commit`.

The two workflow files will use the same version, asset name, checksum lookup,
and installation commands so their behavior remains aligned.

## Error Handling

The setup step runs with shell error checking. A failed download, missing
checksum, checksum mismatch, extraction failure, or installation failure stops
the workflow before content generation or committing.

## Verification

- Add a static regression test that checks both newsletter workflows use the
  same pinned version and Linux asset, verify the official SHA-256 checksum,
  install `gitleaks` before content generation, and do not bypass Husky.
- Run the regression test through a red-green cycle.
- Run unit tests, workflow linting where available, local Playwright tests, and
  dead-code detection.
- After the change reaches `main`, start a fresh Sunday `workflow_dispatch`
  run from updated `main`; rerunning the old run would reuse its broken workflow
  definition.

## Scope

This change only updates the Sunday and Wednesday newsletter automation and its
regression coverage. It does not weaken hooks, change newsletter generation, or
recover the ephemeral post from the failed runner.
