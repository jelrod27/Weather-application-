/**
 * Pins image extraction so non-image feed media never lands in an <img>.
 *
 * Regression guard: media:content can declare medium="video" (YouTube embeds)
 * or point at .mp4 files. Rendered in <img> the browser blocks them
 * (ERR_BLOCKED_BY_ORB) and the news card flashes a broken image. extractImage
 * must only return URLs that are plausibly renderable images.
 */
import { __testing } from '@/lib/services/rss/rssAggregator';

const { extractImage, isLikelyImageUrl } = __testing as {
  extractImage: (node: Record<string, unknown>, body?: string) => string | undefined;
  isLikelyImageUrl: (url: string) => boolean;
};

describe('isLikelyImageUrl', () => {
  it('accepts image extensions and extensionless CDN URLs', () => {
    expect(isLikelyImageUrl('https://cdn.example.com/a.jpg')).toBe(true);
    expect(isLikelyImageUrl('https://www.spc.noaa.gov/products/outlook/day1otlk.png')).toBe(true);
    expect(isLikelyImageUrl('https://assets.example.com/image/12345')).toBe(true);
    expect(isLikelyImageUrl('https://cdn.example.com/a.jpg?w=600')).toBe(true);
  });

  it('rejects video/player URLs and non-image extensions', () => {
    expect(isLikelyImageUrl('https://www.youtube.com/embed/fAgrztFvWyk')).toBe(false);
    expect(isLikelyImageUrl('https://youtu.be/abc123')).toBe(false);
    expect(isLikelyImageUrl('https://assets.example.com/clip.mp4')).toBe(false);
    expect(isLikelyImageUrl('https://assets.example.com/clip.webm')).toBe(false);
    expect(isLikelyImageUrl('https://example.com/article.html')).toBe(false);
  });
});

describe('extractImage', () => {
  it('skips a video media:content and uses a later image one', () => {
    const node = {
      'media:content': [
        { '@_url': 'https://www.youtube.com/embed/fAgrztFvWyk', '@_medium': 'video' },
        { '@_url': 'https://cdn.example.com/thumb.jpg', '@_medium': 'image' },
      ],
    };
    expect(extractImage(node)).toBe('https://cdn.example.com/thumb.jpg');
  });

  it('rejects a media:content whose MIME type is not an image', () => {
    const node = {
      'media:content': [{ '@_url': 'https://assets.example.com/clip.mp4', '@_type': 'video/mp4' }],
    };
    expect(extractImage(node)).toBeUndefined();
  });

  it('rejects a YouTube embed even when no medium/type hint is present', () => {
    const node = {
      'media:content': [{ '@_url': 'https://www.youtube.com/embed/W0tAz8ZSFF8' }],
    };
    expect(extractImage(node)).toBeUndefined();
  });

  it('accepts a media:thumbnail image and rejects a video thumbnail url', () => {
    expect(
      extractImage({ 'media:thumbnail': { '@_url': 'https://cdn.example.com/t.jpg' } })
    ).toBe('https://cdn.example.com/t.jpg');
    expect(
      extractImage({ 'media:thumbnail': { '@_url': 'https://cdn.example.com/t.mp4' } })
    ).toBeUndefined();
  });

  it('honors the enclosure image type but rejects a bare .mp4 enclosure', () => {
    expect(
      extractImage({ enclosure: { '@_url': 'https://cdn.example.com/p.jpg', '@_type': 'image/jpeg' } })
    ).toBe('https://cdn.example.com/p.jpg');
    expect(
      extractImage({ enclosure: { '@_url': 'https://cdn.example.com/v.mp4' } })
    ).toBeUndefined();
  });

  it('falls back to an inline <img> in the body only when it is an image', () => {
    expect(extractImage({}, '<p>x</p><img src="https://cdn.example.com/body.jpg" />')).toBe(
      'https://cdn.example.com/body.jpg'
    );
    expect(extractImage({}, '<iframe src="https://www.youtube.com/embed/x"></iframe>')).toBeUndefined();
  });

  it('returns undefined for an imageless item', () => {
    expect(extractImage({}, 'Magnitude 4.5 earthquake near Anchorage')).toBeUndefined();
  });
});
