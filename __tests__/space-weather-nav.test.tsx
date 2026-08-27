/**
 * Unit tests for SpaceWeatherNav component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import SpaceWeatherNav from '@/components/space-weather/SpaceWeatherNav';

describe('SpaceWeatherNav', () => {
  it('should render all 5 navigation tabs', () => {
    render(<SpaceWeatherNav activeTab="command" onTabChange={jest.fn()} />);

    expect(screen.getByText(/Command Center/)).toBeDefined();
    expect(screen.getByText('Solar Activity')).toBeDefined();
    expect(screen.getByText('Geomagnetic')).toBeDefined();
    expect(screen.getByText('Solar Wind')).toBeDefined();
    expect(screen.getByText('Alerts')).toBeDefined();
  });

  it('should mark the active tab with aria-selected true', () => {
    render(<SpaceWeatherNav activeTab="solar" onTabChange={jest.fn()} />);

    const solarTab = screen.getByRole('tab', { name: /solar activity/i });
    expect(solarTab.getAttribute('aria-selected')).toBe('true');

    const commandTab = screen.getByRole('tab', { name: /command center/i });
    expect(commandTab.getAttribute('aria-selected')).toBe('false');
  });

  it('should call onTabChange with the correct tab ID when clicked', () => {
    const mockOnTabChange = jest.fn();
    render(<SpaceWeatherNav activeTab="command" onTabChange={mockOnTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /geomagnetic/i }));
    expect(mockOnTabChange).toHaveBeenCalledWith('geomagnetic');
  });

  it('should apply terminal styling with font-mono and uppercase classes on active tab', () => {
    const { container } = render(<SpaceWeatherNav activeTab="command" onTabChange={jest.fn()} />);

    const activeButton = screen.getByRole('tab', { name: /command center/i });
    expect(activeButton.className).toContain('font-mono');
    expect(activeButton.className).toContain('uppercase');
    expect(activeButton.className).toContain('border-cyan-400');
  });
});
