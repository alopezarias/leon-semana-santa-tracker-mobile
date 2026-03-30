import rawProcessions from '../../processions.json';
import rawGeometry from '../../route-geometry.json';
import rawOverrides from '../../route-overrides.json';
import type {
  LatLngTuple,
  MatchInfo,
  Procession,
  QuickFilterKey,
  ProcessionSheetItem,
  ProcessionSheetSortBucket,
  ProcessionStatus,
  RouteGeometry,
  RouteMarker,
  RouteSourceMeta,
  SearchQuery,
  Theme,
} from '../types/procession';
import { PROCESSION_MAP_LABELS } from '../types/procession';

interface RawProcession {
  day: string;
  slug: string;
  title: string;
  type: string;
  time: string;
  organizer: string;
  start: string;
  description: string;
  route: string[];
  officialSourceUrl?: string;
  officialMapUrl?: string;
  officialItinerary?: string;
}

interface RawGeometryItem {
  path?: number[][];
  markers?: Array<{ label: string; point: number[] }>;
  source?: RouteSourceMeta;
}

const MONTHS: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

const TITLE_STOPWORDS = new Set([
  'acto',
  'caballo',
  'cofradia',
  'con',
  'cristo',
  'cruz',
  'de',
  'del',
  'el',
  'en',
  'extraordinario',
  'la',
  'las',
  'los',
  'oficial',
  'procesion',
  'santo',
  'solemne',
  'tradicional',
  'via',
  'y',
]);

const MATCH_ALIASES: Record<string, string> = {
  '1-de-abril-miercoles-santo-xiii-concierto-de-semana-santa-y-ronda-lirico-pasional-luis-pastrana-gimenez': '1-de-abril-miercoles-santo-concierto-y-ronda-lirico-pasional',
  '1-de-abril-miercoles-santo-solemne-via-crucis-procesional': '1-de-abril-miercoles-santo-via-crucis-procesional-de-las-siete-palabras',
  '2-de-abril-jueves-santo-pregon-a-caballo-de-la-cofradia-las-siete-palabras-de-jesus-en-la-cruz': '2-de-abril-jueves-santo-pregon-a-caballo',
  '2-de-abril-jueves-santo-tradicional-ronda-de-la-cofradia-del-dulce-nombre-de-jesus-nazareno': '2-de-abril-jueves-santo-tradicional-ronda',
  '3-de-abril-viernes-santo-adoracion-de-la-cruz-y-desvelado-del-santo-cristo-del-desenclavo': '3-de-abril-viernes-santo-oficios-de-la-pasion-y-desvelado-del-desenclavo',
};

const geometryItems = ((rawGeometry as unknown) as { items: Record<string, RawGeometryItem> }).items;
const overrideItems = ((rawOverrides as unknown) as { items: Record<string, RawGeometryItem> }).items;
const currentYear = new Date().getFullYear();

