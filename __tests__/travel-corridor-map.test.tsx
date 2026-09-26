import { act, render, screen } from '@testing-library/react';
import OLMap from 'ol/Map';
import TravelCorridorMap from '@/components/travel/TravelCorridorMap';
import type { ComponentProps } from 'react';

const mockHandlers = new Map<string, (event: { pixel: number[] }) => void>();
const mockAddLayer = jest.fn();
const mockRemoveLayer = jest.fn();
const mockDispose = jest.fn();
jest.mock('ol/Map', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    on: (event: string, handler: (event: { pixel: number[] }) => void) => mockHandlers.set(event, handler),
    addLayer: mockAddLayer,
    removeLayer: mockRemoveLayer,
    dispose: mockDispose,
    updateSize: jest.fn(),
    setTarget: jest.fn(),
    forEachFeatureAtPixel: (_pixel: unknown, callback: (feature: { getProperties: () => Record<string, unknown> }) => unknown) => callback({
      getProperties: () => ({ corridorName: 'I-25', corridorScore: 80, corridorLevel: 'red', corridorColor: '#ff0000', corridorHazard: 'Heavy snow' }),
    }),
  })),
}));
jest.mock('ol/View', () => jest.fn());
jest.mock('ol/layer/Tile', () => jest.fn());
jest.mock('ol/source/XYZ', () => jest.fn());
jest.mock('ol/layer/Vector', () => jest.fn());
jest.mock('ol/source/Vector', () => jest.fn());
jest.mock('ol/proj', () => ({ fromLonLat: (coordinates: number[]) => coordinates }));
jest.mock('ol/style', () => ({ Style: jest.fn(), Stroke: jest.fn() }));
jest.mock('ol/Feature', () => jest.fn(() => ({ setStyle: jest.fn() })));
jest.mock('ol/geom/LineString', () => jest.fn());

const corridors: ComponentProps<typeof TravelCorridorMap>['corridors'] = [{
  name: 'I-25', score: 80, level: 'red', color: '#ff0000', hazard: 'Heavy snow',
  path: [[-105, 39], [-104, 40]], segments: [],
}];

const originalResizeObserver = global.ResizeObserver;
beforeAll(() => {
  global.ResizeObserver = class implements ResizeObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  };
});
afterAll(() => { global.ResizeObserver = originalResizeObserver; });

describe('travel map forecast changes', () => {
  it('keeps the map mounted while clearing old hazards and the popup when the next day has no readings', () => {
    const { rerender, unmount } = render(<TravelCorridorMap corridors={corridors} isLoading={false} />);
    act(() => mockHandlers.get('click')?.({ pixel: [120, 200] }));
    expect(screen.getByText('Heavy snow')).toBeInTheDocument();

    rerender(<TravelCorridorMap corridors={[]} isLoading />);
    expect(mockRemoveLayer).toHaveBeenCalledWith(mockAddLayer.mock.calls[0][0]);
    expect(screen.queryByText('Heavy snow')).not.toBeInTheDocument();
    rerender(<TravelCorridorMap corridors={[]} isLoading={false} />);
    expect(OLMap).toHaveBeenCalledTimes(1);
    expect(mockDispose).not.toHaveBeenCalled();

    rerender(<TravelCorridorMap corridors={corridors} isLoading={false} />);
    expect(mockAddLayer).toHaveBeenCalledTimes(2);
    expect(OLMap).toHaveBeenCalledTimes(1);
    unmount();
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });
});
