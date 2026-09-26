'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { TropicalGraphicSource } from '@/lib/tropical/graphics';

interface TropicalGraphicProps {
  graphic: TropicalGraphicSource;
  sourceTime: ReactNode;
}

export default function TropicalGraphic({ graphic, sourceTime }: TropicalGraphicProps): React.JSX.Element {
  const router = useRouter();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const src = attempt ? `${graphic.src}?retry=${attempt}` : graphic.src;
  useEffect(() => {
    if (status !== 'loading') return;
    if (imageRef.current?.complete) {
      setStatus(imageRef.current.naturalWidth ? 'ready' : 'error');
      return;
    }
    const timeout = setTimeout(() => setStatus('error'), 15000);
    return () => clearTimeout(timeout);
  }, [status, attempt]);

  return (
    <section className="border border-border rounded-lg overflow-hidden bg-card/30">
      <div className="p-4 border-b border-border">
        <h2 className="font-mono font-bold text-sm">{graphic.title}</h2>
        <p className="font-mono text-xs text-muted-foreground mt-1">{graphic.desc}</p>
        <p className="font-mono text-xs text-muted-foreground mt-2">
          {sourceTime}
          {' '}Observation or forecast valid time is printed on the image.
        </p>
      </div>
      <div className="relative aspect-[4/3] bg-black">
        {status !== 'error' && (
          <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Open full-size ${graphic.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imageRef} key={attempt} src={src} alt={graphic.title} className="w-full h-full object-contain" onLoad={() => setStatus('ready')} onError={() => setStatus('error')} />
          </a>
        )}
        {status === 'loading' && <p role="status" className="absolute top-3 left-3 font-mono text-xs text-white">Loading NOAA image…</p>}
        {status === 'error' && (
          <div role="status" className="h-full flex flex-col items-center justify-center gap-4 p-4 text-white font-mono text-sm text-center">
            <p>Image unavailable. Open the official source for the latest information.</p>
            <button type="button" className="border px-3 py-2" onClick={() => { setStatus('loading'); setAttempt(Date.now()); router.refresh(); }}>Retry image</button>
          </div>
        )}
      </div>
      <a href={graphic.link} target="_blank" rel="noopener noreferrer" className="block p-3 text-xs font-mono text-primary underline border-t border-border">View official NOAA source</a>
    </section>
  );
}