export const normalizeText = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/["“”'‘’·]/g, ' ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const tokenizeTitle = (value: string) => normalizeText(value)
  .split('-')
  .filter((token) => token && !TITLE_STOPWORDS.has(token));

const buildProcessionKey = (item: RawProcession) => `${normalizeText(item.day)}-${normalizeText(item.title)}`;

const parseDayLabelToIsoDate = (dayLabel: string) => {
  const [datePart] = dayLabel.split('·').map((part) => part.trim());
  const match = datePart.match(/^(\d{1,2})\s+de\s+([a-záéíóú]+)/i);

  if (!match) {
    return `${currentYear}-01-01`;
  }

  const day = match[1].padStart(2, '0');
  const month = MONTHS[normalizeText(match[2])];
  return `${currentYear}-${month}-${day}`;
};

const minutesToTime = (minutes: number) => {
  const safeMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(safeMinutes / 60).toString().padStart(2, '0');
  const mins = Math.floor(safeMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
};

const parseTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
};

const haversineMeters = ([lat1, lng1]: LatLngTuple, [lat2, lng2]: LatLngTuple) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getNearestProcessionDistance = (procession: Procession, userLocation: LatLngTuple) => {
  const geometryPoints = [
    ...(procession.geometry?.path ?? []),
    ...(procession.geometry?.markers.map((marker) => marker.point) ?? []),
  ];

  if (!geometryPoints.length) {
    return null;
  }

  return geometryPoints.reduce((closestDistance, point) => {
    const pointDistance = haversineMeters(userLocation, point);
    return Math.min(closestDistance, pointDistance);
  }, Number.POSITIVE_INFINITY);
};

const estimateEndTime = (item: RawProcession, geometry: RouteGeometry | null) => {
  const startMinutes = parseTimeToMinutes(item.time);

  if (item.route.length === 0) {
    return minutesToTime(startMinutes + 60);
  }

  const routeDistance = geometry?.path?.reduce((total, point, index, path) => {
    if (index === 0) return total;
    return total + haversineMeters(path[index - 1], point);
  }, 0) ?? 0;

  const estimatedMinutes = routeDistance > 0
    ? Math.max(50, Math.round((routeDistance / 1000 / 3.2) * 60) + 20)
    : Math.max(50, item.route.length * 5);

  return minutesToTime(startMinutes + estimatedMinutes);
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildColors = (seed: string) => {
  const hue = hashString(seed) % 360;
  return {
    colorLight: `hsl(${hue} 72% 40%)`,
    colorDark: `hsl(${hue} 82% 67%)`,
  };
};

const diceCoefficient = (left: string, right: string) => {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const pairs = (value: string) => {
    const result: string[] = [];
    for (let index = 0; index < value.length - 1; index += 1) {
      result.push(value.slice(index, index + 2));
    }
    return result;
  };

  const leftPairs = pairs(left);
  const counts = new Map<string, number>();
  for (const pair of pairs(right)) {
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }

  let matches = 0;
  for (const pair of leftPairs) {
    const count = counts.get(pair) ?? 0;
    if (count > 0) {
      matches += 1;
      counts.set(pair, count - 1);
    }
  }

  return (2 * matches) / (leftPairs.length + pairs(right).length);
};

const tokenOverlap = (left: string[], right: string[]) => {
  if (!left.length || !right.length) return 0;

  const rightSet = new Set(right);
  const shared = left.filter((token) => rightSet.has(token)).length;
  return shared / Math.max(left.length, right.length);
};

const sanitizeMarkers = (markers?: RawGeometryItem['markers']): RouteMarker[] => markers
  ?.filter((marker) => Array.isArray(marker.point) && marker.point.length === 2)
  .map((marker) => ({
    label: marker.label,
    point: [Number(marker.point[0]), Number(marker.point[1])] as LatLngTuple,
  })) ?? [];

const sanitizePath = (path?: RawGeometryItem['path']): LatLngTuple[] => path
  ?.filter((point) => Array.isArray(point) && point.length === 2)
  .map((point) => [Number(point[0]), Number(point[1])] as LatLngTuple) ?? [];

const resolveGeometry = (item: RawProcession): { geometry: RouteGeometry | null; matching: MatchInfo } => {
  const exactKey = buildProcessionKey(item);
  const aliasKey = MATCH_ALIASES[exactKey];
  const sameDayKeys = Array.from(new Set([
    ...Object.keys(overrideItems),
    ...Object.keys(geometryItems),
  ].filter((key) => key.startsWith(`${normalizeText(item.day)}-`))));

  if (aliasKey && (overrideItems[aliasKey] || geometryItems[aliasKey])) {
    const source = overrideItems[aliasKey] ? 'override' : 'geometry';
    const rawItem = overrideItems[aliasKey] ?? geometryItems[aliasKey];

    return {
      geometry: {
        matchedKey: aliasKey,
        source,
        path: sanitizePath(rawItem.path),
        markers: sanitizeMarkers(rawItem.markers),
        sourceMeta: rawItem.source,
      },
      matching: { strategy: 'fuzzy', confidence: 0.99, matchedKey: aliasKey },
    };
  }

  if (overrideItems[exactKey] || geometryItems[exactKey]) {
    const source = overrideItems[exactKey] ? 'override' : 'geometry';
    const rawItem = overrideItems[exactKey] ?? geometryItems[exactKey];

    return {
      geometry: {
        matchedKey: exactKey,
        source,
        path: sanitizePath(rawItem.path),
        markers: sanitizeMarkers(rawItem.markers),
        sourceMeta: rawItem.source,
      },
      matching: { strategy: 'exact', confidence: 1, matchedKey: exactKey },
    };
  }

  const normalizedTitle = normalizeText(item.title);
  const titleTokens = tokenizeTitle(item.title);

  const rankedCandidates = sameDayKeys
    .map((key) => {
      const candidateTitle = key.replace(`${normalizeText(item.day)}-`, '');
      const candidateTokens = tokenizeTitle(candidateTitle);
      const overlap = tokenOverlap(titleTokens, candidateTokens);
      const dice = diceCoefficient(normalizedTitle, candidateTitle);
      const containsBonus = normalizedTitle.includes(candidateTitle) || candidateTitle.includes(normalizedTitle) ? 0.12 : 0;
      const score = (overlap * 0.65) + (dice * 0.35) + containsBonus;

      return { key, score };
    })
    .sort((left, right) => right.score - left.score);

  const bestCandidate = rankedCandidates[0];
  const nextCandidateScore = rankedCandidates[1]?.score ?? 0;
  const isConfident = bestCandidate && bestCandidate.score >= 0.72 && (bestCandidate.score - nextCandidateScore) >= 0.08;

  if (!isConfident || !bestCandidate) {
    return {
      geometry: null,
      matching: { strategy: 'none', confidence: bestCandidate?.score ?? 0 },
    };
  }

  const source = overrideItems[bestCandidate.key] ? 'override' : 'geometry';
  const rawItem = overrideItems[bestCandidate.key] ?? geometryItems[bestCandidate.key];

  return {
    geometry: {
      matchedKey: bestCandidate.key,
      source,
      path: sanitizePath(rawItem.path),
      markers: sanitizeMarkers(rawItem.markers),
      sourceMeta: rawItem.source,
    },
    matching: { strategy: 'fuzzy', confidence: Number(bestCandidate.score.toFixed(3)), matchedKey: bestCandidate.key },
  };
};

export const processions: Procession[] = (rawProcessions as RawProcession[])
  .map((item) => {
    const { geometry, matching } = resolveGeometry(item);
    const colors = buildColors(`${item.slug}-${item.type}`);

    return {
      id: `${item.slug}-${normalizeText(item.title)}`,
      slug: item.slug,
      dayLabel: item.day,
      date: parseDayLabelToIsoDate(item.day),
      title: item.title,
      type: item.type,
      organizer: item.organizer,
      start: item.start,
      time: item.time,
      startTime: item.time,
      endTime: estimateEndTime(item, geometry),
      description: item.description,
      routeLabels: item.route,
      officialSourceUrl: item.officialSourceUrl,
      officialMapUrl: item.officialMapUrl,
      officialItinerary: item.officialItinerary,
      colorLight: colors.colorLight,
      colorDark: colors.colorDark,
      geometry,
      hasGeometry: Boolean(geometry?.path.length),
      matching,
    };
  })
  .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));

