/**
 * Smoke check — exercises every data path that can fail in CI without
 * actually calling the LLM. Run via `npx tsx scripts/newsletter/_smoke-check.ts`.
 *
 * Verifies: history load, topic selection, image selection, news fetch,
 * Mesonet, SPC, SWPC, USGS, Open-Meteo. Does NOT exercise Anthropic —
 * that requires ANTHROPIC_API_KEY and burns tokens.
 */

import { fetchPastWeekQuakes } from './data/earthquakes';
import { fetchForecastOutlook } from './data/forecast';
import { fetchPastWeekWarnings } from './data/mesonet';
import { fetchSpaceWeatherSummary } from './data/space-weather';
import { fetchPastWeekReports } from './data/spc-reports';
import { selectImages } from './images';
import { fetchHeadlines } from './news';
import {
  getRecentImages,
  getTopicWeeksSinceLastUsed,
  loadHistory,
} from './state';
import { selectTopic } from './topics';

async function step<T>(name: string, fn: () => Promise<T> | T): Promise<T | null> {
  try {
    const t0 = Date.now();
    const out = await fn();
    console.log(`  OK ${name} (${Date.now() - t0}ms)`);
    return out;
  } catch (err) {
    console.log(`  FAIL ${name}: ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('=== State + selection ===');
  const history = loadHistory();
  console.log(`  history posts: ${history.length}`);
  const topicWeeks = getTopicWeeksSinceLastUsed(history);
  const topic = selectTopic(topicWeeks);
  console.log(`  topic pick: ${topic.topic.slug} (${topic.rationale})`);
  const recentImages = new Set(getRecentImages(history));
  console.log(`  recent image IDs (8wk): ${recentImages.size}`);
  const images = selectImages({ topic: topic.topic.slug, count: 3, excludeIds: recentImages });
  console.log(`  selected images: ${images.map((i) => i.id).join(', ')}`);

  console.log('=== Data fetchers ===');
  await step('news headlines', async () => {
    const h = await fetchHeadlines();
    console.log(`     ${h.length} headlines`);
    return h;
  });
  await step('Iowa Mesonet warnings', async () => {
    const w = await fetchPastWeekWarnings();
    console.log(JSON.stringify(w.sources, null, 2));
    return w;
  });
  await step('SPC reports', async () => {
    const s = await fetchPastWeekReports();
    console.log(JSON.stringify(s.sources, null, 2));
    return s;
  });
  await step('SWPC space weather', async () => {
    const s = await fetchSpaceWeatherSummary();
    console.log(JSON.stringify(s.sources, null, 2));
    return s;
  });
  await step('USGS earthquakes', async () => {
    const q = await fetchPastWeekQuakes();
    console.log(JSON.stringify(q.sources, null, 2));
    return q;
  });
  await step('Open-Meteo forecast outlook', async () => {
    const f = await fetchForecastOutlook();
    console.log(JSON.stringify(f.sources, null, 2));
    return f;
  });

  console.log('=== Done ===');
}

main().catch((err) => {
  console.error('smoke check fatal:', err);
  process.exit(1);
});
