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

  it('should render nothing when data is null', () => {
    const { container } = render(<CompactScales data={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('should apply color coding based on scale severity', () => {
    const data = {
      R: { scale: 0, text: 'None', description: '' },
      S: { scale: 2, text: 'Moderate', description: '' },
      G: { scale: 5, text: 'Extreme', description: '' },
    };

    const { container } = render(<CompactScales data={data} />);

    // Green for 0, yellow for 1-2, red for 4-5
    const scaleItems = container.querySelectorAll('[data-scale]');
    expect(scaleItems[0].className).toContain('text-green');
    expect(scaleItems[1].className).toContain('text-yellow');
    expect(scaleItems[2].className).toContain('text-red');
  });
});