export const getProcessionStatus = (procession: Procession, currentTime: Date): ProcessionStatus => {
  const start = new Date(`${procession.date}T${procession.startTime}:00`);
  let end = new Date(`${procession.date}T${procession.endTime}:00`);

  if (end < start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  if (currentTime < start) return 'upcoming';
  if (currentTime > end) return 'finished';
  return 'active';
};

export const matchesProcessionSearch = (procession: Procession, query: SearchQuery) => {
  const normalizedQuery = normalizeText(query).trim();

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    procession.title,
    procession.organizer,
    procession.dayLabel,
    procession.start,
    ...procession.routeLabels,
  ].map(normalizeText);

  return haystack.some((value) => value.includes(normalizedQuery));
};

export const getQuickFilterProcessions = ({
  items,
  quickFilter,
  currentTime,
  today,
  userLocation,
}: {
  items: Procession[];
  quickFilter: QuickFilterKey | null;
  currentTime: Date;
  today: string;
  userLocation: LatLngTuple | null;
}) => {
  if (!quickFilter) {
    return { items, fallbackReason: null as string | null };
  }

  if (quickFilter === 'today') {
    return {
      items: items.filter((procession) => procession.date === today),
      fallbackReason: null as string | null,
    };
  }

  if (quickFilter === 'active' || quickFilter === 'upcoming') {
    return {
      items: items.filter((procession) => getProcessionStatus(procession, currentTime) === quickFilter),
      fallbackReason: null as string | null,
    };
  }

  if (!userLocation) {
    return {
      items,
      fallbackReason: 'Activa tu ubicación para ordenar por cercanía.',
    };
  }

  const nearbyItems = items
    .map((procession) => ({
      procession,
      distanceMeters: getNearestProcessionDistance(procession, userLocation),
    }))
    .filter((item) => item.distanceMeters !== null)
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  return {
    items: nearbyItems.map(({ procession }) => procession),
    fallbackReason: nearbyItems.length ? null as string | null : 'No hay recorridos con geometría suficiente para calcular cercanía.',
  };
};

