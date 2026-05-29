/**
 * 16-Bit Weather Platform - Aviation Service
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches and formats aviation weather data for AI context injection
 */

export interface AviationAlert {
  id: string;
  type: 'SIGMET' | 'AIRMET' | 'CWA' | 'PIREP';
  severity: 'low' | 'moderate' | 'severe' | 'extreme';
  hazard: string;
  region: string;
  validFrom: string;
  validTo: string;
  text: string;
}
