/**
 * 16-Bit Weather Platform - GFS Model Viewer Page
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Displays full-size GFS model graphics with download and info options.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Download, ExternalLink, Info, RefreshCw } from 'lucide-react';
import { themeTokens } from '@/lib/theme-tokens';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{
    region: string;
    run: string;
  }>;
}

// Region display names
const REGION_NAMES: Record<string, string> = {
  us: 'Americas / CONUS',
  wus: 'West Coast',
  eus: 'East Coast',
  tropatl: 'Tropical Atlantic',
  epac: 'Eastern Pacific',
  conus: 'Continental US',
};

// Region descriptions
const REGION_DESCRIPTIONS: Record<string, string> = {
  us: 'North America weather model showing mean sea level pressure and precipitation',
  wus: 'Western United States regional forecast showing mean sea level pressure and precipitation',
  eus: 'Eastern United States regional forecast showing mean sea level pressure and precipitation',
  tropatl: 'Tropical Atlantic region showing mean sea level pressure and precipitation for hurricane development',
  epac: 'Eastern Pacific tropical weather potential showing mean sea level pressure and precipitation',
  conus: 'Continental United States showing mean sea level pressure and precipitation',
};

export default function GFSModelPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const { region, run } = resolvedParams;
  const themeClasses = themeTokens.card;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Construct proxy image URL
  const imageUrl = `/api/gfs-image?run=${run}&region=${region}`;

  // Format run time
  const formatRunTime = (runStr: string): string => {
    const hour = runStr.replace('z', '');
    return `${hour}:00 UTC`;
  };

  // Get region info
  const regionName = REGION_NAMES[region] || region.toUpperCase();
  const regionDescription = REGION_DESCRIPTIONS[region] || 'GFS model forecast';
  const runTime = formatRunTime(run);

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `gfs_${region}_${run}.gif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn('min-h-screen', themeClasses.background)}>
      {/* Header */}
      <header className={cn('border-b-2', themeClasses.borderColor)}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Back button */}
            <Link
              href="/news"
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 border-2 font-mono text-sm font-bold uppercase',
                'transition-all duration-200',
                themeClasses.borderColor,
                themeClasses.text,
                'hover:scale-105',
                themeClasses.accentText
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to News</span>
            </Link>

            {/* Title */}
            <h1
              className={cn(
                'font-mono font-bold text-xl md:text-2xl',
                themeClasses.headerText
              )}
            >
              GFS Model Viewer
            </h1>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 border-2 font-mono text-sm font-bold uppercase',
                'transition-all duration-200',
                themeClasses.borderColor,
                themeClasses.text,
                'hover:scale-105',
                themeClasses.accentText
              )}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Model info card */}
        <div className={cn('border-2 p-6 mb-6', themeClasses.borderColor, themeClasses.background)}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className={cn('font-mono font-bold text-2xl mb-2', themeClasses.headerText)}>
                {regionName}
              </h2>
              <p className={cn('font-mono text-sm mb-4', themeClasses.text)}>
                {regionDescription}
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className={cn('font-mono text-sm', themeClasses.text)}>
                  <span className="opacity-70">Model Run:</span>{' '}
                  <span className={cn('font-bold', themeClasses.accentText)}>{runTime}</span>
                </div>
                <div className={cn('font-mono text-sm', themeClasses.text)}>
                  <span className="opacity-70">Source:</span>{' '}
                  <span className="font-bold">NOAA GFS</span>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div
              className={cn(
                'flex items-start gap-2 p-4 border-2 max-w-md',
                themeClasses.borderColor,
                'bg-opacity-50'
              )}
            >
              <Info className={cn('w-5 h-5 mt-0.5 flex-shrink-0', themeClasses.accentText)} />
              <div className={cn('font-mono text-xs', themeClasses.text)}>
                <p className="mb-2">
                  GFS models update 4 times daily at 00Z, 06Z, 12Z, and 18Z UTC.
                </p>
                <p>
                  Images show mean sea level pressure (MSLP) and precipitation forecasts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Image viewer */}
        <div
          className={cn(
            'border-2 overflow-hidden',
            themeClasses.borderColor,
            themeClasses.background
          )}
        >
          <div className="relative w-full" style={{ minHeight: '600px' }}>
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <RefreshCw className={cn('w-12 h-12 animate-spin mb-4', themeClasses.accentText)} />
                <p className={cn('font-mono text-sm', themeClasses.text)}>
                  Loading GFS model...
                </p>
              </div>
            )}

            {imageError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div
                  className={cn(
                    'border-2 p-8 text-center max-w-md',
                    themeClasses.borderColor
                  )}
                >
                  <Info className={cn('w-12 h-12 mx-auto mb-4', themeClasses.accentText)} />
                  <h3 className={cn('font-mono font-bold text-lg mb-2', themeClasses.headerText)}>
                    Model Unavailable
                  </h3>
                  <p className={cn('font-mono text-sm mb-4', themeClasses.text)}>
                    This GFS model run may not be available yet. Models are updated 4 times daily.
                  </p>
                  <Link
                    href="/news"
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 border-2 font-mono text-sm font-bold uppercase',
                      themeClasses.borderColor,
                      themeClasses.text,
                      'hover:scale-105',
                      themeClasses.accentText
                    )}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to News</span>
                  </Link>
                </div>
              </div>
            ) : (
              <Image
                src={imageUrl}
                alt={`GFS Model - ${regionName} (${runTime})`}
                width={1200}
                height={800}
                className={cn(
                  'w-full h-auto transition-opacity duration-300',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                unoptimized
                priority
              />
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
          <p className={cn('font-mono text-xs', themeClasses.text, 'opacity-70')}>
            Data Source: NOAA Global Forecast System (GFS) - Public Domain
          </p>
          <a
            href="https://mag.ncep.noaa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 font-mono text-xs',
              themeClasses.accentText,
              'hover:underline'
            )}
          >
            <span>Visit NOAA MAG</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </main>
    </div>
  );
}
