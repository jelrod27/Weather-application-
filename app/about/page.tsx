'use client';

/**
 * 16-Bit Weather Platform - About Page
 *
 * Platform overview, creator story, tech stack, and available modules.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code, MessageCircle, Terminal, Cpu, Zap, CloudLightning, Map, Route, Sun,
  Gamepad2, Newspaper, Sparkles, AlertTriangle, ChevronDown,
  Globe, Database, Shield, Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import PageWrapper from '@/components/page-wrapper';

function Accordion({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 bg-card/50 hover:bg-card/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold font-mono tracking-wider uppercase">{title}</h2>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="p-6 border-t border-border animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

const modules = [
  { href: "/radar", label: "Radar", desc: "North America radar with NWS alerts, SPC outlooks, and provider fallback", icon: Map },
  { href: "/warnings", label: "Warnings Command Center", desc: "Live NWS alerts with WIS score, SPC outlook, alert polygons, and storm reports", icon: AlertTriangle },
  { href: "/severe", label: "Severe Weather", desc: "Active tornado, thunderstorm, and flood warnings", icon: CloudLightning },
  { href: "/travel", label: "Travel Hub", desc: "Will your trip suck? Airport delay risk, road conditions, and a personal trip score for fly or drive", icon: Route },
  { href: "/space-weather", label: "Space Weather", desc: "Solar flares, Kp index, aurora forecast, and coronagraph", icon: Sun },
  { href: "/news", label: "News Feed", desc: "Aggregated weather news from NOAA, NASA, and USGS", icon: Newspaper },
];

export default function AboutPage() {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-mono uppercase">
            Mission Status:{' '}
            <span className="text-primary">About 16-Bit Weather</span>
          </h1>
          <p className="text-sm font-mono text-muted-foreground tracking-wider">
            // RETRO SOUL // MODERN INTELLIGENCE // WEATHER EDUCATION
          </p>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">

          {/* The Source Code - Justin's Story */}
          <Accordion title="The Source Code" icon={Terminal} defaultOpen={true}>
            <div className="space-y-4 font-mono text-sm leading-relaxed text-muted-foreground">
              <p>
                I&apos;ve had an interest in weather since I can remember. Growing up watching storms
                roll in, checking radar obsessively, and trying to understand why the atmosphere does
                what it does — that curiosity never went away.
              </p>
              <p>
                But this project isn&apos;t just about meteorology. It&apos;s about the{' '}
                <span className="text-foreground font-bold">craft</span>. I find it incredibly fun
                to build ambitious web apps as a way to learn software development, explore CI/CD
                pipelines, and push the boundaries of what a weather platform can be.
              </p>
              <p>
                16-Bit Weather is where{' '}
                <span className="text-primary">nostalgia</span> meets{' '}
                <span className="text-primary">modern intelligence</span>.
                It&apos;s powered by AI agents, real-time government data feeds, and cutting-edge web tech
                — but feels like it belongs in an arcade cabinet from 1985.
              </p>
              <p>
                Every feature you see here was built with curiosity, late nights, and a belief that
                weather data doesn&apos;t have to be boring. Use the terminal. Check the radar. Play the game.
              </p>
            </div>
          </Accordion>

          {/* System Architecture */}
          <Accordion title="System Architecture" icon={Globe}>
            <div className="space-y-6">
              <p className="font-mono text-sm text-muted-foreground">
                16-Bit Weather is a retro-styled weather education platform that combines real-time
                weather data with pixel-influenced visuals, educational content, and tool-backed AI.
                It monitors weather across the United States through multiple government data sources,
                updated in real-time.
              </p>

              <div className="border border-primary/30 rounded-lg p-5 bg-primary/5">
                <h3 className="font-mono font-bold text-sm mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  REAL-TIME INTELLIGENCE
                </h3>
                <p className="font-mono text-sm text-muted-foreground">
                  The platform features a{' '}
                  <Link href="/warnings" className="text-primary underline underline-offset-4 hover:text-primary/80">
                    Weather Intensity Score (WIS)
                  </Link>
                  {' '}— a scoring algorithm that monitors weather severity across the United States in
                  real-time. Updated every 5 minutes from NWS active alerts, the WIS provides immediate
                  insight into current weather conditions nationwide.
                </p>
              </div>

              <div className="border border-border rounded-lg p-5 bg-card/30">
                <h3 className="font-mono font-bold text-sm mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  ADVISORY
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  While these tools provide valuable weather insights, always follow official warnings
                  from the National Weather Service and local authorities for safety decisions.
                </p>
              </div>
            </div>
          </Accordion>

          {/* Under the Hood */}
          <Accordion title="Under the Hood" icon={Cpu}>
            <div className="space-y-4">
              <p className="font-mono text-sm text-muted-foreground">
                Don&apos;t let the pixels fool you. This machine is running on high-octane modern infrastructure.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: Zap, label: "THE ENGINE", value: "Next.js 16 (App Router) + React 19" },
                  { icon: Database, label: "DATA LAYER", value: "Supabase PostgreSQL + Row-Level Security" },
                  { icon: CloudLightning, label: "WEATHER DATA", value: "OpenWeatherMap + NOAA + NWS + USGS + NASA" },
                  { icon: Sparkles, label: "AI ENGINE", value: "Vercel AI SDK + Claude (Anthropic)" },
                  { icon: Globe, label: "RADAR", value: "NOAA/Iowa NEXRAD + MSC GeoMet + RainViewer fallback" },
                  { icon: Gauge, label: "MONITORING", value: "Sentry + Lighthouse CI (score >= 85)" },
                  { icon: Gamepad2, label: "AESTHETIC", value: "Tailwind CSS v4 + 5 retro themes" },
                  { icon: Shield, label: "DEPLOYMENT", value: "Vercel Edge + GitHub Actions CI/CD" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 border border-border rounded bg-card/30">
                    <item.icon className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-xs">{item.label}</div>
                      <div className="font-mono text-xs text-muted-foreground">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Accordion>
        </div>

        {/* Available Modules Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-mono tracking-wider uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Available Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((mod) => (
              <Link
                key={mod.href}
                href={mod.href}
                className="border border-border rounded-lg p-4 bg-card/30 hover:bg-card/60 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <mod.icon className="w-4 h-4 text-primary" />
                  <h3 className="font-mono font-bold text-sm text-primary group-hover:underline underline-offset-4">
                    {mod.label.toUpperCase()}
                  </h3>
                </div>
                <p className="font-mono text-xs text-muted-foreground">{mod.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Connect / Player 1 */}
        <div className="border border-border rounded-lg p-8 text-center bg-card/30">
          <div className="w-20 h-20 mx-auto bg-primary/20 border-2 border-primary rounded-full mb-4 flex items-center justify-center">
            <Terminal className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold font-mono mb-1">PLAYER 1</h3>
          <p className="text-sm font-mono text-muted-foreground tracking-widest uppercase mb-6">Justin Elrod</p>

          <div className="flex justify-center gap-6">
            <a href="https://github.com/deephouse23" target="_blank" rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 border border-border rounded-lg flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-colors">
                <Code className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-muted-foreground group-hover:text-primary">GITHUB</span>
            </a>
            <a href="https://x.com/Justin_Elrod" target="_blank" rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 border border-border rounded-lg flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-muted-foreground group-hover:text-primary">X</span>
            </a>
            <Link href="/dashboard" className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 border border-border rounded-lg flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-colors">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-muted-foreground group-hover:text-primary">DASHBOARD</span>
            </Link>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
