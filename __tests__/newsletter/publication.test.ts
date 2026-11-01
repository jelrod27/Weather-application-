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
import type { PublishInput, PublishSundayInput } from '../../scripts/newsletter/publish';

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

function inputFor(cadence: PublishInput['cadence']): PublishInput {
  return cadence === 'sunday_rearview' ? INPUT : {
    ...INPUT, cadence, topicSlug: 'historical_events', topicTitle: 'Historical Weather Events', theme: 'How historic storms shaped weather science',
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

async function legacyDraft(): Promise<Awaited<ReturnType<typeof publishPost>>> {
  const candidate = await publishPost(INPUT, { coverage: audit(), root });
  const draftPath = path.join(root, 'content/newsletter-drafts', 'legacy', path.basename(candidate.filePath));
  if (candidate.filePath !== draftPath) {
    fs.mkdirSync(path.dirname(draftPath), { recursive: true });
    fs.renameSync(candidate.filePath, draftPath);
  }
  fs.rmSync(candidate.auditPath.replace(/\.json$/, '.review.json'), { force: true });
  return { ...candidate, filePath: draftPath };
}

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
  it.each(['wednesday_topic', 'sunday_rearview'] as const)('publishes %s with honest partial coverage on every public discovery path', async cadence => {
    const coverage = { ...audit(), cadence };
    const candidate = await publishPost(inputFor(cadence), { coverage, root });
    expect(candidate.outcome).toBe('partial');
    expect(path.dirname(candidate.filePath)).toBe(path.join(root, 'content/blog'));
    expect(validateGeneratedPost(candidate.filePath, { publication: true, root }).errors).toEqual([]);
    const raw = fs.readFileSync(candidate.filePath, 'utf8');
    expect(raw).toContain(coverageDisclosure(coverage));
    const bundle = readPublicationBundle(raw, root);
    const receipt = JSON.parse(fs.readFileSync(bundle.receiptPath, 'utf8'));
    expect(receipt.decision).toBe('disclosed-partial');
    expect(receipt.gapDispositions.forecast).toContain('Request failed');
    await jest.isolateModulesAsync(async () => {
      const blog = await import('@/lib/blog');
      expect(blog.getPostBySlug(candidate.slug)?.coverageStatus).toBe('partial');
      expect(blog.getAllPosts().some(post => post.slug === candidate.slug)).toBe(true);
      const { loadHistory } = await import('../../scripts/newsletter/state');
      expect(loadHistory().some(post => post.slug === candidate.slug)).toBe(true);
      const { GET } = await import('@/app/blog/rss.xml/route');
      expect(await (await GET()).text()).toContain(`/blog/${candidate.slug}`);
      const { default: sitemap } = await import('@/app/sitemap');
      expect((await sitemap()).some(entry => entry.url.endsWith(`/blog/${candidate.slug}`))).toBe(true);
      const { default: EducationPage } = await import('@/app/education/page');
      expect(EducationPage().props.latestPosts.some((post: Pick<BlogPost, 'slug'>) => post.slug === candidate.slug)).toBe(true);
    });
  });

  it.each([
    { cadence: 'wednesday_topic', partial: true }, { cadence: 'wednesday_topic', partial: false },
    { cadence: 'sunday_rearview', partial: true }, { cadence: 'sunday_rearview', partial: false },
  ] as const)('prepares a merge-to-publish PR for $cadence (partial=$partial)', async ({ cadence, partial }) => {
    const candidate = await publishPost(inputFor(cadence), { coverage: { ...audit(partial), cadence }, root });
    const outputDir = path.join(root, 'newsletter-output');
    fs.mkdirSync(outputDir);
    fs.writeFileSync(path.join(outputDir, 'run.json'), JSON.stringify({ ...candidate, stage: 'ready', dryRun: false }));
    const output = path.join(root, 'github-output');
    execFileSync(path.join(REPO, 'node_modules/.bin/tsx'), [path.join(REPO, 'scripts/newsletter/workflow-result.ts')], {
      cwd: root, env: { ...process.env, GITHUB_OUTPUT: output, TSX_TSCONFIG_PATH: path.join(REPO, 'tsconfig.json') }, stdio: 'pipe',
    });
    const values = fs.readFileSync(output, 'utf8');
    expect(values).toContain('post_file=content/blog/');
    expect(values).toMatch(/receipt_file=content\/newsletter-audits\/[^\n]+\.review\.json/);
    const body = fs.readFileSync(path.join(outputDir, 'pr-body.md'), 'utf8');
    expect(body).toMatch(/merg(e|ing).*publish/i);
    expect(body).toContain('Auto-merge is requested');
    expect(body).toContain('required checks and resolved review conversations');
    expect(body).not.toMatch(/does not publish|publishes nothing|explicit approval|draft PR/);
    if (partial) expect(body).toContain('Request failed');
  });

  it('keeps legacy unreceipted drafts off every public discovery path', async () => {
    const candidate = await legacyDraft();
    await expectPublicExclusion(candidate.slug);
    const copied = path.join(root, 'content/blog', path.basename(candidate.filePath));
    fs.copyFileSync(candidate.filePath, copied);
    expect(validateGeneratedPost(copied, { publication: true, root }).ok).toBe(false);
    expect(validateGeneratedPost(copied, { publication: true, draft: true, root }).ok).toBe(false);
    await expectPublicExclusion(candidate.slug);
  });

  it('requires explicit acknowledgment and a disposition for every gap before promotion', async () => {
    const candidate = await legacyDraft();
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
    const candidate = await legacyDraft();
    recordReview(candidate.filePath, { reviewer: 'Editor', acknowledged: true, gapDispositions: { forecast: 'Omit unavailable claims.' } }, root);
    if (changed === 'audit') fs.appendFileSync(candidate.auditPath, '\n');
    else {
      const original = fs.readFileSync(candidate.filePath, 'utf8');
      fs.writeFileSync(candidate.filePath, changed === 'body' ? `${original}\nA new claim.\n` : original.replace('author: 16bitbot', 'author: changed'));
    }
    expect(() => promoteDraft(candidate.filePath, root)).toThrow(/changed after approval/);
  });

  it('rejects removal of the coverage disclosure, even at the draft review stage', async () => {
    const candidate = await legacyDraft();
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

  it.each([true, false])('refuses to overwrite an existing edition (partial=%s)', async partial => {
    const candidate = await publishPost(INPUT, { coverage: audit(partial), root });
    const original = fs.readFileSync(candidate.filePath, 'utf8');
    await expect(publishPost({ ...INPUT, body: 'A different generated edition.' }, { coverage: audit(partial), root }))
      .rejects.toMatchObject({ code: 'EEXIST' });
    expect(fs.readFileSync(candidate.filePath, 'utf8')).toBe(original);
    expect(validateGeneratedPost(candidate.filePath, { publication: true, root }).ok).toBe(true);
  });

  it('writes no candidate when no usable evidence exists', async () => {
    const coverage = audit();
    coverage.sources = [coverage.sources[1]];
    await expect(publishPost(INPUT, { coverage, root })).rejects.toThrow(/without usable evidence/);
    expect(fs.readdirSync(path.join(root, 'content/blog'))).toEqual([legacyName]);
    expect(fs.existsSync(path.join(root, 'content/newsletter-audits'))).toBe(false);
  });

  it('writes no public files during a dry run', async () => {
    const candidate = await publishPost(INPUT, { coverage: audit(), root, dryRun: true });
    expect(fs.existsSync(candidate.filePath)).toBe(false);
    expect(fs.existsSync(candidate.auditPath)).toBe(false);
  });

  it.each([
    '2026-10-21-cryosphere-2026-10-21.md',
    '2026-10-28-historical-events-2026-10-28.md',
  ])('recovers the previously merged %s as a valid public article', file => {
    const fullPath = path.join(REPO, 'content/blog', file);
    expect(validateGeneratedPost(fullPath, { publication: true, root: REPO }).errors).toEqual([]);
  });

  it('preserves unchanged legacy posts without exempting changed or newly generated posts', () => {
    expect(publicationErrors(legacyRaw, legacyName, { root })).toEqual([]);
    expect(publicationErrors(`${legacyRaw}\nChanged.`, legacyName, { root })).not.toEqual([]);
    expect(publicationErrors(legacyRaw, 'new-post.md', { root })).not.toEqual([]);
  });

  it('rejects a PR containing only a newsletter draft', async () => {
    const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    git('init', '--quiet');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.test');
    git('add', '.');
    git('commit', '-qm', 'Baseline');
    const base = git('rev-parse', 'HEAD');
    await legacyDraft();
    git('add', '.');
    git('commit', '-qm', 'Draft-only newsletter');
    expect(validateNewsletterChanges(base, root).join('\n')).toContain('must include a publishable post');
  });

  it.each([false, true])('requires an edited legacy draft to publish its edit in the same PR (publicChanged=%s)', async publicChanged => {
    const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    git('init', '--quiet');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.test');
    const candidate = await publishPost(INPUT, { coverage: audit(), root });
    const draftPath = path.join(root, 'content/newsletter-drafts/legacy', path.basename(candidate.filePath));
    fs.mkdirSync(path.dirname(draftPath), { recursive: true });
    fs.copyFileSync(candidate.filePath, draftPath);
    git('add', '.');
    git('commit', '-qm', 'Published edition and retained draft');
    const base = git('rev-parse', 'HEAD');
    const edited = fs.readFileSync(draftPath, 'utf8').replace('Kp reached 8', 'Kp reached 7');
    fs.writeFileSync(draftPath, edited);
    if (publicChanged) {
      fs.writeFileSync(candidate.filePath, edited);
      const bundle = readPublicationBundle(edited, root);
      const prior = JSON.parse(fs.readFileSync(bundle.receiptPath, 'utf8'));
      fs.writeFileSync(bundle.receiptPath, JSON.stringify(buildReceipt(edited, bundle.auditRaw, {
        decision: prior.decision, reviewer: prior.reviewer, gapDispositions: prior.gapDispositions,
      })));
    }
    git('add', '.');
    git('commit', '-qm', 'Edit legacy draft');
    const errors = validateNewsletterChanges(base, root);
    if (publicChanged) expect(errors).toEqual([]);
    else expect(errors.join('\n')).toContain('must include a publishable post');
  });

  it.each(['body', 'audit', 'receipt'])('rejects automatic partial publication when its %s is altered', async changed => {
    const candidate = await publishPost(INPUT, { coverage: audit(), root });
    const receiptPath = candidate.auditPath.replace(/\.json$/, '.review.json');
    if (changed === 'body') fs.appendFileSync(candidate.filePath, '\nAn unchecked change.');
    else if (changed === 'audit') fs.appendFileSync(candidate.auditPath, '\n');
    else {
      const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
      receipt.gapDispositions = {};
      fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    }
    expect(validateGeneratedPost(candidate.filePath, { publication: true, root }).ok).toBe(false);
    await expectPublicExclusion(candidate.slug);
  });

  it('accepts a publishing PR with disclosed source gaps in the git-diff gate', async () => {
    const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    git('init', '--quiet');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.test');
    git('add', '.');
    git('commit', '-qm', 'Baseline');
    const base = git('rev-parse', 'HEAD');
    await publishPost(INPUT, { coverage: audit(), root });
    git('add', '.');
    git('commit', '-qm', 'Publish limited evidence');
    expect(validateNewsletterChanges(base, root)).toEqual([]);
  });

  it('enforces coverage for added public posts in the actual git-diff PR gate', async () => {
    const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    git('init', '--quiet');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.test');
    git('add', '.');
    git('commit', '-qm', 'Legacy baseline');
    const base = git('rev-parse', 'HEAD');
    const candidate = await legacyDraft();
    fs.copyFileSync(candidate.filePath, path.join(root, 'content/blog', path.basename(candidate.filePath)));
    git('add', '.');
    git('commit', '-qm', 'Accidental public copy');
    expect(validateNewsletterChanges(base, root).join('\n')).toContain('unpublished');
  });
});
