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
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */

import { toast } from "@/components/ui/use-toast"

export const toastService = {
  success: (message: string, description?: string) => {
    toast({
      title: "✅ SUCCESS",
      description: message,
      duration: 4000,
      className: "font-mono uppercase tracking-wider border-0"
    })
  },

  error: (message: string, description?: string) => {
    toast({
      title: "❌ ERROR",
      description: message,
      variant: "destructive",
      duration: 4000,
      className: "font-mono uppercase tracking-wider border-0"
    })
  },

  warning: (message: string, description?: string) => {
    toast({
      title: "⚠️ WARNING",
      description: message,
      duration: 4000,
      className: "font-mono uppercase tracking-wider border-0 border-yellow-500"
    })
  },

  info: (message: string, description?: string) => {
    toast({
      title: "ℹ️ INFO",
      description: message,
      duration: 4000,
      className: "font-mono uppercase tracking-wider border-0 border-terminal-accent-info"
    })
  },

  locationAdded: (locationName: string) => {
    toast({
      title: "📍 LOCATION ADDED",
      description: `${locationName} has been saved to your dashboard`,
      duration: 3000,
      className: "font-mono uppercase tracking-wider border-0"
    })
  },

  weatherUpdated: (locationName: string) => {
    toast({
      title: "🌤️ WEATHER UPDATED",
      description: `Fresh weather data loaded for ${locationName}`,
      duration: 2000,
      className: "font-mono uppercase tracking-wider border-0"
    })
  },

  themeChanged: (themeName: string) => {
    toast({
      title: "🎨 THEME CHANGED",
      description: `Switched to ${themeName.toUpperCase()} theme`,
      duration: 2000,
      className: "font-mono uppercase tracking-wider border-0"
    })
  },

  rateLimited: () => {
    toast({
      title: "⏱️ RATE LIMIT",
      description: "Too many requests. Please wait a moment.",
      variant: "destructive",
      duration: 5000,
      className: "font-mono uppercase tracking-wider border-0"
    })
  },

  locationNotFound: (searchTerm: string) => {
    toast({
      title: "🔍 LOCATION NOT FOUND",
      description: `Could not find weather data for "${searchTerm}"`,
      variant: "destructive",
      duration: 4000,
      className: "font-mono uppercase tracking-wider border-0"
    })
  },

  networkError: () => {
    toast({
      title: "🌐 NETWORK ERROR",
      description: "Check your internet connection and try again",
      variant: "destructive",
      duration: 5000,
      className: "font-mono uppercase tracking-wider border-0"
    })
  }
}