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


import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { searchCities, getCityDisplayName, getCityPageSlug, type CityData } from "@/lib/cities"
import type { ThemeType } from "@/lib/theme-config"

interface CityAutocompleteProps {
  query: string;
  onSelect: (city: CityData) => void;
  onQueryChange: (query: string) => void;
  theme?: ThemeType;
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
}

export default function CityAutocomplete({
  query,
  onSelect,
  onQueryChange,
  theme = 'nord',
  isVisible,
  onVisibilityChange
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CityData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Theme-aware classes using CSS variables
  const themeClasses = {
    dropdown: "bg-popover border-primary text-popover-foreground",
    item: "hover:bg-accent hover:text-accent-foreground",
    selectedItem: "bg-primary text-primary-foreground",
    cityName: "text-foreground",
    location: "text-primary",
    pageIndicator: "text-primary"
  };

  // Update suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      const results = searchCities(query, 4);
      setSuggestions(results);
      setSelectedIndex(-1);
      onVisibilityChange(results.length > 0);
    } else {
      setSuggestions([]);
      setSelectedIndex(-1);
      onVisibilityChange(false);
    }
  }, [query, onVisibilityChange]);

  // Handle keyboard navigation - only for autocomplete-specific keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keys when autocomplete is visible and has suggestions
      if (!isVisible || suggestions.length === 0) return;
      
      // Only prevent default for navigation keys we specifically handle
      // Let all other keys (including backspace, delete, typing) pass through naturally
      switch (e.key) {
        case 'ArrowDown':
          // Only prevent default if we're actually in the search input
          const activeElement = document.activeElement as HTMLInputElement;
          if (activeElement && (activeElement.type === 'text' || activeElement.tagName === 'INPUT')) {
            e.preventDefault();
            setSelectedIndex(prev => 
              prev < suggestions.length - 1 ? prev + 1 : prev
            );
          }
          break;
        case 'ArrowUp':
          // Only prevent default if we're actually in the search input
          const activeElementUp = document.activeElement as HTMLInputElement;
          if (activeElementUp && (activeElementUp.type === 'text' || activeElementUp.tagName === 'INPUT')) {
            e.preventDefault();
            setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          }
          break;
        case 'Enter':
          // Only handle Enter if we have a selected item and we're in the search input
          const activeElementEnter = document.activeElement as HTMLInputElement;
          if (activeElementEnter && (activeElementEnter.type === 'text' || activeElementEnter.tagName === 'INPUT') &&
              selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            handleCitySelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          // Always handle Escape to close autocomplete
          e.preventDefault();
          onVisibilityChange(false);
          setSelectedIndex(-1);
          break;
        // Explicitly DO NOT handle any other keys - let them pass through to the input
        default:
          // Do nothing - let the browser handle all other keys naturally
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, suggestions, selectedIndex, onVisibilityChange]);

  // Handle city selection
  const handleCitySelect = (city: CityData) => {
    if (city.hasPage && city.pageSlug) {
      // Navigate to dedicated page
      router.push(`/weather/${city.pageSlug}`);
    } else {
      // Use search term for weather API
      onSelect(city);
    }
    onVisibilityChange(false);
    setSelectedIndex(-1);
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onVisibilityChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onVisibilityChange]);

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "absolute top-full left-0 right-0 z-50 mt-1 border-0 rounded glow-subtle",
        "font-mono text-sm max-h-64 overflow-y-auto",
        themeClasses.dropdown
      )}
    >
      {suggestions.map((city, index) => (
        <div
          key={`${city.name}-${city.country}-${city.state || ''}`}
          className={cn(
            "px-4 py-3 cursor-pointer transition-colors duration-150",
            "flex items-center justify-between border-b border-border/20",
            "last:border-b-0",
            selectedIndex === index ? themeClasses.selectedItem : themeClasses.item
          )}
          onClick={() => handleCitySelect(city)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex-1 min-w-0">
            <div className={cn(
              "font-semibold text-sm truncate",
              selectedIndex === index ? "text-primary-foreground" : themeClasses.cityName
            )}>
              {city.name}
            </div>
            <div className={cn(
              "text-xs opacity-80 truncate",
              selectedIndex === index ? "text-primary-foreground" : themeClasses.location
            )}>
              {city.country === "US" && city.state ? city.state : city.country}
            </div>
          </div>

          {/* Page indicator */}
          {city.hasPage && (
            <div className={cn(
              "ml-2 text-xs font-bold flex-shrink-0",
              selectedIndex === index ? "text-primary-foreground" : themeClasses.pageIndicator
            )}>
              PAGE
            </div>
          )}
        </div>
      ))}
      
      {/* Footer hint */}
      <div className={cn(
        "px-4 py-2 text-xs opacity-60 border-t border-border/20",
        "text-center",
        themeClasses.location
      )}>
        ↑↓ Navigate • Enter Select • Esc Close
      </div>
    </div>
  );
}