/**
 * Unit tests for CurrentConditions component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import CurrentConditions from '@/components/space-weather/CurrentConditions';

describe('CurrentConditions', () => {
  it('should render all 6 condition cells with labels', () => {
    render(
      <CurrentConditions
        kpIndex={{ current: { value: 3, timeTag: '2025-01-01' }, forecast: null }}
        solarWind={{ current: { speed: 450, density: 5, temperature: 100000, bz: -2, bt: 6 }, trend: 'stable' }}
        xrayFlux={{ current: { shortWave: 1e-7, longWave: 1e-6, classification: 'C', subClass: 1.7, timestamp: '' }, peak24h: { classification: 'M', subClass: 2.1, timestamp: '' }, background: 'B5.0', trend: 'stable' }}
        sunspots={{ current: { sunspotNumber: 120, observedF107: 150, date: '' }, solarCycle: { cycleNumber: 25, phase: 'maximum', percentComplete: 60 }, monthlySmoothed: 110, trend: 'increasing' }}
        auroraForecast={{ currentKp: 3, viewline: { latitude: 55, description: 'Northern US states' }, hemisphere: 'north', updatedAt: '' }}
      />
    );

    expect(screen.getByText(/Kp Index/i)).toBeDefined();
    expect(screen.getByText(/Solar Wind/i)).toBeDefined();
    expect(screen.getByText(/Bz Component/i)).toBeDefined();
    expect(screen.getByText(/X-Ray Flux/i)).toBeDefined();
    expect(screen.getByText(/Sunspots/i)).toBeDefined();
    expect(screen.getByText(/Aurora/i)).toBeDefined();
  });

  it('should display actual data values from props', () => {
    render(
      <CurrentConditions
        kpIndex={{ current: { value: 5, timeTag: '2025-01-01' }, forecast: null }}
        solarWind={{ current: { speed: 620, density: 5, temperature: 100000, bz: -8, bt: 6 }, trend: 'increasing' }}
        xrayFlux={{ current: { shortWave: 1e-7, longWave: 1e-6, classification: 'M', subClass: 2.1, timestamp: '' }, peak24h: { classification: 'X', subClass: 1.0, timestamp: '' }, background: 'B5.0', trend: 'stable' }}
        sunspots={{ current: { sunspotNumber: 145, observedF107: 150, date: '' }, solarCycle: { cycleNumber: 25, phase: 'maximum', percentComplete: 60 }, monthlySmoothed: 110, trend: 'increasing' }}
        auroraForecast={{ currentKp: 5, viewline: { latitude: 50, description: 'Oregon, Wisconsin' }, hemisphere: 'north', updatedAt: '' }}
      />
    );

    // Kp value
    expect(screen.getByText('5')).toBeDefined();
    // Solar wind speed
    expect(screen.getByText(/620/)).toBeDefined();
    // Bz value
    expect(screen.getByText(/-8/)).toBeDefined();
    // X-ray class
    expect(screen.getByText(/M2\.1/)).toBeDefined();
    // Sunspot count
    expect(screen.getByText(/145/)).toBeDefined();
    // Aurora latitude
    expect(screen.getByText(/50/)).toBeDefined();
  });

  it('should show SOUTH label in red when Bz is negative', () => {
    render(
      <CurrentConditions
        kpIndex={{ current: { value: 2, timeTag: '' }, forecast: null }}
        solarWind={{ current: { speed: 400, density: 5, temperature: 100000, bz: -6, bt: 6 }, trend: 'stable' }}
        xrayFlux={null}
        sunspots={null}
        auroraForecast={null}
      />
    );

    const southLabel = screen.getByText('SOUTH');
    expect(southLabel).toBeDefined();
    expect(southLabel.className).toContain('text-red');
  });
});
