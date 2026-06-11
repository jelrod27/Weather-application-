/**
 * Smoke tests for the Navigation component.
 * Covers: header location formatting, mobile menu toggle, and no-location render.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// All mocks must be declared before the component import.
jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('@/components/theme-provider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('@/lib/theme-utils', () => ({ getComponentStyles: () => ({}) }));
jest.mock('@/components/auth/auth-button', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/wis-badge', () => ({ __esModule: true, default: () => null }));

import Navigation from '@/components/navigation';

describe('Navigation', () => {
  it('shows formatted location and rounded temperature in the header', () => {
    render(
      <Navigation
        weatherLocation="San Ramon, California, US"
        weatherTemperature={72.6}
        weatherUnit="°F"
      />
    );

    // Desktop header renders "San Ramon, CA" as text node
    expect(screen.getAllByText(/San Ramon, CA/).length).toBeGreaterThan(0);
    // Temperature is Math.round(72.6) = 73, weatherUnit '°F' → 'F' suffix.
    // The span renders "73", "°", "F" as separate text nodes, so query for the span's text content.
    expect(screen.getAllByText(/73/).length).toBeGreaterThan(0);
  });

  it('toggles the mobile menu open and closed', () => {
    render(
      <Navigation
        weatherLocation="Seattle, WA, US"
        weatherTemperature={55}
        weatherUnit="°F"
      />
    );

    // Mobile menu is closed initially
    expect(
      screen.queryByRole('navigation', { name: /Mobile navigation/i })
    ).toBeNull();

    // Open it
    fireEvent.click(screen.getByLabelText('Toggle navigation menu'));
    const mobileMenu = screen.getByRole('navigation', { name: /Mobile navigation/i });
    expect(mobileMenu).toBeDefined();
    // The mobile menu lists all nav items; HOME appears in both desktop and mobile, so use getAllByText
    expect(screen.getAllByText('HOME').length).toBeGreaterThan(0);

    // Close it again
    fireEvent.click(screen.getByLabelText('Toggle navigation menu'));
    expect(
      screen.queryByRole('navigation', { name: /Mobile navigation/i })
    ).toBeNull();
  });

  it('renders no temperature badge when no location/temperature is provided', () => {
    render(<Navigation />);
    expect(screen.queryByText(/°F|°C/)).toBeNull();
  });
});
