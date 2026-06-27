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
import { useTheme } from "next-themes"
import PageWrapper from "@/components/page-wrapper"
import EducationBreadcrumb from "@/components/education/education-breadcrumb"
import EducationBackLink from "@/components/education/education-back-link"
import { getComponentStyles, type ThemeType } from "@/lib/theme-utils"

// Shadcn UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cloudDatabase } from "@/data/cloud-types"


export default function CloudTypesPage() {
  const { theme } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedCloudId, setExpandedCloudId] = useState<number | null>(null)
  const [achievementUnlocked, setAchievementUnlocked] = useState<string>('')

  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'card')

  // All filter options including cloud type classifications
  type FilterValue = 'all' | 'high' | 'mid' | 'low' | 'vertical' | 'rare' | 'genus' | 'species' | 'variety' | 'feature' | 'special'

  // Filter clouds by category or cloudType
  const filteredClouds = (() => {
    if (selectedCategory === 'all') return cloudDatabase
    // Altitude-based categories
    if (['high', 'mid', 'low', 'vertical', 'rare'].includes(selectedCategory)) {
      return cloudDatabase.filter(cloud => cloud.category === selectedCategory)
    }
    // Cloud type classifications
    return cloudDatabase.filter(cloud => cloud.cloudType === selectedCategory)
  })()

  // Achievement system
  const checkAchievements = (cloudId: number) => {
    const cloud = cloudDatabase.find(c => c.id === cloudId)
    if (!cloud) return

    if (cloud.rarity === 'legendary') {
      setAchievementUnlocked('LEGENDARY SPOTTER: Rare cloud discovered!')
      setTimeout(() => setAchievementUnlocked(''), 3000)
    } else if (cloud.category === 'rare') {
      setAchievementUnlocked('RARE HUNTER: Unusual formation identified!')
      setTimeout(() => setAchievementUnlocked(''), 3000)
    } else if (cloud.name === 'CUMULONIMBUS') {
      setAchievementUnlocked('STORM CHASER: Storm boss encountered!')
      setTimeout(() => setAchievementUnlocked(''), 3000)
    } else if (cloud.cloudType === 'species') {
      setAchievementUnlocked('TAXONOMIST: Cloud species classified!')
      setTimeout(() => setAchievementUnlocked(''), 3000)
    } else if (cloud.cloudType === 'feature') {
      setAchievementUnlocked('FEATURE FINDER: Supplementary feature detected!')
      setTimeout(() => setAchievementUnlocked(''), 3000)
    } else if (cloud.cloudType === 'special') {
      setAchievementUnlocked('PHENOMENON TRACKER: Special cloud phenomenon logged!')
      setTimeout(() => setAchievementUnlocked(''), 3000)
    }
  }

  const handleCloudToggle = (cloudId: number) => {
    setExpandedCloudId(expandedCloudId === cloudId ? null : cloudId)
    if (expandedCloudId !== cloudId) {
      checkAchievements(cloudId)
    }
  }

  const getRarityVariant = (rarity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (rarity) {
      case 'legendary': return 'destructive'
      case 'rare': return 'secondary'
      default: return 'outline'
    }
  }

  const getCategoryStats = () => ({
    high: cloudDatabase.filter(c => c.category === 'high').length,
    mid: cloudDatabase.filter(c => c.category === 'mid').length,
    low: cloudDatabase.filter(c => c.category === 'low').length,
    vertical: cloudDatabase.filter(c => c.category === 'vertical').length,
    rare: cloudDatabase.filter(c => c.category === 'rare').length
  })

  const getTypeStats = () => ({
    genus: cloudDatabase.filter(c => c.cloudType === 'genus').length,
    species: cloudDatabase.filter(c => c.cloudType === 'species').length,
    variety: cloudDatabase.filter(c => c.cloudType === 'variety').length,
    feature: cloudDatabase.filter(c => c.cloudType === 'feature').length,
    special: cloudDatabase.filter(c => c.cloudType === 'special').length
  })

  const categoryStats = getCategoryStats()
  const typeStats = getTypeStats()

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8">
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: 'Cloud Atlas' },
          ]}
        />
        <EducationBackLink />
        {/* Achievement Notification */}
        {achievementUnlocked && (
          <Card className={`fixed top-4 right-4 z-50 container-primary ${themeClasses.glow}`}>
            <CardContent className="p-4">
              <p className={`font-mono text-sm font-bold ${themeClasses.accentText}`}>
                {achievementUnlocked}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 font-mono uppercase tracking-wider ${themeClasses.accentText} ${themeClasses.glow}`}>
            16-BIT CLOUD ATLAS
          </h1>
          <p className={`text-lg font-mono mb-6 ${themeClasses.mutedText}`}>
            Comprehensive meteorological database - {cloudDatabase.length} cloud types loaded
          </p>

          {/* Stats Display */}
          <Card className="inline-block container-nested">
            <CardContent className="p-4">
              <div className={`text-xs font-mono mb-2 font-bold ${themeClasses.accentText}`}>BY ALTITUDE</div>
              <div className="grid grid-cols-5 gap-4 text-xs font-mono mb-4">
                <div className="text-center">
                  <div className={themeClasses.accentText}>HIGH</div>
                  <div className={themeClasses.text}>{categoryStats.high}</div>
                </div>
                <div className="text-center">
                  <div className={themeClasses.accentText}>MID</div>
                  <div className={themeClasses.text}>{categoryStats.mid}</div>
                </div>
                <div className="text-center">
                  <div className={themeClasses.accentText}>LOW</div>
                  <div className={themeClasses.text}>{categoryStats.low}</div>
                </div>
                <div className="text-center">
                  <div className={themeClasses.accentText}>VERTICAL</div>
                  <div className={themeClasses.text}>{categoryStats.vertical}</div>
                </div>
                <div className="text-center">
                  <div className={themeClasses.accentText}>RARE</div>
                  <div className={themeClasses.text}>{categoryStats.rare}</div>
                </div>
              </div>
              <div className={`text-xs font-mono mb-2 font-bold ${themeClasses.accentText}`}>BY CLASSIFICATION</div>
              <div className="grid grid-cols-5 gap-4 text-xs font-mono">
                <div className="text-center">
                  <div className={themeClasses.accentText}>GENUS</div>
                  <div className={themeClasses.text}>{typeStats.genus}</div>
                </div>
                <div className="text-center">
                  <div className={themeClasses.accentText}>SPECIES</div>
                  <div className={themeClasses.text}>{typeStats.species}</div>
                </div>
                <div className="text-center">
                  <div className={themeClasses.accentText}>VARIETY</div>
                  <div className={themeClasses.text}>{typeStats.variety}</div>
                </div>
                <div className="text-center">
                  <div className={themeClasses.accentText}>FEATURE</div>
                  <div className={themeClasses.text}>{typeStats.feature}</div>
                </div>
                <div className="text-center">
                  <div className={themeClasses.accentText}>SPECIAL</div>
                  <div className={themeClasses.text}>{typeStats.special}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter using Tabs */}
        <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="flex flex-wrap justify-center gap-2 h-auto bg-transparent">
            <TabsTrigger
              value="all"
              className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider card-inner data-[state=active]:${themeClasses.accentBg} data-[state=active]:text-black`}
            >
              ALL
            </TabsTrigger>

            {/* Divider label for altitude filters */}
            <span className={`px-2 py-2 text-xs font-mono ${themeClasses.mutedText} self-center`}>|</span>

            {(['high', 'mid', 'low', 'vertical', 'rare'] as const).map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider card-inner data-[state=active]:${themeClasses.accentBg} data-[state=active]:text-black`}
              >
                {category.toUpperCase()}
                <span className="ml-1 opacity-75">
                  [{category === 'high' ? categoryStats.high :
                    category === 'mid' ? categoryStats.mid :
                      category === 'low' ? categoryStats.low :
                        category === 'vertical' ? categoryStats.vertical :
                          categoryStats.rare}]
                </span>
              </TabsTrigger>
            ))}

            {/* Divider label for classification filters */}
            <span className={`px-2 py-2 text-xs font-mono ${themeClasses.mutedText} self-center`}>|</span>

            {(['genus', 'species', 'variety', 'feature', 'special'] as const).map((cloudType) => (
              <TabsTrigger
                key={cloudType}
                value={cloudType}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider card-inner data-[state=active]:${themeClasses.accentBg} data-[state=active]:text-black`}
              >
                {cloudType.toUpperCase()}
                <span className="ml-1 opacity-75">
                  [{typeStats[cloudType]}]
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Cloud Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-12">
          {filteredClouds.map((cloud) => (
            <React.Fragment key={cloud.id}>
              {/* Cloud Card */}
              <Card
                onClick={() => handleCloudToggle(cloud.id)}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 container-primary ${expandedCloudId === cloud.id ? themeClasses.glow : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className={`text-3xl font-mono uppercase ${themeClasses.accentText}`}>[{cloud.abbreviation}]</div>
                    <div className="flex gap-1.5">
                      <Badge variant={getRarityVariant(cloud.rarity)} className="font-mono text-xs">
                        {cloud.category.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        {cloud.cloudType.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className={`text-xl font-mono uppercase tracking-wider ${themeClasses.text}`}>
                    {cloud.name}
                  </CardTitle>
                  <CardDescription className={`font-mono ${themeClasses.mutedText}`}>
                    ({cloud.abbreviation}) - {cloud.rarity.toUpperCase()}
                    {cloud.parentGenus && (
                      <span className="block mt-1 text-xs">Parent: {cloud.parentGenus}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className={themeClasses.mutedText}>Altitude:</span>
                      <span className={themeClasses.text}>{cloud.altitudeRange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={themeClasses.mutedText}>Formation:</span>
                      <span className={themeClasses.accentText}>{cloud.formationTime}</span>
                    </div>
                  </div>

                  {/* 16-bit Description */}
                  <div className="mt-3 p-2 card-inner rounded bg-opacity-50">
                    <p className={`font-mono text-xs italic ${themeClasses.text}`}>
                      &ldquo;{cloud.description16bit}&rdquo;
                    </p>
                  </div>

                  {/* Expand/Collapse Indicator */}
                  <div className={`mt-3 text-xs font-mono text-center ${themeClasses.mutedText}`}>
                    {expandedCloudId === cloud.id ? '[ CLICK TO COLLAPSE ]' : '[ CLICK FOR DETAILS ]'}
                  </div>
                </CardContent>
              </Card>

              {/* Expanded Details */}
              {expandedCloudId === cloud.id && (
                <Card className={`col-span-full mt-6 container-primary ${themeClasses.glow}`}>
                  <CardHeader>
                    <CardTitle className={`text-2xl font-mono uppercase tracking-wider text-center ${themeClasses.accentText}`}>
                      [{cloud.abbreviation}] {cloud.name} TECHNICAL ANALYSIS
                    </CardTitle>
                    <CardDescription className={`text-center font-mono ${themeClasses.mutedText}`}>
                      Full-Width Cloud Database Entry - Classification: {cloud.cloudType.toUpperCase()} | Altitude: {cloud.category.toUpperCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Technical Specifications */}
                      <div>
                        <h4 className={`text-lg font-bold mb-4 font-mono ${themeClasses.accentText} border-b pb-2 border-subtle`}>
                          TECHNICAL SPECIFICATIONS
                        </h4>
                        <div className="space-y-3 text-sm font-mono">
                          <div className="flex justify-between">
                            <span className={themeClasses.mutedText}>Altitude Range:</span>
                            <span className={themeClasses.text}>{cloud.altitudeRange}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={themeClasses.mutedText}>Temperature:</span>
                            <span className={themeClasses.text}>{cloud.temperature}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={themeClasses.mutedText}>Droplet Size:</span>
                            <span className={themeClasses.text}>{cloud.dropletSize}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={themeClasses.mutedText}>Formation Time:</span>
                            <span className={themeClasses.text}>{cloud.formationTime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={themeClasses.mutedText}>Wind Speed:</span>
                            <span className={themeClasses.text}>{cloud.windSpeed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={themeClasses.mutedText}>Pressure Range:</span>
                            <span className={themeClasses.text}>{cloud.pressureRange}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={themeClasses.mutedText}>Density:</span>
                            <span className={themeClasses.text}>{cloud.density}</span>
                          </div>
                          {cloud.thickness && (
                            <div className="flex justify-between">
                              <span className={themeClasses.mutedText}>Cloud Thickness:</span>
                              <span className={themeClasses.text}>{cloud.thickness}</span>
                            </div>
                          )}
                          {cloud.energy && (
                            <div className="flex justify-between">
                              <span className={themeClasses.mutedText}>Convective Energy:</span>
                              <span className={themeClasses.accentText}>{cloud.energy}</span>
                            </div>
                          )}
                          {cloud.parentGenus && (
                            <div className="flex justify-between">
                              <span className={themeClasses.mutedText}>Parent Genus:</span>
                              <span className={themeClasses.accentText}>{cloud.parentGenus}</span>
                            </div>
                          )}
                          {cloud.etymology && (
                            <div className="pt-2 border-t border-dashed border-gray-500/50 mt-2">
                              <span className={themeClasses.mutedText}>Etymology: </span>
                              <span className="italic opacity-80">{cloud.etymology}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Visual & Formation Info */}
                      <div>
                        <h4 className={`text-lg font-bold mb-4 font-mono ${themeClasses.accentText} border-b pb-2 border-subtle`}>
                          VISUAL & FORMATION
                        </h4>
                        <div className="space-y-4 text-sm font-mono">
                          <div>
                            <div className={`${themeClasses.accentText} mb-2 font-bold`}>Visual Appearance:</div>
                            <div className={themeClasses.text}>{cloud.appearance}</div>
                          </div>
                          <div>
                            <div className={`${themeClasses.accentText} mb-2 font-bold`}>Formation Process:</div>
                            <div className={themeClasses.text}>{cloud.formation}</div>
                          </div>
                          <div>
                            <div className={`${themeClasses.accentText} mb-2 font-bold`}>16-Bit Description:</div>
                            <div className={`${themeClasses.text} italic p-2 border rounded ${themeClasses.borderColor}`}>
                              &quot;{cloud.description16bit}&quot;
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Weather Impact & Facts */}
                      <div>
                        <h4 className={`text-lg font-bold mb-4 font-mono ${themeClasses.accentText} border-b pb-2 border-subtle`}>
                          WEATHER IMPACT & DATA
                        </h4>
                        <div className="space-y-4 text-sm font-mono">
                          <div>
                            <div className={`${themeClasses.accentText} mb-2 font-bold`}>Weather Prediction:</div>
                            <div className={`p-2 card-inner rounded font-bold ${themeClasses.text}`}>
                              {cloud.weatherPrediction}
                            </div>
                          </div>
                          <div>
                            <div className={`${themeClasses.accentText} mb-2 font-bold`}>Rarity Classification:</div>
                            <Badge variant={getRarityVariant(cloud.rarity)} className="font-mono">
                              {cloud.rarity.toUpperCase()} ({cloud.category.toUpperCase()} LEVEL)
                            </Badge>
                          </div>
                          <div>
                            <div className={`${themeClasses.accentText} mb-2 font-bold`}>Meteorological Fact:</div>
                            <div className={themeClasses.text}>{cloud.funFact}</div>
                          </div>
                          {cloud.precipitation && (
                            <div>
                              <div className={`${themeClasses.accentText} mb-2 font-bold`}>Precipitation Rate:</div>
                              <div className={themeClasses.text}>{cloud.precipitation}</div>
                            </div>
                          )}
                          {cloud.lifespan && (
                            <div>
                              <div className={`${themeClasses.accentText} mb-2 font-bold`}>Lifespan:</div>
                              <div className={themeClasses.text}>{cloud.lifespan}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Close Button */}
                    <div className="mt-8 text-center">
                      <Button
                        onClick={() => setExpandedCloudId(null)}
                        variant="outline"
                        className="font-mono font-bold uppercase tracking-wider"
                      >
                        CLOSE TECHNICAL ANALYSIS
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Educational Section */}
        <Card className="mt-16 max-w-6xl mx-auto container-primary">
          <CardHeader>
            <CardTitle className={`text-2xl font-mono uppercase tracking-wider text-center ${themeClasses.accentText}`}>
              CLOUD FORMATION DATABASE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm font-mono">
              <div>
                <h4 className={`${themeClasses.accentText} mb-3 font-bold`}>ALTITUDE CLASSIFICATIONS:</h4>
                <ul className={`${themeClasses.text} space-y-2`}>
                  <li>- HIGH: 20,000+ ft (Ice crystals)</li>
                  <li>- MID: 6,500-20,000 ft (Water + ice)</li>
                  <li>- LOW: 0-6,500 ft (Water droplets)</li>
                  <li>- VERTICAL: Multi-level towers</li>
                  <li>- RARE: Special conditions only</li>
                </ul>
              </div>
              <div>
                <h4 className={`${themeClasses.accentText} mb-3 font-bold`}>CLOUD TAXONOMY:</h4>
                <ul className={`${themeClasses.text} space-y-2`}>
                  <li>- GENUS: 10 basic cloud types (WMO)</li>
                  <li>- SPECIES: Shape/structure variants</li>
                  <li>- VARIETY: Pattern/transparency modifiers</li>
                  <li>- FEATURE: Supplementary formations</li>
                  <li>- SPECIAL: Rare atmospheric phenomena</li>
                </ul>
              </div>
              <div>
                <h4 className={`${themeClasses.accentText} mb-3 font-bold`}>FORMATION PHYSICS:</h4>
                <ul className={`${themeClasses.text} space-y-2`}>
                  <li>- Droplet size: 5-200 micrometers</li>
                  <li>- Temperature drop: 2C per 1000 ft</li>
                  <li>- Nuclei needed: 100-1000/cm3</li>
                  <li>- Humidity: Must reach 100%</li>
                  <li>- Wind shear creates patterns</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievement System */}
        <Card className="mt-8 max-w-4xl mx-auto container-nested">
          <CardHeader>
            <CardTitle className={`text-lg font-mono uppercase text-center ${themeClasses.accentText}`}>
              CLOUD SPOTTER ACHIEVEMENTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className={themeClasses.text}>Cloud Spotter: Identify 5 basic types</div>
              <div className={themeClasses.text}>Storm Chaser: Witness cumulonimbus</div>
              <div className={themeClasses.text}>Rare Hunter: Spot unusual formations</div>
              <div className={themeClasses.text}>High Altitude: Observe cirrus family</div>
              <div className={themeClasses.text}>Weather Prophet: Predict from clouds</div>
              <div className={themeClasses.text}>Taxonomist: Classify a cloud species</div>
              <div className={themeClasses.text}>Feature Finder: Detect a supplementary feature</div>
              <div className={themeClasses.text}>Phenomenon Tracker: Log a special cloud</div>
              <div className={themeClasses.text}>Completionist: All {cloudDatabase.length} types documented</div>
              <div className={themeClasses.text}>Legendary Spotter: Discover a legendary cloud</div>
            </div>
            <div className={`mt-4 text-center text-xs ${themeClasses.mutedText}`}>
              Click on clouds to unlock achievements!
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
