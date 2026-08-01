/**
 * Markdown image reading and stripping, in one place.
 *
 * CommonMark allows balanced parentheses inside an unbracketed link
 * destination, so `![alt](url)` cannot be read with `\(([^)]+)\)` — that
 * truncates at the first `)`, which Wikimedia `Special:FilePath` titles
 * routinely contain (e.g. `...%28MODIS 2019-01-29%29.jpg`).
 *
 * Both the publish-time validator and the draft-cleaning step need the same
 * reader. They used to carry separate implementations and the truncation bug
 * was fixed in only one of them, so the destination scanner lives here and
 * both callers cross this seam.
 */

export interface MarkdownImage {
  alt: string;
  url: string;
}

export interface LinkDestination {
  /** The destination itself, without any `<>` delimiters. */
  url: string;
  /** Index just past the closing `)`, so callers can resume scanning there. */
  endIndex: number;
}

/**
 * Reads a link destination starting at `start` (the character after the
 * opening `(`). Returns null when it is unterminated.
 *
 * Returns `endIndex` rather than leaving callers to derive it: for a `<...>`
 * destination the returned url excludes both delimiters, so `start + url.length`
 * lands two characters short of the closing `)` and the scan resumes inside the
 * text it was supposed to consume.
 */
export function readLinkDestination(content: string, start: number): LinkDestination | null {
  if (content[start] === '<') {
    const close = content.indexOf('>', start + 1);
    if (close === -1) return null;
    const paren = content.indexOf(')', close + 1);
    if (paren === -1) return null;
    return { url: content.slice(start + 1, close), endIndex: paren + 1 };
  }

  let depth = 0;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\\' && i + 1 < content.length) {
      i += 1;
      continue;
    }
    if (ch === '(') {
      depth += 1;
      continue;
    }
    if (ch === ')') {
      if (depth === 0) return { url: content.slice(start, i), endIndex: i + 1 };
      depth -= 1;
      continue;
    }
    if (depth === 0 && (ch === '\n' || ch === '\r')) return null;
  }
  return null;
}

/** Extracts every `![alt](destination)` image in document order. */
export function extractMarkdownImages(content: string): MarkdownImage[] {
  const images: MarkdownImage[] = [];
  const startRx = /!\[([^\]]*)\]\(/g;
  let match: RegExpExecArray | null;
  while ((match = startRx.exec(content)) !== null) {
    const dest = readLinkDestination(content, match.index + match[0].length);
    if (dest === null) continue;
    images.push({ alt: match[1], url: dest.url.trim() });
    startRx.lastIndex = dest.endIndex;
  }
  return images;
}

/**
 * Removes ALL image markdown from a draft — both `![alt](url)` and bare
 * `![alt]`.
 *
 * The generator is told not to embed images (real catalog images are spliced
 * in afterward), so anything left is a hallucination: a placeholder, a
 * relative `(image1)` ref, or a prompt-injected off-catalog URL. Stripping
 * every one keeps the published post limited to allow-listed catalog imagery.
 *
 * Also collapses the horizontal-rule separators the model tends to wrap such
 * placeholders in, plus any blank-line runs left behind.
 */
export function stripImageMarkdown(content: string): string {
  let out = '';
  let cursor = 0;
  const startRx = /!\[[^\]]*\]/g;
  let match: RegExpExecArray | null;

  while ((match = startRx.exec(content)) !== null) {
    if (match.index < cursor) continue;
    const afterBracket = match.index + match[0].length;

    if (content[afterBracket] !== '(') {
      // Bare `![alt]` with no destination.
      out += content.slice(cursor, match.index);
      cursor = afterBracket;
      startRx.lastIndex = cursor;
      continue;
    }

    const dest = readLinkDestination(content, afterBracket + 1);
    // Unterminated destination — leave the text alone rather than eating the
    // rest of the draft.
    if (dest === null) continue;

    out += content.slice(cursor, match.index);
    cursor = dest.endIndex;
    startRx.lastIndex = cursor;
  }

  out += content.slice(cursor);
  return collapseOrphanedSeparators(out);
}

function collapseOrphanedSeparators(content: string): string {
  // Two or more `---` lines in a row now bracket only whitespace.
  const withoutRules = content.replace(/(?:^[ \t]*---[ \t]*$\s*){2,}/gm, '');
  // Normalize 3+ consecutive newlines created by removals down to one blank line.
  return withoutRules.replace(/\n{3,}/g, '\n\n');
}
