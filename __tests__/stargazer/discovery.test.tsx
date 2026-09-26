import { fireEvent, render, screen } from '@testing-library/react';
import CatalogBrowser from '@/components/stargazer/CatalogBrowser';
import SkyFindingDiagram from '@/components/stargazer/SkyFindingDiagram';
import { matchesCatalogFilters } from '@/lib/stargazer/catalog';
import catalog from '@/data/deep-sky-catalog.json';
import type { DeepSkyObject } from '@/lib/stargazer/types';

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
const objects = catalog as DeepSkyObject[];
it('searches aliases without case sensitivity and combines filters', () => {
  window.history.replaceState(null, '', '/stargazer/objects?lat=-33.87&lon=151.21&q=Sydney&equipment=binoculars&from=start');
  render(<CatalogBrowser objects={objects} />);
  expect(screen.getByText('151 of 151 objects')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'seven sisters' } });
  expect(screen.getByText('1 of 151 objects')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /M45/ })).toHaveAttribute('href', expect.stringContaining('q=Sydney'));
  fireEvent.change(screen.getByLabelText('Object type'), { target: { value: 'spiral_galaxy' } });
  expect(screen.getByText(/No objects match/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByText('151 of 151 objects')).toBeInTheDocument();
});
it('does not treat unknown equipment metadata as a match or override reviewed guidance', () => {
  const unknown = { ...objects[0], id: 'unknown', nakedEyeVisible: undefined, binocularTarget: undefined, telescopeMinAperture: undefined };
  expect(matchesCatalogFilters(unknown, '', 'all', 'eyes')).toBe(false);
  expect(matchesCatalogFilters(unknown, '', 'all', 'telescope')).toBe(false);
  expect(matchesCatalogFilters(unknown, '', 'all', 'all')).toBe(true);
  expect(matchesCatalogFilters(objects.find(o => o.id === 'M13')!, '', 'all', 'binoculars')).toBe(false);
});
it('provides direction and height without relying on the diagram', () => {
  const { rerender } = render(<SkyFindingDiagram position={{ azimuth: 135, altitude: 45 }} />);
  expect(screen.getByText(/Face southeast; look about halfway/)).toBeInTheDocument();
  expect(screen.getByLabelText('Finding diagram')).toHaveAttribute('aria-hidden', 'true');
  rerender(<SkyFindingDiagram position={{ azimuth: 135, altitude: 89 }} />);
  expect(screen.getByText('Nearly overhead.')).toBeInTheDocument();
  expect(screen.queryByText(/Face southeast/)).not.toBeInTheDocument();
});
