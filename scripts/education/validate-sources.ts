/**
 * Checks every entry in the Guide source catalog, and exits non-zero on any
 * that would not be citable. Run via `npm run validate:education-sources`.
 *
 * It uses the generator's own fetch path, so passing here means exactly what
 * the generator needs: the page resolves, it is not an NWS Glossary miss (those
 * answer 200 with "there are no matches for"), and it carries enough text to
 * ground a claim.
 */

import { fetchSources } from './grounding';
import { SOURCES } from './sources';

async function main(): Promise<void> {
  console.log(`[validate-education-sources] checking ${SOURCES.length} catalog entries`);
  const results = await fetchSources(SOURCES);
  const failures: string[] = [];

  for (const result of results) {
    const status = String(result.status).padEnd(7);
    console.log(`${result.ok ? 'OK  ' : 'FAIL'} ${status} ${result.entry.id}`);
    if (!result.ok) {
      failures.push(`${result.entry.id} (${result.status}${result.reason ? `; ${result.reason}` : ''}) ${result.entry.url}`);
    }
  }

  console.log(`[validate-education-sources] ${SOURCES.length - failures.length}/${SOURCES.length} passed`);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[validate-education-sources] unexpected error:', err);
  process.exit(1);
});
