/**
 * Unit tests for AirQualityDisplay pollutant breakdown
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AirQualityDisplay } from '@/components/air-quality-display';

describe('AirQualityDisplay', () => {
  it('should render pollutant breakdown when pollutants are provided', () => {
    render(
      <AirQualityDisplay
        aqi={42}
        theme="nord"
        pollutants={{
          pm2_5: 10.2,
          pm10: 18.5,
          ozone: 68.5,
          nitrogen_dioxide: 12.1,
          sulphur_dioxide: 3.4,
          carbon_monoxide: 201.3,
        }}
      />
    );

    expect(screen.getByText('PM2.5')).toBeDefined();
    expect(screen.getByText('10.2')).toBeDefined();
    expect(screen.getByText('PM10')).toBeDefined();
    expect(screen.getByText('18.5')).toBeDefined();
    expect(screen.getByText(/O₃/)).toBeDefined();
    expect(screen.getByText('68.5')).toBeDefined();
  });
});

  it.each([NaN, Infinity, -1])('shows unavailable AQI without an invented health rating: %s', (aqi) => {
    render(<AirQualityDisplay aqi={aqi} theme="clear-sky" pollutants={{ pm2_5: 0, pm10: NaN }} />);
    expect(screen.getByText('Air quality unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Hazardous|satisfactory|emergency conditions/)).not.toBeInTheDocument();
    expect(screen.getByText('PM2.5')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('PM10')).not.toBeInTheDocument();
  });
