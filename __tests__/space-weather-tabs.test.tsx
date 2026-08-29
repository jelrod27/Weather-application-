/**
 * Unit tests for Space Weather Tab components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/dynamic to render a simple placeholder
jest.mock('next/dynamic', () => {
  return (loader: () => Promise<any>) => {
    // Return a component that renders a div with a data-testid
    const DynamicComponent = (props: any) => <div data-testid="dynamic-component" {...props} />;
    DynamicComponent.displayName = 'DynamicComponent';
    return DynamicComponent;
  };
});

const mockProps = {
  scales: null,
  alerts: [],
  kpIndex: null,
  solarWind: null,
  sunspots: null,
  xrayFlux: null,
  auroraForecast: null,
  isLoading: false,
};

describe('CommandCenterTab', () => {
  it('should render without crashing', async () => {
    const CommandCenterTab = (await import('@/components/space-weather/tabs/CommandCenterTab')).default;
    const { container } = render(<CommandCenterTab {...mockProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('should display current conditions text', async () => {
    const CommandCenterTab = (await import('@/components/space-weather/tabs/CommandCenterTab')).default;
    render(<CommandCenterTab {...mockProps} />);
    expect(screen.getByText('Current Conditions')).not.toBeNull();
  });

  it('should show alert count when alerts exist', async () => {
    const CommandCenterTab = (await import('@/components/space-weather/tabs/CommandCenterTab')).default;
    const alerts = [{ id: '1', message: 'test alert', severity: 'warning', issued: '2025-01-01' }];
    render(<CommandCenterTab {...mockProps} alerts={alerts as any} />);
    expect(screen.getByText('1')).not.toBeNull();
  });
});

describe('SolarActivityTab', () => {
  it('should render without crashing', async () => {
    const SolarActivityTab = (await import('@/components/space-weather/tabs/SolarActivityTab')).default;
    const { container } = render(<SolarActivityTab xrayFlux={null} sunspots={null} isLoading={false} />);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('GeomagneticTab', () => {
  it('should render without crashing', async () => {
    const GeomagneticTab = (await import('@/components/space-weather/tabs/GeomagneticTab')).default;
    const { container } = render(<GeomagneticTab kpIndex={null} auroraForecast={null} isLoading={false} />);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('SolarWindTab', () => {
  it('should render without crashing', async () => {
    const SolarWindTab = (await import('@/components/space-weather/tabs/SolarWindTab')).default;
    const { container } = render(<SolarWindTab solarWind={null} isLoading={false} />);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('AlertsForecastTab', () => {
  it('should render without crashing', async () => {
    const AlertsForecastTab = (await import('@/components/space-weather/tabs/AlertsForecastTab')).default;
    const { container } = render(<AlertsForecastTab scales={null} alerts={[]} kpIndex={null} isLoading={false} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('should show ALL CLEAR when no alerts', async () => {
    const AlertsForecastTab = (await import('@/components/space-weather/tabs/AlertsForecastTab')).default;
    render(<AlertsForecastTab scales={null} alerts={[]} kpIndex={null} isLoading={false} />);
    expect(screen.getByText('ALL CLEAR')).not.toBeNull();
  });

  it('should show alert count in header', async () => {
    const AlertsForecastTab = (await import('@/components/space-weather/tabs/AlertsForecastTab')).default;
    const alerts = [{ id: '1', message: 'test', severity: 'warning', issued: '2025-01-01' }];
    render(<AlertsForecastTab scales={null} alerts={alerts as any} kpIndex={null} isLoading={false} />);
    expect(screen.getByText('Active Alerts (1)')).not.toBeNull();
  });
});
