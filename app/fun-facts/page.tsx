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


import { useState } from "react"
import PageWrapper from "@/components/page-wrapper"
import EducationBreadcrumb from "@/components/education/education-breadcrumb"
import GuideIndex from "@/components/education/guide-index"
import EducationBackLink from "@/components/education/education-back-link"
import { ChevronDown, ChevronUp } from "lucide-react"
import { themeTokens } from '@/lib/theme-tokens'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { weatherPhenomena } from "@/data/fun-facts"

export default function FunFactsPage() {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const themeClasses = themeTokens.weather

  const toggleCard = (id: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCards(newExpanded)
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Ultra Rare': return themeClasses.warningText
      case 'Very Rare': return themeClasses.successText
      case 'Rare': return themeClasses.accentText
      case 'Uncommon': return themeClasses.secondaryText
      default: return themeClasses.text
    }
  }

  const getDangerBars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => i < level)
  }

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8">
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: '16-Bit Takes' },
          ]}
        />
        <EducationBackLink />
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 font-mono uppercase tracking-wider ${themeClasses.headerText} ${themeClasses.glow}`}>
            16-BIT TAKES
          </h1>
          <p className={`text-lg ${themeClasses.secondaryText} font-mono mb-6`}>
            Weather phenomena explained with 16-bit gaming references
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {weatherPhenomena.map((phenomenon) => {
            const isExpanded = expandedCards.has(phenomenon.id)
            return (
              <Card
                key={phenomenon.id}
                className={`container-primary transition-all duration-300 cursor-pointer h-fit`}
                onClick={() => toggleCard(phenomenon.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-3xl">{phenomenon.emoji}</div>
                    <div
                      className="text-xs font-mono font-bold px-2 py-1 rounded"
                      style={{
                        color: getRarityColor(phenomenon.rarity),
                        backgroundColor: getRarityColor(phenomenon.rarity) + '20'
                      }}
                    >
                      {phenomenon.rarity.toUpperCase()}
                    </div>
                  </div>

                  <CardTitle className={`font-mono font-bold text-lg uppercase tracking-wider ${themeClasses.headerText}`}>
                    {phenomenon.name}
                  </CardTitle>

                  <div className="flex items-center justify-between">
                    <CardDescription className={`text-sm font-mono ${themeClasses.secondaryText}`}>
                      {phenomenon.category}
                    </CardDescription>
                    {isExpanded ?
                      <ChevronUp className="w-4 h-4 text-current" /> :
                      <ChevronDown className="w-4 h-4 text-current" />
                    }
                  </div>
                </CardHeader>

                {/* Card Body */}
                <CardContent>
                  <p className={`${themeClasses.text} font-mono text-sm mb-4`}>
                    {phenomenon.description}
                  </p>

                  {isExpanded && (
                    <div className="space-y-4">
                      {/* Danger Level */}
                      <div>
                        <h4 className={`font-mono font-bold text-sm uppercase mb-2 ${themeClasses.headerText}`}>
                          Danger Level:
                        </h4>
                        <div className="flex items-center gap-1">
                          {getDangerBars(phenomenon.dangerLevel).map((filled, i) => (
                            <div
                              key={i}
                              className="w-6 h-3 rounded-sm border font-mono"
                              style={{
                                backgroundColor: filled
                                  ? phenomenon.dangerLevel >= 4
                                    ? '#ef4444'
                                    : phenomenon.dangerLevel >= 2
                                      ? '#f59e0b'
                                      : '#22c55e'
                                  : 'transparent',
                                borderColor: filled
                                  ? phenomenon.dangerLevel >= 4
                                    ? '#ef4444'
                                    : phenomenon.dangerLevel >= 2
                                      ? '#f59e0b'
                                      : '#22c55e'
                                  : 'currentColor',
                                opacity: filled ? 1 : 0.3
                              }}
                            />
                          ))}
                          <span className={`ml-2 font-mono text-xs ${themeClasses.secondaryText}`}>
                            {phenomenon.dangerLevel}/5
                          </span>
                        </div>
                      </div>

                      {/* Scientific Facts */}
                      <div>
                        <h4 className={`font-mono font-bold text-sm uppercase mb-2 ${themeClasses.headerText}`}>
                          Scientific Facts:
                        </h4>
                        <ul className="space-y-1">
                          {phenomenon.facts.map((fact, index) => (
                            <li key={index} className={`${themeClasses.text} font-mono text-xs flex items-start`}>
                              <span className={`${themeClasses.headerText} mr-2`}>▸</span>
                              {fact}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Scientific Mechanism */}
                      {phenomenon.scientificMechanism && (
                        <div className="mt-4">
                          <h4 className={`font-mono font-bold text-sm uppercase mb-2 ${themeClasses.headerText}`}>
                            The Science Behind It:
                          </h4>
                          <p className={`${themeClasses.text} font-mono text-xs leading-relaxed`}>
                            {phenomenon.scientificMechanism}
                          </p>
                        </div>
                      )}

                      {/* How To Spot */}
                      <div className="mt-4">
                        <h4 className={`font-mono font-bold text-sm uppercase mb-2 ${themeClasses.headerText}`}>
                          How to Spot It:
                        </h4>
                        <p className={`${themeClasses.text} font-mono text-xs leading-relaxed`}>
                          {phenomenon.howToSpot}
                        </p>
                      </div>

                      {/* Where & When */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <h4 className={`font-mono font-bold text-sm uppercase mb-2 ${themeClasses.headerText}`}>
                            Where to See:
                          </h4>
                          <p className={`${themeClasses.text} font-mono text-xs leading-relaxed`}>
                            {phenomenon.whereToSee}
                          </p>
                        </div>
                        <div>
                          <h4 className={`font-mono font-bold text-sm uppercase mb-2 ${themeClasses.headerText}`}>
                            Best Season:
                          </h4>
                          <p className={`${themeClasses.text} font-mono text-xs leading-relaxed`}>
                            {phenomenon.bestSeason}
                          </p>
                        </div>
                      </div>

                      {/* Historical Occurrence */}
                      {phenomenon.historicalOccurrence && (
                        <div className="mt-4">
                          <h4 className={`font-mono font-bold text-sm uppercase mb-2 ${themeClasses.headerText}`}>
                            Famous Encounter:
                          </h4>
                          <div className={`${themeClasses.warningText} font-mono text-xs border-l-4 border-current pl-3`}>
                            {phenomenon.historicalOccurrence}
                          </div>
                        </div>
                      )}

                      {/* 16-Bit Take */}
                      <div className="card-inner p-3 mt-4 rounded"
                        style={{ backgroundColor: getRarityColor(phenomenon.rarity) + '10' }}>
                        <h4 className={`font-mono font-bold text-sm uppercase mb-2 ${themeClasses.headerText}`}>
                          16-Bit Take:
                        </h4>
                        <p className={`${themeClasses.text} font-mono text-xs italic`}>
                          {phenomenon.bitFact}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <p className={`${themeClasses.secondaryText} font-mono text-sm`}>
            Click any phenomenon card to expand and learn more!
          </p>
        </div>

        <GuideIndex kind="phenomenon" />
      </div>
    </PageWrapper>
  )
}
