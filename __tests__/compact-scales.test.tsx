/**
 * Unit tests for CompactScales component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import CompactScales from '@/components/space-weather/CompactScales';

describe('CompactScales', () => {
  it('should render R, S, and G scale values with labels when data is provided', () => {
    const data = {
      R: { scale: 0, text: 'None', description: 'No radio blackouts' },
      S: { scale: 1, text: 'Minor', description: 'Minor solar radiation' },
      G: { scale: 3, text: 'Strong', description: 'Strong geomagnetic storm' },
    };

    render(<CompactScales data={data} />);

    expect(screen.getByText(/R:/)).toBeDefined();
    expect(screen.getByText(/S:/)).toBeDefined();
    expect(screen.getByText(/G:/)).toBeDefined();
    expect(screen.getByText('NONE')).toBeDefined();
    expect(screen.getByText('MINOR')).toBeDefined();
    expect(screen.getByText('STRONG')).toBeDefined();
  });

  it('keeps all scale slots visible as unavailable when data is missing', () => {
    render(<CompactScales data={null} />);
    expect(screen.getAllByText('UNAVAILABLE')).toHaveLength(3);
    expect(screen.queryByText('NONE')).not.toBeInTheDocument();
    expect(screen.getByText('R:')).toBeInTheDocument();
    expect(screen.getByText('S:')).toBeInTheDocument();
    expect(screen.getByText('G:')).toBeInTheDocument();
  });

  it('labels moderate and extreme conditions without relying on color', () => {
    render(<CompactScales data={{
      R: { scale: 0, text: 'None', description: '' },
      S: { scale: 2, text: 'Moderate', description: '' },
      G: { scale: 5, text: 'Extreme', description: '' },
    }} />);
    expect(screen.getByText('MODERATE')).toBeInTheDocument();
    expect(screen.getByText('EXTREME')).toBeInTheDocument();
  });
});
