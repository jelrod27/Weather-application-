'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

interface ReadingAnchor {
  key: string;
  top: number;
}

interface ReadingPosition {
  anchors: ReadingAnchor[];
  focused: HTMLElement | null;
  focusKey: string | null;
  focusHref: string | null;
  expandedKeys: string[];
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
      expandedKeys: Array.from(document.querySelectorAll<HTMLElement>('[data-news-key]'))
        .filter(card => card.querySelector('details[open]')).map(card => card.dataset.newsKey!),
    };
  }, []);
  useLayoutEffect(() => {
    const position = saved.current;
    saved.current = null;
    if (!position) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-news-key]'));
    // Moving a report to a different section remounts its uncontrolled disclosure.
    // Reopen it before measuring the anchor or focusing a bulletin inside it.
    for (const card of cards) {
      const details = card.querySelector('details');
      if (details && position.expandedKeys.includes(card.dataset.newsKey!)) details.open = true;
    }
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
