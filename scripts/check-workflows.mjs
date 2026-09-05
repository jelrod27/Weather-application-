#!/usr/bin/env node
// Checks every workflow under .github/workflows: parses it as YAML, prints
// its top-level permissions, and flags any `uses:` that is not pinned to a
// 40-hex commit SHA. Exits 1 on a parse failure or an unpinned action.
//
//   node scripts/check-workflows.mjs
//
// Run from the repository root. js-yaml is already a transitive dependency.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const dir = path.join(process.cwd(), '.github', 'workflows');
let failures = 0;

for (const file of readdirSync(dir).filter((name) => /\.ya?ml$/.test(name)).sort()) {
  let doc;
  try {
    doc = yaml.load(readFileSync(path.join(dir, file), 'utf8'));
  } catch (error) {
    console.log(`PARSE FAIL ${file}: ${error.message}`);
    failures += 1;
    continue;
  }
  const permissions = doc.permissions ? JSON.stringify(doc.permissions) : '(none at top level)';
  const unpinned = [];
  for (const job of Object.values(doc.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (step.uses && !/@[0-9a-f]{40}\b/.test(step.uses)) unpinned.push(step.uses);
    }
  }
  if (unpinned.length > 0) failures += 1;
  const status = unpinned.length > 0 ? 'UNPINNED' : 'ok';
  console.log(`${status} ${file.padEnd(26)} permissions=${permissions} unpinned=${unpinned.length > 0 ? unpinned.join(',') : 'none'}`);
}

console.log(failures > 0 ? `${failures} file(s) failed` : 'all workflows parse');
process.exit(failures > 0 ? 1 : 0);
