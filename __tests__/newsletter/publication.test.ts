/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { coverageDisclosure } from '@/lib/newsletter/coverage';
import { buildReceipt, contentDigest, publicationErrors, readPublicationBundle } from '@/lib/newsletter/publication';
import { publishPost } from '../../scripts/newsletter/publish';
import { promoteDraft, recordReview } from '../../scripts/newsletter/review';
import { validateGeneratedPost } from '../../scripts/newsletter/validate-post';
import { validateNewsletterChanges } from '../../scripts/newsletter/validate-changes';
import type { CoverageAudit } from '@/lib/newsletter/coverage';
import type { BlogPost } from '@/lib/blog';
import type { PublishSundayInput } from '../../scripts/newsletter/publish';

jest.mock('@/components/education/education-hub-client', () => ({ __esModule: true, default: () => null }));

const REPO = process.cwd();
const legacyName = fs.readdirSync(path.join(REPO, 'content/blog')).find(name => name.endsWith('.md'))!;
const legacyRaw = fs.readFileSync(path.join(REPO, 'content/blog', legacyName), 'utf8');
const WINDOW = { start: '2026-10-04T12:00:00.000Z', end: '2026-10-11T12:00:00.000Z' };
const INPUT: PublishSundayInput = {
  cadence: 'sunday_rearview', body: '## Rearview\n\nAmong available observations, Kp reached 8.\n\n## Roadmap\n\nThe forecast is unavailable.',
  openerHash: 'test', keyPhrases: [], similarityMax: 0, similarityJudge: 'test', modelUsed: 'test',
  images: [], imageAudit: [], spotlight: null, retries: 0, wordCount: 30, closerUsed: 'test',
};

function audit(partial = true): CoverageAudit {
  return {
    version: 1, cadence: 'sunday_rearview', generatedAt: WINDOW.end, window: WINDOW,
    sources: [{
      id: 'swpc-kp', label: 'NOAA SWPC Kp', url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
      retrievedAt: WINDOW.end, requested: WINDOW, covered: [WINDOW], records: 56, usable: true, status: 'complete',
      observationStart: WINDOW.start, observationEnd: '2026-10-11T09:00:00.000Z', unit: 'three-hour blocks', expectedUnits: 56, observedUnits: 56, reasons: [],
    }, ...(partial ? [{
      id: 'forecast', label: 'Forecast', url: 'https://api.open-meteo.com/v1/forecast', retrievedAt: WINDOW.end,
      requested: WINDOW, covered: [], records: 0, usable: false, status: 'unavailable' as const,
      observationStart: null, observationEnd: null, unit: 'forecast days', reasons: ['Request failed'],
    }] : [])],
  };
}

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-integrity-'));
  fs.mkdirSync(path.join(root, 'content/blog'), { recursive: true });
  fs.writeFileSync(path.join(root, 'content/blog', legacyName), legacyRaw);
  jest.spyOn(process, 'cwd').mockReturnValue(root);
});
afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

async function expectPublicExclusion(slug: string): Promise<void> {
  await jest.isolateModulesAsync(async () => {
    const blog = await import('@/lib/blog');
    expect(blog.getAllPosts().some(post => post.slug === slug)).toBe(false);
    expect(blog.getPostBySlug(slug)).toBeNull();
    const legacy = blog.getAllPosts()[0];
    expect(legacy).toBeDefined();
    expect(blog.getRelatedPosts(legacy.slug).some(post => post.slug === slug)).toBe(false);
    const { loadHistory } = await import('../../scripts/newsletter/state');
    expect(loadHistory().some(post => post.slug === slug)).toBe(false);
    const { GET } = await import('@/app/blog/rss.xml/route');
    expect(await (await GET()).text()).not.toContain(`/blog/${slug}`);
    const { default: sitemap } = await import('@/app/sitemap');
    expect((await sitemap()).some(entry => entry.url.endsWith(`/blog/${slug}`))).toBe(false);
    const { default: EducationPage } = await import('@/app/education/page');
    expect(EducationPage().props.latestPosts.some((post: Pick<BlogPost, 'slug'>) => post.slug === slug)).toBe(false);
  });
}

