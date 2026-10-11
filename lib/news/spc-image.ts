import type { NewsImage } from './visuals';

interface SpcOutlookInput {
  sourceId: string;
  url: string;
  title: string;
  body?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Resolve DDHHMMZ relative to the issue date, including month/year rollover. */
function validTime(token: string, issue: Date): number | undefined {
  const day = Number(token.slice(0, 2));
  const hour = Number(token.slice(2, 4));
  const minute = Number(token.slice(4, 6));
  if (day < 1 || day > 31 || hour > 23 || minute > 59) return undefined;
  const candidates = [-1, 0, 1].map((offset) => {
    const date = new Date(Date.UTC(issue.getUTCFullYear(), issue.getUTCMonth() + offset, day, hour, minute));
    return date.getUTCDate() === day ? date.getTime() : NaN;
  }).filter(Number.isFinite);
  return candidates.sort((a, b) => Math.abs(a - issue.getTime()) - Math.abs(b - issue.getTime()))[0];
}

/**
 * The RSS image is a moving "latest" URL. Bind it to the archived issuance
 * instead: a cached Day 2 story must not acquire tomorrow's Day 2 map.
 * Contract checked against SPC RSS and archive pages on 2026-10-11.
 */
export function spcOutlookImage(input: SpcOutlookInput): NewsImage | undefined {
  if (input.sourceId !== 'spc-outlooks') return undefined;
  let url: URL;
  try { url = new URL(input.url); } catch { return undefined; }
  if (url.hostname !== 'www.spc.noaa.gov') return undefined;
  const product = url.pathname.match(/^\/products\/outlook\/day([123])otlk_(\d{4})\.html$/);
  const issuance = input.title.match(/^SPC ([A-Za-z]{3} \d{1,2}, \d{4}) (\d{4}) UTC Day ([123]) /);
  const validity = input.body?.match(/Valid\s+(\d{6})Z\s*-\s*(\d{6})Z/);
  if (!product || !issuance || !validity || product[1] !== issuance[3] || product[2] !== issuance[2]) return undefined;
  const [monthName, dayText, yearText] = issuance[1].replace(',', '').split(' ');
  const month = MONTHS.indexOf(monthName);
  const hour = Number(issuance[2].slice(0, 2));
  const minute = Number(issuance[2].slice(2));
  const issue = new Date(Date.UTC(Number(yearText), month, Number(dayText), hour, minute));
  if (month < 0 || hour > 23 || minute > 59 || issue.getUTCDate() !== Number(dayText) ||
    issue.getUTCMonth() !== month || issue.getUTCFullYear() !== Number(yearText)) return undefined;
  const issuedAt = issue.toISOString();
  const start = validTime(validity[1], issue);
  const end = validTime(validity[2], issue);
  if (start === undefined || end === undefined || end <= start ||
    start < issue.getTime() - 86400000 || end > issue.getTime() + 4 * 86400000) return undefined;
  const day = product[1];
  const date = issuedAt.slice(0, 10).replaceAll('-', '');
  const base = `https://www.spc.noaa.gov/products/outlook/archive/${issue.getUTCFullYear()}/day${day}otlk_${date}_${product[2]}`;
  return {
    url: `${base}_prt.png`, kind: 'product', credit: 'NOAA / Storm Prediction Center',
    sourceUrl: `${base}.html`, alt: `SPC Day ${day} convective outlook for the contiguous United States`,
    caption: `Day ${day} convective outlook · Contiguous United States`, issuedAt,
    validFrom: new Date(start).toISOString(), validUntil: new Date(end).toISOString(),
  };
}