export const getVisibleProcessions = ({
  items,
  query,
  quickFilter,
  currentTime,
  today,
  userLocation,
}: {
  items: Procession[];
  query: SearchQuery;
  quickFilter: QuickFilterKey | null;
  currentTime: Date;
  today: string;
  userLocation: LatLngTuple | null;
}) => {
  const searchedItems = items.filter((procession) => matchesProcessionSearch(procession, query));
  const { items: filteredItems, fallbackReason } = getQuickFilterProcessions({
    items: searchedItems,
    quickFilter,
    currentTime,
    today,
    userLocation,
  });

  return {
    items: filteredItems,
    fallbackReason,
  };
};

export const getQuickFilterDistanceMap = ({
  items,
  quickFilter,
  userLocation,
}: {
  items: Procession[];
  quickFilter: QuickFilterKey | null;
  userLocation: LatLngTuple | null;
}) => {
  if (quickFilter !== 'nearby' || !userLocation) {
    return new Map<string, number>();
  }

  return new Map(
    items
      .map((procession) => {
        const distanceMeters = getNearestProcessionDistance(procession, userLocation);
        return distanceMeters === null ? null : [procession.id, distanceMeters] as const;
      })
      .filter((entry): entry is readonly [string, number] => entry !== null),
  );
};

export const getRouteBounds = (items: Procession[]) => {
  const points = items.flatMap((item) => item.geometry?.path ?? []);

  if (!points.length) {
    return null;
  }

  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);

  return {
    southWest: [Math.min(...lats), Math.min(...lngs)] as LatLngTuple,
    northEast: [Math.max(...lats), Math.max(...lngs)] as LatLngTuple,
  };
};

