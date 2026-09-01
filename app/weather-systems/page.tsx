"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 * 
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */


import React, { useState } from "react"
import Link from "next/link"
import PageWrapper from "@/components/page-wrapper"
import EducationBreadcrumb from "@/components/education/education-breadcrumb"
import GuideIndex from "@/components/education/guide-index"
import EducationBackLink from "@/components/education/education-back-link"
import { themeTokens } from '@/lib/theme-tokens'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { weatherSystemsDatabase } from "@/data/weather-systems"
import { getEducationDetailHref, systemSlug } from "@/lib/education/entries"

export default function WeatherSystemsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedSystemId, setExpandedSystemId] = useState<number | null>(null)
  const [achievementUnlocked, setAchievementUnlocked] = useState<string>('')

  const themeClasses = themeTokens.weather

  // Filter systems by category
  const filteredSystems = selectedCategory === 'all'
    ? weatherSystemsDatabase
    : weatherSystemsDatabase.filter(system => system.category === selectedCategory)

  // Achievement system
  const checkAchievements = (systemId: number) => {
    const system = weatherSystemsDatabase.find(s => s.id === systemId)
    if (!system) return

    let achievement = ''

    if (system.rarity === 'boss-level') {
      achievement = '🏆 BOSS LEVEL UNLOCKED! You discovered a legendary weather system!'
    } else if (system.rarity === 'elite-tier') {
      achievement = '⭐ ELITE TIER! You found a high-level atmospheric phenomenon!'
    } else if (system.category === 'large-scale') {
      achievement = '🌍 PLANETARY SCALE! You explored a global weather system!'
    }

    if (achievement) {
      setAchievementUnlocked(achievement)
      setTimeout(() => setAchievementUnlocked(''), 3000)
    }
  }

  const handleSystemToggle = (systemId: number) => {
    if (expandedSystemId === systemId) {
      setExpandedSystemId(null)
    } else {
      setExpandedSystemId(systemId)
      checkAchievements(systemId)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'boss-level': return themeClasses.warningText
      case 'elite-tier': return themeClasses.successText
      case 'rare': return themeClasses.accentText
      case 'uncommon': return themeClasses.headerText
      default: return themeClasses.text
    }
  }

  const getCategoryStats = () => {
    const stats = {
      pressure: weatherSystemsDatabase.filter(s => s.category === 'pressure').length,
      frontal: weatherSystemsDatabase.filter(s => s.category === 'frontal').length,
      'large-scale': weatherSystemsDatabase.filter(s => s.category === 'large-scale').length,
      specialized: weatherSystemsDatabase.filter(s => s.category === 'specialized').length
    }
    return stats
  }

  const categoryStats = getCategoryStats()

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8">
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: 'Weather Systems' },
          ]}
        />
        <EducationBackLink />
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 font-mono uppercase tracking-wider ${themeClasses.headerText} ${themeClasses.glow}`}>
            16-BIT WEATHER SYSTEMS
          </h1>
          <p className={`text-lg ${themeClasses.secondaryText} font-mono mb-6`}>
            Interactive 16-bit atmospheric phenomena database • {weatherSystemsDatabase.length} systems documented
          </p>
        </div>

        {/* Achievement Display */}
        {achievementUnlocked && (
          <div className={`fixed top-4 right-4 z-50 ${themeClasses.cardBg} p-4 border-2 ${themeClasses.borderColor} max-w-sm animate-pulse`}
            style={{ boxShadow: `0 0 20px ${themeClasses.shadowColor}` }}>
            <div className={`${themeClasses.successText} font-mono text-sm font-bold`}>
              {achievementUnlocked}
            </div>
          </div>
        )}

        {/* Category Filter Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {(['all', 'pressure', 'frontal', 'large-scale', 'specialized'] as const).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={`font-mono text-sm font-bold uppercase tracking-wider ${selectedCategory === category
                  ? `${themeClasses.headerText}`
                  : `${themeClasses.secondaryText}`
                  }`}
                style={selectedCategory === category ? {
                  borderColor: themeClasses.shadowColor,
                  boxShadow: `0 0 10px ${themeClasses.shadowColor}33`
                } : {}}
              >
                {category === 'all' ? 'ALL SYSTEMS' : category.toUpperCase().replace('-', ' ')}
                {category !== 'all' && ` (${categoryStats[category]})`}
              </Button>
            ))}
          </div>
        </div>

        {/* Weather Systems Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSystems.map((system) => (
              <React.Fragment key={system.id}>
                {/* System Card */}
                <Card
                  onClick={() => handleSystemToggle(system.id)}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${expandedSystemId === system.id ? themeClasses.borderColor : 'border-gray-600'
                    }`}
                  style={{
                    borderColor: expandedSystemId === system.id ? themeClasses.shadowColor : '#666',
                    boxShadow: expandedSystemId === system.id
                      ? `0 0 20px ${themeClasses.shadowColor}`
                      : '0 4px 6px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <CardHeader className="text-center pb-2">
                    <div className="text-4xl mb-2">{system.emoji}</div>
                    <CardTitle className={`text-lg font-bold font-mono uppercase tracking-wider ${themeClasses.headerText}`}>
                      {system.name}
                    </CardTitle>
                    <CardDescription className={`text-xs font-mono ${themeClasses.secondaryText}`}>
                      {system.classification}
                    </CardDescription>
                    <div className={`text-xs font-mono font-bold uppercase ${getRarityColor(system.rarity)}`}>
                      {system.rarity.replace('-', ' ')}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className={themeClasses.secondaryText}>Wind Speed:</span>
                      <span className={themeClasses.text}>{system.windSpeed}</span>
                    </div>
                    {system.pressureRange && (
                      <div className="flex justify-between">
                        <span className={themeClasses.secondaryText}>Pressure:</span>
                        <span className={themeClasses.text}>{system.pressureRange}</span>
                      </div>
                    )}
                    <div>
                      <div className={`${themeClasses.accentText} mb-1 font-bold text-xs`}>Formation:</div>
                      <div className={`${themeClasses.text} text-xs leading-relaxed`}>
                        {system.formationProcess.slice(0, 80)}...
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <span className={`text-xs font-mono ${themeClasses.secondaryText}`}>
                        {expandedSystemId === system.id ? '▼ CLICK TO CLOSE' : '▶ CLICK FOR FULL ANALYSIS'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Expanded Details - Appears DIRECTLY BELOW this specific card */}
                {expandedSystemId === system.id && (
                  <div className="col-span-full mt-6">
                    <div
                      className={`${themeClasses.cardBg} p-8 border-2 transition-all duration-500 ease-in-out overflow-hidden w-full`}
                      style={{
                        borderColor: themeClasses.shadowColor,
                        boxShadow: `0 0 25px ${themeClasses.shadowColor}`,
                        animation: 'slideDown 0.3s ease-out'
                      }}
                    >
                      <style jsx>{`
                        @keyframes slideDown {
                          from {
                            opacity: 0;
                            max-height: 0;
                            transform: translateY(-10px);
                          }
                          to {
                            opacity: 1;
                            max-height: 1000px;
                            transform: translateY(0);
                          }
                        }
                      `}</style>

                      <div className="mb-6">
                        <h3 className={`text-3xl font-bold font-mono uppercase tracking-wider ${themeClasses.headerText} text-center mb-2`}>
                          {system.emoji} {system.name} TECHNICAL ANALYSIS
                        </h3>
                        <div className={`text-center ${themeClasses.secondaryText} font-mono text-sm`}>
                          Full-Width Weather System Database Entry • Classification: {system.classification}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Technical Specifications */}
                        <div>
                          <h4 className={`text-lg font-bold mb-4 font-mono ${themeClasses.headerText} border-b-2 pb-2`}
                            style={{ borderColor: themeClasses.shadowColor }}>
                            📊 TECHNICAL SPECIFICATIONS
                          </h4>
                          <div className="space-y-3 text-sm font-mono">
                            <div className="flex justify-between">
                              <span className={themeClasses.secondaryText}>Wind Speed:</span>
                              <span className={themeClasses.text}>{system.windSpeed}</span>
                            </div>
                            {system.pressureRange && (
                              <div className="flex justify-between">
                                <span className={themeClasses.secondaryText}>Pressure Range:</span>
                                <span className={themeClasses.text}>{system.pressureRange}</span>
                              </div>
                            )}
                            {system.temperatureRange && (
                              <div className="flex justify-between">
                                <span className={themeClasses.secondaryText}>Temperature:</span>
                                <span className={themeClasses.text}>{system.temperatureRange}</span>
                              </div>
                            )}
                            {system.diameter && (
                              <div className="flex justify-between">
                                <span className={themeClasses.secondaryText}>Size:</span>
                                <span className={themeClasses.text}>{system.diameter}</span>
                              </div>
                            )}
                            {system.altitude && (
                              <div className="flex justify-between">
                                <span className={themeClasses.secondaryText}>Altitude:</span>
                                <span className={themeClasses.text}>{system.altitude}</span>
                              </div>
                            )}
                            {system.duration && (
                              <div className="flex justify-between">
                                <span className={themeClasses.secondaryText}>Duration:</span>
                                <span className={themeClasses.text}>{system.duration}</span>
                              </div>
                            )}
                            {system.waterTransport && (
                              <div className="flex justify-between">
                                <span className={themeClasses.secondaryText}>Water Transport:</span>
                                <span className={themeClasses.warningText}>{system.waterTransport}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Formation & Process */}
                        <div>
                          <h4 className={`text-lg font-bold mb-4 font-mono ${themeClasses.headerText} border-b-2 pb-2`}
                            style={{ borderColor: themeClasses.shadowColor }}>
                            ⚡ FORMATION & PROCESS
                          </h4>
                          <div className="space-y-4 text-sm font-mono">
                            <div>
                              <div className={`${themeClasses.accentText} mb-2 font-bold`}>Formation Process:</div>
                              <div className={themeClasses.text}>{system.formationProcess}</div>
                            </div>
                            {system.rotation && (
                              <div>
                                <div className={`${themeClasses.accentText} mb-2 font-bold`}>Rotation Pattern:</div>
                                <div className={themeClasses.text}>{system.rotation}</div>
                              </div>
                            )}
                            {system.types && (
                              <div>
                                <div className={`${themeClasses.accentText} mb-2 font-bold`}>System Types:</div>
                                <div className={themeClasses.text}>{system.types}</div>
                              </div>
                            )}
                            <div>
                              <div className={`${themeClasses.accentText} mb-2 font-bold`}>16-Bit Description:</div>
                              <div className={`${themeClasses.text} italic p-2 border rounded`}
                                style={{ borderColor: themeClasses.shadowColor + '50', backgroundColor: themeClasses.shadowColor + '10' }}>
                                &quot;{system.description16bit}&quot;
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Weather Impact & Geography */}
                        <div>
                          <h4 className={`text-lg font-bold mb-4 font-mono ${themeClasses.headerText} border-b-2 pb-2`}
                            style={{ borderColor: themeClasses.shadowColor }}>
                            🌍 WEATHER IMPACT & GEOGRAPHY
                          </h4>
                          <div className="space-y-4 text-sm font-mono">
                            <div>
                              <div className={`${themeClasses.accentText} mb-2 font-bold`}>Associated Weather:</div>
                              <div className={`${themeClasses.successText} p-2 border rounded font-bold`}
                                style={{ borderColor: themeClasses.successText + '50', backgroundColor: themeClasses.successText + '10' }}>
                                {system.associatedWeather}
                              </div>
                            </div>
                            <div>
                              <div className={`${themeClasses.accentText} mb-2 font-bold`}>Geographic Regions:</div>
                              <div className={themeClasses.text}>{system.geographicRegions}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 text-center">
                        <Link
                          href={getEducationDetailHref('weather-system', systemSlug(system))}
                          className={`text-sm font-mono font-bold uppercase ${themeClasses.accentText} hover:underline`}
                        >
                          Open shareable guide →
                        </Link>
                      </div>

                      {/* Close Button */}
                      <div className="mt-8 text-center">
                        <Button
                          variant="outline"
                          onClick={() => setExpandedSystemId(null)}
                          className={`${themeClasses.text} font-mono text-sm font-bold uppercase tracking-wider`}
                          style={{
                            borderColor: themeClasses.shadowColor,
                            boxShadow: `0 0 10px ${themeClasses.shadowColor}33`
                          }}
                        >
                          CLOSE TECHNICAL ANALYSIS
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Educational Section */}
        <div className="mt-16 max-w-6xl mx-auto">
          <Card
            className="border-4"
            style={{ boxShadow: `0 0 20px ${themeClasses.shadowColor}` }}
          >
            <CardHeader>
              <CardTitle className={`text-2xl font-bold font-mono uppercase tracking-wider ${themeClasses.headerText} text-center`}>
                WEATHER SYSTEMS CLASSIFICATION DATABASE
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-sm font-mono">
              <div>
                <h4 className={`${themeClasses.accentText} mb-3 font-bold`}>PRESSURE SYSTEMS:</h4>
                <ul className={`${themeClasses.text} space-y-2`}>
                  <li>Cyclones: 950-1010 mb</li>
                  <li>Anticyclones: 1020-1050 mb</li>
                  <li>Depressions: Mature lows</li>
                  <li>Blocking Highs: Stationary</li>
                </ul>
              </div>
              <div>
                <h4 className={`${themeClasses.accentText} mb-3 font-bold`}>FRONTAL SYSTEMS:</h4>
                <ul className={`${themeClasses.text} space-y-2`}>
                  <li>Warm: Gradual advance</li>
                  <li>Cold: Rapid undercut</li>
                  <li>Occluded: Front merger</li>
                  <li>Stationary: Boundary hold</li>
                </ul>
              </div>
              <div>
                <h4 className={`${themeClasses.accentText} mb-3 font-bold`}>LARGE-SCALE:</h4>
                <ul className={`${themeClasses.text} space-y-2`}>
                  <li>Atmospheric Rivers: Moisture transport</li>
                  <li>Jet Streams: High-altitude winds</li>
                  <li>Monsoons: Seasonal reversal</li>
                  <li>Polar Vortex: Arctic circulation</li>
                </ul>
              </div>
              <div>
                <h4 className={`${themeClasses.accentText} mb-3 font-bold`}>SPECIALIZED:</h4>
                <ul className={`${themeClasses.text} space-y-2`}>
                  <li>Mid-Latitude Cyclones: Extra-tropical</li>
                  <li>Tropical Cyclones: Hurricane systems</li>
                  <li>Squall Lines: Linear storms</li>
                  <li>Mesoscale Complexes: Storm clusters</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievement System */}
        <div className="mt-8 max-w-4xl mx-auto">
          <Card
            className="text-center"
            style={{ boxShadow: `0 0 15px ${themeClasses.shadowColor}` }}
          >
            <CardHeader>
              <CardTitle className={`text-lg font-bold font-mono uppercase ${themeClasses.headerText}`}>
                METEOROLOGIST ACHIEVEMENTS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className={themeClasses.text}>Storm Tracker: Identify 5 pressure systems</div>
                <div className={themeClasses.text}>Front Hunter: Master frontal boundaries</div>
                <div className={themeClasses.text}>Global Observer: Discover large-scale systems</div>
                <div className={themeClasses.text}>Elite Meteorologist: BOSS LEVEL unlocked</div>
                <div className={themeClasses.text}>System Specialist: All categories explored</div>
                <div className={themeClasses.text}>Weather Master: Complete database analyzed</div>
              </div>
              <div className={`mt-4 ${themeClasses.secondaryText} text-xs`}>
                Click on weather systems to unlock achievements and explore the atmospheric physics!
              </div>
            </CardContent>
          </Card>
        </div>

        <GuideIndex kind="weather-system" />
      </div>
    </PageWrapper>
  )
}
