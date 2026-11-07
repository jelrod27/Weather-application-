# Offline macOS security tests

`run-local-tests.py` uses macOS `sandbox-exec`, existing local Node/dependencies,
and a dedicated bounded scratch volume. It installs nothing and inherits no
environment variables. Source/toolchain reads are allowed; source writes, host
home contents, `.env` files, `.git`, network/IPC and subprocess creation are denied.
The script must be launched by a trusted owner outside the target sandbox.

Memory is **monitored RSS**, not an OS memory limit. Sampling can overshoot
briefly. CPU time,
per-file size, open files and process limits use `setrlimit`; disk capacity is
bounded by the mounted volume. Wall time/output/RSS watchdogs kill the sole target
PID, including when it closes stdout/stderr. JavaScript heap is also capped.
This is not a VM and does not support browser/server fixtures requiring sockets.

Provision a new, dedicated directory outside the checkout, then create and mount
a 64 MiB image there (replace `/absolute/runner-directory` below):

```sh
mkdir -p /absolute/runner-directory/scratch
hdiutil create -size 64m -fs HFS+ -volname WeatherSecurityScratch /absolute/runner-directory/scratch.dmg
hdiutil attach -nobrowse -mountpoint /absolute/runner-directory/scratch /absolute/runner-directory/scratch.dmg
```

The runner refuses a scratch directory that is not a mount or exceeds 80 MiB.
Use an existing installation matching `package-lock.json` for `node_modules`.
If this checkout's `node_modules` is a symlink, the runner resolves it and grants
read access only to that dependency tree, not the other checkout or its secrets.

```sh
python3 scripts/security/run-local-tests.py --deps "$PWD/node_modules" --scratch /absolute/runner-directory/scratch --self-test
python3 scripts/security/run-local-tests.py --deps "$PWD/node_modules" --scratch /absolute/runner-directory/scratch -- node_modules/jest/bin/jest.js --no-cache --cacheDirectory=/absolute/runner-directory/scratch/cache __tests__/auth-result.test.tsx
python3 scripts/security/run-local-tests.py --deps "$PWD/node_modules" --scratch /absolute/runner-directory/scratch --memory-mib 1536 -- node_modules/typescript/bin/tsc --noEmit --incremental false
```

Jest automatically uses `scripts/security/jest.config.mjs` and runs in-band. That
configuration shares the project's custom setup, matchers and mappings and the
installed Next SWC transformer. It omits Next application-config discovery,
which invokes a TypeScript 6 subprocess. It does not load `.env` or exercise
Next build/config behavior. The normal project Jest configuration is unchanged
except that its custom configuration object now has a named export.

Defaults: 60 seconds CPU/wall, 512 MiB monitored RSS, 16 MiB per file, 128 KiB
captured output. A volume lock prevents concurrent jobs; the runner resets only
its disposable transform cache between jobs to avoid cumulative disk use.
Compiler/full-suite checks used 1536 MiB monitored RSS and at
most 120 seconds. Only bounded stdout/stderr is returned; files from scratch
are not retained. No secrets or provider credentials belong
in test fixtures or environment values.

Verified trusted probes: external sockets blocked; private canary and `.git`
reads blocked; source writes blocked; scratch writes allowed; Node subprocess
creation blocked; closed-output idle process killed at the wall limit; a
160 MiB buffer killed under a 128 MiB monitored RSS limit. Re-run the self-test
after changing the sandbox or toolchain. Background workers, shell/Git/tsx
integration fixtures and real-browser checks are intentionally unsupported.

When no runner is active, the scratch volume may be detached with
`hdiutil detach /absolute/runner-directory/scratch`. Its image can be retained
for later local runs; it contains only dummy fixtures and tool caches.
