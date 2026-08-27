/**
 * 16-Bit Weather Platform - WSA-ENLIL Solar Wind Model Viewer
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Animated WSA-ENLIL solar wind propagation model viewer with frame-by-frame playback
 * Shows solar wind density + velocity with Earth position marked
 * Falls back to latest static image if frames unavailable
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EnlilModelViewerProps {
  className?: string;
}

interface EnlilFrame {
  timestamp: string;
  url: string;
}

interface EnlilApiResponse {
  data: {
    frames: string[];
    latest: string;
    fallback: string;
    frameCount: number;
  };
  source: string;
}

type PlaybackSpeed = 0.5 | 1 | 2 | 4;

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 1, 2, 4];
const BASE_INTERVAL_MS = 500;

export default function EnlilModelViewer({ className }: EnlilModelViewerProps) {
  const themeClasses = themeTokens.weather;

  const [frames, setFrames] = useState<EnlilFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [latestImage, setLatestImage] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);

  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const preloadRef = useRef<HTMLImageElement[]>([]);

  // Fetch frames from API
  const fetchFrames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/space-weather/enlil');
      const data: EnlilApiResponse = await response.json();

      if (data.data) {
        const frameObjects = (data.data.frames || []).map((url: string, i: number) => ({
          timestamp: `Frame ${i + 1}`,
          url,
        }));
        setFrames(frameObjects);
        setLatestImage(data.data.latest || data.data.fallback || '');
        setCurrentFrameIndex(0);
      } else {
        setFrames([]);
        setError('ENLIL model data unavailable');
      }
    } catch (err) {
      console.error('[EnlilModelViewer] Failed to fetch ENLIL frames:', err);
      setFrames([]);
      setError('Failed to load ENLIL model data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchFrames();
  }, [fetchFrames]);

  // Preload nearby frames for smooth playback
  useEffect(() => {
    if (frames.length === 0) return;
    preloadRef.current = [];

    const framesToPreload = frames.slice(
      currentFrameIndex,
      Math.min(currentFrameIndex + 4, frames.length)
    );

    framesToPreload.forEach((frame) => {
      const img = new Image();
      img.src = frame.url;
      preloadRef.current.push(img);
    });
  }, [frames, currentFrameIndex]);

  // Animation loop
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      const interval = BASE_INTERVAL_MS / speed;
      animationRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          const next = (prev + 1) % frames.length;
          return next;
        });
      }, interval);
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, frames.length, speed]);

  // Get current display URL
  const getCurrentImageUrl = useCallback(() => {
    if (frames.length > 0 && currentFrameIndex < frames.length) {
      return frames[currentFrameIndex].url;
    }
    // Fallback to latest static image
    return latestImage || '';
  }, [frames, currentFrameIndex, latestImage]);

  // Playback controls
  const togglePlayPause = () => {
    if (frames.length > 0) {
      setIsPlaying(!isPlaying);
    }
  };

  const stepBack = () => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1));
  };

  const stepForward = () => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0));
  };

  const cycleSpeed = () => {
    setSpeed((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCurrentFrameIndex(value);
    setIsPlaying(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageLoaded(true);
  };

  const hasFrames = frames.length > 0;

  return (
    <Card className={cn('container-primary', themeClasses.background, className)} data-testid="enlil-viewer">
      <CardHeader className="border-b border-subtle py-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
            WSA-ENLIL SOLAR WIND MODEL
            <span className={cn('text-xs px-2 py-0.5 border', themeClasses.borderColor, themeClasses.accentBg)}>
              SWPC
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFrames}
            className="font-mono text-xs"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
        <div className={cn('text-xs font-mono mt-1', themeClasses.text, 'opacity-70')}>
          Earth &middot; Sun &middot; CME propagation
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Model Image Display */}
        <div className="relative aspect-square bg-black rounded-lg overflow-hidden border-2 border-gray-700">
          {/* Loading skeleton */}
          {(isLoading || !imageLoaded) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className={cn('text-sm font-mono text-center', themeClasses.text)}>
                <div className="animate-pulse mb-2">ACQUIRING ENLIL MODEL DATA...</div>
                <div className="text-xs opacity-60">Loading solar wind propagation model</div>
              </div>
            </div>
          )}

          {/* Image */}
          {getCurrentImageUrl() && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`enlil-${currentFrameIndex}`}
              src={getCurrentImageUrl()}
              alt="WSA-ENLIL Solar Wind Propagation Model"
              className={cn(
                'w-full h-full object-contain transition-opacity duration-300',
                (isLoading || !imageLoaded) && 'opacity-0'
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              data-testid="enlil-frame"
            />
          )}

          {/* Status overlay */}
          <div className={cn(
            'absolute top-2 right-2 text-xs font-mono px-2 py-1 bg-black/70 rounded',
            isPlaying ? 'text-green-500' : 'text-cyan-500'
          )}>
            {hasFrames
              ? `${currentFrameIndex + 1} / ${frames.length}`
              : latestImage ? 'LATEST' : '--'}
          </div>

          {/* Playing indicator */}
          {isPlaying && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs font-mono px-2 py-1 bg-black/70 rounded text-green-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {speed}x
            </div>
          )}

          {/* Frame timestamp */}
          {hasFrames && currentFrameIndex < frames.length && frames[currentFrameIndex].timestamp && (
            <div className="absolute bottom-2 left-2 text-xs font-mono px-2 py-1 bg-black/70 rounded text-white">
              {new Date(frames[currentFrameIndex].timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-xs font-mono px-3 py-2 bg-orange-500/20 rounded text-orange-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Playback Controls */}
        {hasFrames && (
          <>
            {/* Slider / Progress Bar */}
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={currentFrameIndex}
              onChange={handleSliderChange}
              className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-cyan-500"
              data-testid="enlil-slider"
            />

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={stepBack}
                className="font-mono text-xs p-2"
                title="Previous Frame"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayPause}
                className={cn('font-mono text-xs px-4', isPlaying && 'bg-green-500/20 ring-2 ring-green-500')}
                data-testid="enlil-play"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stepForward}
                className="font-mono text-xs p-2"
                title="Next Frame"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cycleSpeed}
                className="font-mono text-xs px-3"
                title="Playback Speed"
              >
                {speed}x
              </Button>
            </div>

            {/* Frame counter text */}
            <div className={cn('text-xs font-mono text-center', themeClasses.text, 'opacity-70')}>
              Frame {currentFrameIndex + 1} of {frames.length}
            </div>
          </>
        )}

        {/* Info */}
        <div className={cn('text-xs font-mono text-center pt-2 border-t border-gray-700', themeClasses.text, 'opacity-70')}>
          WSA-ENLIL solar wind model from NOAA SWPC. Shows heliospheric density and velocity with Earth position.
        </div>
      </CardContent>
    </Card>
  );
}
