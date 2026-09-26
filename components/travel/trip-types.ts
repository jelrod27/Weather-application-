/**
 * Shared types for the Trip Planner UI.
 *
 * The `/api/travel/trip-score` endpoint returns one of two discriminated shapes
 * depending on `mode`. These types let `<TripInput>`, `<TripScoreCard>`, and any
 * future trip widgets agree on the response contract without re-declaring it.
 */

import type { MiseryScore } from '@/lib/services/misery-score-service';

export type TripMode = 'fly' | 'drive';
export type TripDay = 0 | 1 | 2;

export const TRIP_DAY_LABELS: Record<TripDay, string> = {
  0: 'Today',
  1: 'Tomorrow',
  2: 'Day 3',
};

export interface TripInputs {
  mode: TripMode;
  day: TripDay;
  origin: string;
  destination: string;
}

export interface DriveSegment {
  lat: number;
  lon: number;
  score: MiseryScore;
  hazard: string;
}

export interface DriveWorstSegment extends DriveSegment {
  nearestPlace?: string;
}

export interface TripEndpointPoint {
  lat: number;
  lon: number;
  label?: string;
}

export interface DriveTripScore {
  mode: 'drive';
  score: MiseryScore;
  route: {
    corridorName: string;
    segments: DriveSegment[];
    origin?: TripEndpointPoint;
    destination?: TripEndpointPoint;
  };
  worstSegment: DriveWorstSegment;
  /** Unavailable until hourly route/departure scoring exists. */
  peakWindow?: null;
}

export interface FlyAirportInfo {
  iata: string;
  city: string;
}

export interface FlyTripScore {
  mode: 'fly';
  score: MiseryScore;
  route: {
    origin: { airport: FlyAirportInfo; score: MiseryScore };
    destination: { airport: FlyAirportInfo; score: MiseryScore };
    enroute: { score: MiseryScore; midpoint: { lat: number; lon: number } };
  };
}

export type TripScoreResponse = DriveTripScore | FlyTripScore;