export const getInterpolatedPosition = (path: LatLngTuple[], progress: number): LatLngTuple | null => {
  if (path.length === 0) return null;
  if (path.length === 1) return path[0];

  const distances = path.slice(1).map((point, index) => haversineMeters(path[index], point));
  const totalDistance = distances.reduce((sum, value) => sum + value, 0);

  if (totalDistance === 0) {
    return path[0];
  }

  const targetDistance = totalDistance * Math.max(0, Math.min(1, progress));
  let accumulated = 0;

  for (let index = 0; index < distances.length; index += 1) {
    const segmentDistance = distances[index];
    if ((accumulated + segmentDistance) >= targetDistance) {
      const ratio = (targetDistance - accumulated) / segmentDistance;
      const [startLat, startLng] = path[index];
      const [endLat, endLng] = path[index + 1];

      return [
        startLat + ((endLat - startLat) * ratio),
        startLng + ((endLng - startLng) * ratio),
      ];
    }

    accumulated += segmentDistance;
  }

  return path[path.length - 1];
};

const getSheetSortBucket = (procession: Procession, status: ProcessionStatus): ProcessionSheetSortBucket => {
  if (!procession.hasGeometry) {
    return 'no-geometry';
  }

  if (status === 'active') {
    return 'live-trackable';
  }

  if (status === 'upcoming') {
    return 'upcoming-trackable';
  }

  return 'other-trackable';
};

const sortBucketPriority: Record<ProcessionSheetSortBucket, number> = {
  'live-trackable': 0,
  'upcoming-trackable': 1,
  'other-trackable': 2,
  'no-geometry': 3,
};

const getProcessionTimestamp = (procession: Procession) => new Date(`${procession.date}T${procession.startTime}:00`).getTime();

export const getProcessionAccentColor = (procession: Procession, theme: Theme) => (
  theme === 'dark' ? procession.colorDark : procession.colorLight
);

export const getProcessionSheetSubtitle = (procession: Procession) => procession.organizer || `Sale de ${procession.start}`;

export const getProcessionTimeLabel = (procession: Procession) => `${procession.startTime} · ${procession.endTime}`;

export const getDefaultSelectedProcessionId = (items: Procession[], currentTime: Date) => {
  const byPriority = [...items].sort((left, right) => getProcessionTimestamp(left) - getProcessionTimestamp(right));

  const activeTrackable = byPriority.find((item) => item.hasGeometry && getProcessionStatus(item, currentTime) === 'active');
  if (activeTrackable) {
    return activeTrackable.id;
  }

  const upcomingTrackable = byPriority.find((item) => item.hasGeometry && getProcessionStatus(item, currentTime) === 'upcoming');
  return upcomingTrackable?.id ?? null;
};

export const getProcessionSheetItems = ({
  items,
  currentTime,
  selectedProcessionId,
  theme,
  distanceByProcessionId,
}: {
  items: Procession[];
  currentTime: Date;
  selectedProcessionId: string | null;
  theme: Theme;
  distanceByProcessionId?: Map<string, number>;
}): ProcessionSheetItem[] => {
  return [...items]
    .map((procession) => {
      const status = getProcessionStatus(procession, currentTime);

      return {
        id: `sheet-${procession.id}`,
        processionId: procession.id,
        title: procession.title,
        timeLabel: getProcessionTimeLabel(procession),
        subtitle: getProcessionSheetSubtitle(procession),
        status,
        isTrackable: procession.hasGeometry,
        isSelected: selectedProcessionId === procession.id,
        sortBucket: getSheetSortBucket(procession, status),
        accentColor: getProcessionAccentColor(procession, theme),
        mapLabel: procession.hasGeometry ? PROCESSION_MAP_LABELS.trackable : PROCESSION_MAP_LABELS.missingGeometry,
        distanceMeters: distanceByProcessionId?.get(procession.id),
      } satisfies ProcessionSheetItem;
    })
    .sort((left, right) => {
      const bucketDiff = sortBucketPriority[left.sortBucket] - sortBucketPriority[right.sortBucket];
      if (bucketDiff !== 0) {
        return bucketDiff;
      }

      const leftProcession = items.find((item) => item.id === left.processionId)!;
      const rightProcession = items.find((item) => item.id === right.processionId)!;
      return getProcessionTimestamp(leftProcession) - getProcessionTimestamp(rightProcession);
    });
};
