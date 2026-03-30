export type Theme = 'light' | 'dark';
export type SheetSnap = 'collapsed' | 'mid' | 'expanded';
export type SearchQuery = string;
export type QuickFilterKey = 'today' | 'active' | 'upcoming' | 'nearby';

export type LatLngTuple = [number, number];

export interface RouteMarker {
  label: string;
  point: LatLngTuple;
}

export interface RouteSourceMeta {
  type?: string;
  label?: string;
  title?: string;
  url?: string;
}

export interface RouteGeometry {
  matchedKey: string;
  source: 'override' | 'geometry';
  path: LatLngTuple[];
  markers: RouteMarker[];
  sourceMeta?: RouteSourceMeta;
}

export interface MatchInfo {
  strategy: 'exact' | 'fuzzy' | 'none';
  confidence: number;
  matchedKey?: string;
}

export interface Procession {
  id: string;
  slug: string;
  dayLabel: string;
  date: string;
  title: string;
  type: string;
  organizer: string;
  start: string;
  time: string;
  startTime: string;
  endTime: string;
  description: string;
  routeLabels: string[];
  officialSourceUrl?: string;
  officialMapUrl?: string;
  officialItinerary?: string;
  colorLight: string;
  colorDark: string;
  geometry: RouteGeometry | null;
  hasGeometry: boolean;
  matching: MatchInfo;
}

export type ProcessionStatus = 'upcoming' | 'active' | 'finished';
export type ProcessionSheetSortBucket = 'live-trackable' | 'upcoming-trackable' | 'other-trackable' | 'no-geometry';

export interface ProcessionSheetItem {
  id: string;
  processionId: string;
  title: string;
  timeLabel: string;
  subtitle: string;
  status: ProcessionStatus;
  isTrackable: boolean;
  isSelected: boolean;
  sortBucket: ProcessionSheetSortBucket;
  accentColor: string;
  mapLabel: string;
  distanceMeters?: number;
}

export const PROCESSION_STATUS_LABELS: Record<ProcessionStatus, string> = {
  active: 'En directo',
  upcoming: 'Próxima',
  finished: 'Finalizada',
};

export const PROCESSION_MAP_LABELS = {
  trackable: 'En mapa',
  missingGeometry: 'Sin recorrido disponible',
} as const;