describe('newsletter publication boundary', () => {
  it('stores partial candidates outside the blog and keeps an accidentally copied candidate off every public discovery path', async () => {
    const candidate = await publishPost(INPUT, { coverage: audit(), root });
    expect(candidate.outcome).toBe('partial');
    expect(candidate.filePath).toContain(path.join('content', 'newsletter-drafts'));
    expect(fs.existsSync(candidate.auditPath)).toBe(true);
    await expectPublicExclusion(candidate.slug);
    const copied = path.join(root, 'content/blog', path.basename(candidate.filePath));
    fs.copyFileSync(candidate.filePath, copied);
    expect(validateGeneratedPost(copied, { publication: true, root }).ok).toBe(false);
    expect(validateGeneratedPost(copied, { publication: true, draft: true, root }).ok).toBe(false);
    await expectPublicExclusion(candidate.slug);
  });

  it('requires explicit acknowledgment and a disposition for every gap before promotion', async () => {
    const candidate = await publishPost(INPUT, { coverage: audit(), root });
    expect(() => promoteDraft(candidate.filePath, root)).toThrow();
    expect(() => recordReview(candidate.filePath, { reviewer: 'Editor', acknowledged: false, gapDispositions: {} }, root)).toThrow(/acknowledgment/);
    expect(() => recordReview(candidate.filePath, { reviewer: 'Editor', acknowledged: true, gapDispositions: {} }, root)).toThrow(/every incomplete source/);
    const receipt = recordReview(candidate.filePath, {
      reviewer: 'Editor', acknowledged: true, gapDispositions: { forecast: 'Omitted forecast claims and retained the unavailable-section notice.' },
    }, root);
    expect(receipt.decision).toBe('reviewed-partial');
    const publicFile = promoteDraft(candidate.filePath, root);
    const raw = fs.readFileSync(publicFile, 'utf8');
    expect(publicationErrors(raw, publicFile, { root })).toEqual([]);
    expect(raw).toContain(coverageDisclosure(audit()));
    expect(readPublicationBundle(raw, root).audit.sources[1].status).toBe('unavailable');
    expect(() => promoteDraft(candidate.filePath, root)).toThrow(/already exists/);
    expect(fs.readFileSync(publicFile, 'utf8')).toBe(raw);
    await jest.isolateModulesAsync(async () => {
      const { getPostBySlug } = await import('@/lib/blog');
      expect(getPostBySlug(candidate.slug)?.slug).toBe(candidate.slug);
    });
  });

  it.each(['body', 'frontmatter', 'audit'])('invalidates approval after %s changes', async changed => {
    const candidate = await publishPost(INPUT, { coverage: audit(), root });
    recordReview(candidate.filePath, { reviewer: 'Editor', acknowledged: true, gapDispositions: { forecast: 'Omit unavailable claims.' } }, root);
    if (changed === 'audit') fs.appendFileSync(candidate.auditPath, '\n');
    else {
      const original = fs.readFileSync(candidate.filePath, 'utf8');
      fs.writeFileSync(candidate.filePath, changed === 'body' ? `${original}\nA new claim.\n` : original.replace('author: 16bitbot', 'author: changed'));
    }
    expect(() => promoteDraft(candidate.filePath, root)).toThrow(/changed after approval/);
  });

  it('rejects removal of the coverage disclosure, even at the draft review stage', async () => {
    const candidate = await publishPost(INPUT, { coverage: audit(), root });
    fs.writeFileSync(candidate.filePath, fs.readFileSync(candidate.filePath, 'utf8').split('## Source coverage')[0]);
    expect(() => recordReview(candidate.filePath, { reviewer: 'Editor', acknowledged: true, gapDispositions: { forecast: 'Omit.' } }, root)).toThrow(/disclosure/);
  });

  it('allows complete evidence through the normal public PR path with a bound audit', async () => {
    const candidate = await publishPost(INPUT, { coverage: audit(false), root });
    expect(candidate.outcome).toBe('complete');
    expect(candidate.filePath).toContain(path.join('content', 'blog'));
    expect(validateGeneratedPost(candidate.filePath, { publication: true, root }).ok).toBe(true);
    const raw = fs.readFileSync(candidate.filePath, 'utf8');
    expect(contentDigest(raw)).toBe(contentDigest(raw.replaceAll('\n', '\r\n')));
  });

  it('rejects an empty reviewer identity', () => {
    expect(() => buildReceipt('post', '{}', { decision: 'reviewed-partial', reviewer: ' ', gapDispositions: {} })).toThrow();
  });

  it('refuses to overwrite a complete public post when the same edition is generated again', async () => {
    const candidate = await publishPost(INPUT, { coverage: audit(false), root });
    const original = fs.readFileSync(candidate.filePath, 'utf8');
    await expect(publishPost({ ...INPUT, body: 'A different generated edition.' }, { coverage: audit(false), root }))
      .rejects.toMatchObject({ code: 'EEXIST' });
    expect(fs.readFileSync(candidate.filePath, 'utf8')).toBe(original);
    expect(validateGeneratedPost(candidate.filePath, { publication: true, root }).ok).toBe(true);
  });

  it('writes no candidate when no usable evidence exists', async () => {
    const coverage = audit();
    coverage.sources = [coverage.sources[1]];
    await expect(publishPost(INPUT, { coverage, root })).rejects.toThrow(/without usable evidence/);
    expect(fs.existsSync(path.join(root, 'content/newsletter-drafts'))).toBe(false);
  });

  it('preserves unchanged legacy posts without exempting changed or newly generated posts', () => {
    expect(publicationErrors(legacyRaw, legacyName, { root })).toEqual([]);
    expect(publicationErrors(`${legacyRaw}\nChanged.`, legacyName, { root })).not.toEqual([]);
    expect(publicationErrors(legacyRaw, 'new-post.md', { root })).not.toEqual([]);
  });

  it('enforces coverage for added public posts in the actual git-diff PR gate', async () => {
    const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    git('init', '--quiet');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.test');
    git('add', '.');
    git('commit', '-qm', 'Legacy baseline');
    const base = git('rev-parse', 'HEAD');
    const candidate = await publishPost(INPUT, { coverage: audit(), root });
    fs.copyFileSync(candidate.filePath, path.join(root, 'content/blog', path.basename(candidate.filePath)));
    git('add', '.');
    git('commit', '-qm', 'Accidental public copy');
    expect(validateNewsletterChanges(base, root).join('\n')).toContain('unpublished');
  });
});
