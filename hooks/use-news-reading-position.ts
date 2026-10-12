'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

interface ReadingPosition {
  anchors: Array<{ key: string; top: number }>;
  focused: HTMLElement | null;
  focusKey: string | null;
  focusHref: string | null;
}

/** Preserve a visible card's viewport position and restore focus if its DOM node is replaced. */
export function useNewsReadingPosition(): () => void {
  const saved = useRef<ReadingPosition | null>(null);
  const capture = useCallback(() => {
    if (saved.current) return;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    saved.current = {
      anchors: Array.from(document.querySelectorAll<HTMLElement>('[data-news-key]')).map(element => ({
        key: element.dataset.newsKey!, top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom,
      })).filter(anchor => anchor.bottom > 0 && anchor.top < window.innerHeight),
      focused,
      focusKey: focused?.closest<HTMLElement>('[data-news-key]')?.dataset.newsKey ?? null,
      focusHref: focused?.closest('a')?.getAttribute('href') ?? null,
    };
  }, []);
  useLayoutEffect(() => {
    const position = saved.current;
    saved.current = null;
    if (!position) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-news-key]'));
    const anchor = position.anchors.find(previous => cards.some(card => card.dataset.newsKey === previous.key));
    if (anchor) {
      const element = cards.find(card => card.dataset.newsKey === anchor.key)!;
      const shift = element.getBoundingClientRect().top - anchor.top;
      if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: 'instant' });
    }
    if (position.focused && !position.focused.isConnected && position.focusKey) {
      const card = cards.find(element => element.dataset.newsKey === position.focusKey);
      const originalLink = position.focusHref && Array.from(card?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])
        .find(link => link.getAttribute('href') === position.focusHref);
      (originalLink || card?.querySelector<HTMLElement>('[role="link"]') || document.getElementById('news-refresh'))?.focus({ preventScroll: true });
    }
  });
  return capture;
}
