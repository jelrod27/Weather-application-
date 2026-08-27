/**
 * 16-Bit Weather Platform - Coronagraph Animation Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Animated SOHO LASCO coronagraph viewer with frame-by-frame playback control
 * Primary mode: NASA animated GIFs (48-hour loops, always available)
 * Secondary mode: Frame-by-frame control (when archive frames available)
 * Falls back to animated GIFs if individual frames unavailable
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Maximize2,
  RefreshCw,
  Image as ImageIcon,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronFirst,
  ChevronLast,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CoronagraphAnimationProps {
  className?: string;
}

type Camera = 'c2' | 'c3';
type ViewMode = 'frames' | 'animated' | 'latest';

interface CoronagraphFrame {
  timestamp: string;
  url: string;
  camera: 'c2' | 'c3';
  available: boolean;
}

interface ApiResponse {
  success: boolean;
  data: {
    frames: CoronagraphFrame[];
    fallbackGif: string;
    latestImage: string;
    animatedGif: string;
    camera: 'c2' | 'c3';
    frameCount: number;
    useAnimatedGif: boolean;
  };
  note?: string;
}

// SOHO provides pre-made animated GIFs showing the last 48 hours
const ANIMATED_URLS = {
  c2: {
    full: 'https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.gif',
    small: 'https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif',
  },
  c3: {
    full: 'https://soho.nascom.nasa.gov/data/realtime/c3/512/latest.gif',
    small: 'https://soho.nascom.nasa.gov/data/LATEST/current_c3small.gif',
  },
};

// Static latest image URLs
const LATEST_URLS = {
  c2: 'https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.jpg',
  c3: 'https://soho.nascom.nasa.gov/data/realtime/c3/512/latest.jpg',
};

// Animation playback speed in milliseconds
const FRAME_INTERVAL = 500;

// Maximum number of failed frames before falling back to animated GIF
const MAX_FAILED_FRAMES = 3;

export default function CoronagraphAnimation({ className }: CoronagraphAnimationProps) {
  const themeClasses = themeTokens.weather;

  const [camera, setCamera] = useState<Camera>('c2');
  const [viewMode, setViewMode] = useState<ViewMode>('animated');
  const [isLoading, setIsLoading] = useState(true);
  const [showFullsize, setShowFullsize] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Frame-by-frame playback state
  const [frames, setFrames] = useState<CoronagraphFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [loadedFrameUrls, setLoadedFrameUrls] = useState<Set<string>>(new Set());
  const [failedFrames, setFailedFrames] = useState<Set<string>>(new Set());
  const [fallbackGif, setFallbackGif] = useState<string>('');
  const [latestImage, setLatestImage] = useState<string>('');
  const [frameLoadError, setFrameLoadError] = useState<string | null>(null);

  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const preloadRef = useRef<HTMLImageElement[]>([]);

  // Fetch frames from API
  const fetchFrames = useCallback(async (selectedCamera: Camera) => {
    setIsLoadingFrames(true);
    setFrameLoadError(null);
    try {
      const response = await fetch(`/api/space-weather/coronagraph?camera=${selectedCamera}&frames=12`);
      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        // Set all URLs from API response
        setFrames(data.data.frames || []);
        setFallbackGif(data.data.fallbackGif || ANIMATED_URLS[selectedCamera].small);
        setLatestImage(data.data.latestImage || LATEST_URLS[selectedCamera]);
        setCurrentFrameIndex(0);
        setLoadedFrameUrls(new Set());
        setFailedFrames(new Set());

        // If API recommends using animated GIF, show info message
        if (data.data.useAnimatedGif && viewMode === 'frames') {
          setFrameLoadError('Individual frames may not be available. Using animated GIF as fallback.');
        }
      } else {
        // Fall back to animated GIF
        setFrames([]);
        setFallbackGif(ANIMATED_URLS[selectedCamera].small);
        setLatestImage(LATEST_URLS[selectedCamera]);
      }
    } catch (error) {
      console.error('Failed to fetch coronagraph frames:', error);
      setFrames([]);
      setFallbackGif(ANIMATED_URLS[selectedCamera].small);
      setLatestImage(LATEST_URLS[selectedCamera]);
      setFrameLoadError('Failed to load frame data. Using animated GIF.');
    } finally {
      setIsLoadingFrames(false);
    }
  }, [viewMode]);

  // Preload frames for smooth playback
  const preloadFrames = useCallback((frameList: CoronagraphFrame[], startIndex: number) => {
    // Clear previous preload images
    preloadRef.current = [];

    // Preload next 3 frames
    const framesToPreload = frameList.slice(startIndex, startIndex + 3);

    framesToPreload.forEach((frame) => {
      if (!loadedFrameUrls.has(frame.url) && !failedFrames.has(frame.url)) {
        const img = new Image();
        img.onload = () => {
          setLoadedFrameUrls((prev) => new Set(prev).add(frame.url));
        };
        img.onerror = () => {
          setFailedFrames((prev) => new Set(prev).add(frame.url));
        };
        img.src = frame.url;
        preloadRef.current.push(img);
      }
    });
  }, [loadedFrameUrls, failedFrames]);

  // Fetch frames on mount and camera change
  useEffect(() => {
    if (viewMode === 'frames') {
      fetchFrames(camera);
    }
  }, [camera, viewMode, fetchFrames, refreshKey]);

  // Preload frames when index changes
  useEffect(() => {
    if (frames.length > 0) {
      preloadFrames(frames, currentFrameIndex);
    }
  }, [frames, currentFrameIndex, preloadFrames]);

  // Animation loop
  useEffect(() => {
    if (isPlaying && frames.length > 0 && viewMode === 'frames') {
      animationRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          const next = (prev + 1) % frames.length;
          return next;
        });
      }, FRAME_INTERVAL);
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, frames.length, viewMode]);

  // Check if we should fall back to animated GIF due to too many frame failures
  const shouldUseFallback = useCallback(() => {
    return failedFrames.size >= MAX_FAILED_FRAMES;
  }, [failedFrames]);

  // Get current image URL based on view mode and frame state
  const getCurrentImageUrl = useCallback(() => {
    const gifUrl = fallbackGif || ANIMATED_URLS[camera].small;
    const latestUrl = latestImage || LATEST_URLS[camera];

    if (viewMode === 'animated') {
      return `${gifUrl}?t=${refreshKey}`;
    }
    if (viewMode === 'latest') {
      return `${latestUrl}?t=${refreshKey}`;
    }

    // Frame mode
    // If too many frames failed, use animated GIF fallback
    if (shouldUseFallback()) {
      return `${gifUrl}?t=${refreshKey}`;
    }

    if (frames.length > 0 && currentFrameIndex < frames.length) {
      const frame = frames[currentFrameIndex];
      // If this specific frame failed to load, skip to fallback
      if (failedFrames.has(frame.url)) {
        return `${gifUrl}?t=${refreshKey}`;
      }
      return frame.url;
    }

    // Fallback to animated GIF
    return `${gifUrl}?t=${refreshKey}`;
  }, [camera, viewMode, refreshKey, frames, currentFrameIndex, failedFrames, fallbackGif, latestImage, shouldUseFallback]);

  // Get full-size URL for modal
  const getFullsizeUrl = useCallback(() => {
    if (viewMode === 'animated' || viewMode === 'frames') {
      return `${ANIMATED_URLS[camera].full}?t=${refreshKey}`;
    }
    return `${LATEST_URLS[camera]}?t=${refreshKey}`;
  }, [camera, viewMode, refreshKey]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    // Mark current frame as failed
    if (viewMode === 'frames' && frames.length > 0 && currentFrameIndex < frames.length) {
      const frame = frames[currentFrameIndex];
      setFailedFrames((prev) => {
        const newFailed = new Set(prev).add(frame.url);
        // If too many frames have failed, switch to animated mode and show error
        if (newFailed.size >= MAX_FAILED_FRAMES) {
          setFrameLoadError('Archive frames unavailable. Switched to animated GIF.');
        }
        return newFailed;
      });
    }
  };

  const changeCamera = (newCamera: Camera) => {
    setCamera(newCamera);
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentFrameIndex(0);
    setFrameLoadError(null);
    setFailedFrames(new Set());
  };

  const cycleViewMode = () => {
    const modes: ViewMode[] = ['animated', 'frames', 'latest'];
    const currentIndex = modes.indexOf(viewMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setViewMode(nextMode);
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentFrameIndex(0);
    setFrameLoadError(null);
    setFailedFrames(new Set());
  };

  const refreshImage = () => {
    setRefreshKey(Date.now());
    setIsLoading(true);
    setCurrentFrameIndex(0);
    setLoadedFrameUrls(new Set());
    setFailedFrames(new Set());
    setFrameLoadError(null);
  };

  // Playback controls
  const togglePlayPause = () => {
    if (viewMode === 'frames' && frames.length > 0) {
      setIsPlaying(!isPlaying);
    }
  };

  const goToFirstFrame = () => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  };

  const goToLastFrame = () => {
    setIsPlaying(false);
    setCurrentFrameIndex(Math.max(0, frames.length - 1));
  };

  const stepBack = () => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1));
  };

  const stepForward = () => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0));
  };

  // Get display text for view mode
  const getViewModeText = () => {
    switch (viewMode) {
      case 'animated':
        return 'ANIMATED (48hr)';
      case 'frames':
        return 'FRAME CONTROL';
      case 'latest':
        return 'LATEST IMAGE';
    }
  };

  // Get status indicator text
  const getStatusText = () => {
    if (viewMode === 'animated') {
      return { text: '48hr Loop', color: 'text-green-500' };
    }
    if (viewMode === 'frames') {
      if (isLoadingFrames || frames.length === 0) {
        return { text: 'Loading...', color: 'text-yellow-500' };
      }
      // Show fallback indicator if using animated GIF due to failures
      if (shouldUseFallback()) {
        return { text: 'Fallback GIF', color: 'text-orange-500' };
      }
      return {
        text: `Frame ${currentFrameIndex + 1}/${frames.length}`,
        color: isPlaying ? 'text-green-500' : 'text-cyan-500',
      };
    }
    return { text: 'Latest', color: 'text-terminal-accent-info' };
  };

  const status = getStatusText();

  return (
    <>
      <Card className={cn('container-primary', themeClasses.background, className)} data-testid="coronagraph">
        <CardHeader className={'border-b border-subtle py-3'}>
          <div className="flex items-center justify-between">
            <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
              CORONAGRAPH
              <span className={cn('text-xs px-2 py-0.5 border', themeClasses.borderColor, themeClasses.accentBg)}>
                LASCO
              </span>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshImage}
                className="font-mono text-xs"
                title="Refresh"
              >
                <RefreshCw className={cn('w-4 h-4', (isLoading || isLoadingFrames) && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullsize(true)}
                className="font-mono text-xs"
                title="Full Screen"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Coronagraph Image */}
          <div className="relative aspect-square bg-black rounded-lg overflow-hidden border-2 border-gray-700">
            {(isLoading || isLoadingFrames) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                <div className={cn('text-sm font-mono text-center', themeClasses.text)}>
                  <div className="animate-pulse mb-2">ACQUIRING CORONAGRAPH DATA...</div>
                  <div className="text-xs opacity-60">
                    {viewMode === 'animated'
                      ? 'Loading 48-hour animation (~15MB)'
                      : viewMode === 'frames'
                        ? 'Loading individual frames'
                        : 'Loading latest image'}
                  </div>
                </div>
              </div>
            )}

            {/* Image display */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${camera}-${viewMode}-${currentFrameIndex}-${refreshKey}`}
              src={getCurrentImageUrl()}
              alt={`LASCO ${camera.toUpperCase()} Coronagraph${viewMode === 'animated' ? ' Animation' : ''}`}
              className={cn(
                'w-full h-full object-contain transition-opacity duration-300',
                (isLoading || isLoadingFrames) && 'opacity-0'
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              data-testid="coronagraph-frame"
            />

            {/* Camera label */}
            <div className="absolute top-2 left-2 text-xs font-mono px-2 py-1 bg-black/70 rounded text-white">
              LASCO {camera.toUpperCase()}
            </div>

            {/* Status indicator */}
            <div className={cn('absolute top-2 right-2 text-xs font-mono px-2 py-1 bg-black/70 rounded', status.color)}>
              {status.text}
            </div>

            {/* Play indicator */}
            {((viewMode === 'animated' && !isLoading) || (viewMode === 'frames' && isPlaying)) && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs font-mono px-2 py-1 bg-black/70 rounded text-green-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                PLAYING
              </div>
            )}

            {/* Frame timestamp for frame mode */}
            {viewMode === 'frames' && frames.length > 0 && currentFrameIndex < frames.length && (
              <div className="absolute bottom-2 left-2 text-xs font-mono px-2 py-1 bg-black/70 rounded text-white">
                {new Date(frames[currentFrameIndex].timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Playback Controls (Frame Mode Only - hidden when using fallback GIF) */}
          {viewMode === 'frames' && frames.length > 0 && !shouldUseFallback() && (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={goToFirstFrame}
                className="font-mono text-xs p-2"
                title="First Frame"
              >
                <ChevronFirst className="w-4 h-4" />
              </Button>
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
                data-testid="coronagraph-play"
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
                onClick={goToLastFrame}
                className="font-mono text-xs p-2"
                title="Last Frame"
              >
                <ChevronLast className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Frame Progress Bar (Frame Mode Only) */}
          {viewMode === 'frames' && frames.length > 0 && !shouldUseFallback() && (
            <div className="w-full bg-gray-700 rounded h-1">
              <div
                className="bg-cyan-500 h-1 rounded transition-all duration-200"
                style={{ width: `${((currentFrameIndex + 1) / frames.length) * 100}%` }}
              />
            </div>
          )}

          {/* Frame Load Error/Info Message */}
          {frameLoadError && viewMode === 'frames' && (
            <div className="flex items-center gap-2 text-xs font-mono px-3 py-2 bg-orange-500/20 rounded text-orange-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{frameLoadError}</span>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cycleViewMode}
              className={cn(
                'font-mono text-xs',
                viewMode === 'animated' && 'bg-cyan-500/20 ring-2 ring-cyan-500',
                viewMode === 'frames' && 'bg-purple-500/20 ring-2 ring-purple-500',
                viewMode === 'latest' && 'bg-terminal-accent-info/20 ring-2 ring-terminal-accent-info'
              )}
            >
              <ImageIcon className="w-4 h-4 mr-1" />
              {getViewModeText()}
            </Button>
          </div>

          {/* Camera Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => changeCamera('c2')}
              className={cn(
                'p-2 card-inner font-mono text-xs transition-all duration-200 rounded',
                camera === 'c2'
                  ? 'ring-2 ring-cyan-500/50 bg-cyan-500/20 text-cyan-500'
                  : cn('hover:bg-gray-800', themeClasses.text)
              )}
            >
              <div className="font-bold">C2</div>
              <div className={cn('text-xs', themeClasses.text, 'opacity-70')}>1.5-6 R☉</div>
            </button>
            <button
              onClick={() => changeCamera('c3')}
              className={cn(
                'p-2 card-inner font-mono text-xs transition-all duration-200 rounded',
                camera === 'c3'
                  ? 'ring-2 ring-cyan-500/50 bg-cyan-500/20 text-cyan-500'
                  : cn('hover:bg-gray-800', themeClasses.text)
              )}
            >
              <div className="font-bold">C3</div>
              <div className={cn('text-xs', themeClasses.text, 'opacity-70')}>3.5-30 R☉</div>
            </button>
          </div>

          {/* Info */}
          <div className={cn('text-xs font-mono text-center pt-2 border-t border-gray-700', themeClasses.text, 'opacity-70')}>
            SOHO LASCO coronagraph - CME detection. R☉ = Solar Radii.
            {viewMode === 'frames' ? ' Use controls to step through frames.' : ' Animation shows last 48 hours.'}
          </div>
        </CardContent>
      </Card>

      {/* Fullsize Modal */}
      {showFullsize && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowFullsize(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowFullsize(false)}
              className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded text-white hover:bg-black/70"
            >
              Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFullsizeUrl()}
              alt={`LASCO ${camera.toUpperCase()} Coronagraph (full resolution)`}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <div className="text-center mt-2 font-mono text-sm text-white">
              SOHO LASCO {camera.toUpperCase()} - {viewMode === 'latest' ? 'Latest Image' : '48-Hour Animation'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
