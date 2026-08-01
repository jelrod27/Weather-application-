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

/**
 * Reads a link destination starting at `start` (the character after the
 * opening `(`). Returns the raw destination, or null when it is unterminated.
 * Handles `<...>` bracketed destinations and balanced nested parentheses.
 */
export function readLinkDestination(content: string, start: number): string | null {
  if (content[start] === '<') {
    const end = content.indexOf('>', start + 1);
    if (end === -1) return null;
    return content.slice(start + 1, end);
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
      if (depth === 0) return content.slice(start, i);
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
    const destStart = match.index + match[0].length;
    const url = readLinkDestination(content, destStart);
    if (url === null) continue;
    images.push({ alt: match[1], url: url.trim() });
    startRx.lastIndex = destStart + url.length + 1;
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

    const destStart = afterBracket + 1;
    const url = readLinkDestination(content, destStart);
    // Unterminated destination — leave the text alone rather than eating the
    // rest of the draft.
    if (url === null) continue;

    out += content.slice(cursor, match.index);
    cursor = destStart + url.length + 1;
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
