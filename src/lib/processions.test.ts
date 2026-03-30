import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAvoidZoneFromProcession,
  getEstimatedRouteSegments,
  getDefaultSelectedProcessionId,
  getProcessionDetailSheetData,
  getQuickFilterDistanceMap,
  getProcessionSheetItems,
  getQuickFilterProcessions,
  getVisibleProcessions,
  isProcessionInsideAvoidZone,
  matchesProcessionSearch,
  sanitizeExternalUrl,
} from './processions';
import type { Procession } from '../types/procession';

const baseProcession = (overrides: Partial<Procession>): Procession => ({
  id: 'proc-1',
  slug: 'proc-1',
  dayLabel: 'Jueves Santo',
  date: '2026-03-28',
  title: 'Procesión 1',
  type: 'Procesión',
  organizer: 'Cofradía 1',
  start: 'San Marcelo',
  time: '18:00',
  startTime: '18:00',
  endTime: '20:00',
  description: 'Descripción',
  routeLabels: [],
  colorLight: '#123456',
  colorDark: '#abcdef',
  geometry: {
    matchedKey: 'proc-1',
    source: 'geometry',
    path: [[42.59, -5.56], [42.60, -5.57]],
    markers: [],
  },
  hasGeometry: true,
  matching: { strategy: 'exact', confidence: 1, matchedKey: 'proc-1' },
  ...overrides,
});

test('crea avoid-zone local reversible desde una procesión con geometría', () => {
  const avoidZone = createAvoidZoneFromProcession(baseProcession({ title: 'Nazareno' }));

  assert.notEqual(avoidZone, null);
  assert.equal(avoidZone?.processionId, 'proc-1');
  assert.equal(avoidZone?.label, 'Nazareno');
  assert.equal(avoidZone?.radiusMeters, 220);
});

test('avoid-zone degrada seguro y no excluye sin geometría válida', () => {
  const withoutGeometry = baseProcession({ id: 'no-geometry', hasGeometry: false, geometry: null });
  const avoidZone = createAvoidZoneFromProcession(withoutGeometry);

  assert.equal(avoidZone, null);
  assert.equal(isProcessionInsideAvoidZone(withoutGeometry, avoidZone), false);
});

test('prioriza activas y próximas con geometría en el sheet', () => {
  const items = getProcessionSheetItems({
    items: [
      baseProcession({ id: 'no-geometry', title: 'Sin recorrido', hasGeometry: false, geometry: null, startTime: '17:00', endTime: '18:00' }),
      baseProcession({ id: 'active-trackable', title: 'Activa', startTime: '18:00', endTime: '21:00' }),
      baseProcession({ id: 'upcoming-trackable', title: 'Próxima', startTime: '22:00', endTime: '23:30' }),
    ],
    currentTime: new Date('2026-03-28T19:00:00'),
    selectedProcessionId: 'no-geometry',
    theme: 'dark',
  });

  assert.deepEqual(items.map((item) => item.processionId), ['active-trackable', 'upcoming-trackable', 'no-geometry']);
  assert.equal(items[2].mapLabel, 'Sin recorrido disponible');
  assert.equal(items[2].isSelected, true);
});

test('selección por defecto elige primero activa con geometría', () => {
  const selection = getDefaultSelectedProcessionId([
    baseProcession({ id: 'finished', startTime: '10:00', endTime: '11:00' }),
    baseProcession({ id: 'active', startTime: '18:00', endTime: '21:00' }),
    baseProcession({ id: 'upcoming', startTime: '22:00', endTime: '23:30' }),
  ], new Date('2026-03-28T19:00:00'));

  assert.equal(selection, 'active');
});

test('selección por defecto cae a próxima con geometría o null', () => {
  const upcomingSelection = getDefaultSelectedProcessionId([
    baseProcession({ id: 'finished-no-geometry', hasGeometry: false, geometry: null, startTime: '10:00', endTime: '11:00' }),
    baseProcession({ id: 'upcoming', startTime: '22:00', endTime: '23:30' }),
  ], new Date('2026-03-28T19:00:00'));

  const emptySelection = getDefaultSelectedProcessionId([
    baseProcession({ id: 'finished-no-geometry', hasGeometry: false, geometry: null, startTime: '10:00', endTime: '11:00' }),
  ], new Date('2026-03-28T19:00:00'));

  assert.equal(upcomingSelection, 'upcoming');
  assert.equal(emptySelection, null);
});

test('segmenta recorrido activo en hecho y pendiente solo cuando aporta división fiable', () => {
  const segments = getEstimatedRouteSegments(
    baseProcession({
      geometry: {
        matchedKey: 'segmented',
        source: 'geometry',
        path: [[42.59, -5.56], [42.60, -5.57], [42.61, -5.58]],
        markers: [],
      },
    }),
    new Date('2026-03-28T19:00:00'),
  );

  assert.notEqual(segments, null);
  assert.equal((segments?.completed.length ?? 0) > 1, true);
  assert.equal((segments?.pending.length ?? 0) > 1, true);
  assert.equal((segments?.progress ?? 0) > 0, true);
  assert.equal((segments?.progress ?? 0) < 1, true);
});

test('segmentación cae a null para upcoming, finished o geometría insuficiente', () => {
  assert.equal(
    getEstimatedRouteSegments(
      baseProcession({ id: 'upcoming', startTime: '22:00', endTime: '23:30' }),
      new Date('2026-03-28T19:00:00'),
    ),
    null,
  );

  assert.equal(
    getEstimatedRouteSegments(
      baseProcession({ id: 'finished', startTime: '16:00', endTime: '17:00' }),
      new Date('2026-03-28T19:00:00'),
    ),
    null,
  );

  assert.equal(
    getEstimatedRouteSegments(
      baseProcession({
        id: 'short-path',
        geometry: {
          matchedKey: 'short-path',
          source: 'geometry',
          path: [[42.59, -5.56]],
          markers: [],
        },
        hasGeometry: true,
      }),
      new Date('2026-03-28T19:00:00'),
    ),
    null,
  );
});

test('la búsqueda ignora acentos y cubre cofradía y día', () => {
  const procession = baseProcession({
    title: 'Procesión del Perdón',
    organizer: 'Cofradía del Dulce Nombre',
    dayLabel: 'Jueves Santo',
  });

  assert.equal(matchesProcessionSearch(procession, 'perdon'), true);
  assert.equal(matchesProcessionSearch(procession, 'cofradia'), true);
  assert.equal(matchesProcessionSearch(procession, 'jueves'), true);
  assert.equal(matchesProcessionSearch(procession, 'inexistente'), false);
});

test('los filtros rápidos separan activas, próximas y hoy', () => {
  const items = [
    baseProcession({ id: 'today-active', date: '2026-03-28', startTime: '18:00', endTime: '20:00' }),
    baseProcession({ id: 'today-upcoming', date: '2026-03-28', startTime: '22:00', endTime: '23:00' }),
    baseProcession({ id: 'tomorrow-upcoming', date: '2026-03-29', dayLabel: 'Viernes Santo', startTime: '22:00', endTime: '23:00' }),
  ];

  assert.deepEqual(getQuickFilterProcessions({
    items,
    quickFilter: 'active',
    currentTime: new Date('2026-03-28T19:00:00'),
    today: '2026-03-28',
    userLocation: null,
  }).items.map((item) => item.id), ['today-active']);

  assert.deepEqual(getQuickFilterProcessions({
    items,
    quickFilter: 'upcoming',
    currentTime: new Date('2026-03-28T19:00:00'),
    today: '2026-03-28',
    userLocation: null,
  }).items.map((item) => item.id), ['today-upcoming', 'tomorrow-upcoming']);

  assert.deepEqual(getQuickFilterProcessions({
    items,
    quickFilter: 'today',
    currentTime: new Date('2026-03-28T19:00:00'),
    today: '2026-03-28',
    userLocation: null,
  }).items.map((item) => item.id), ['today-active', 'today-upcoming']);
});

test('cerca degrada de forma segura sin ubicación', () => {
  const items = [baseProcession({ id: 'nearby-1' })];

  const result = getVisibleProcessions({
    items,
    query: '',
    quickFilter: 'nearby',
    currentTime: new Date('2026-03-28T19:00:00'),
    today: '2026-03-28',
    userLocation: null,
  });

  assert.deepEqual(result.items.map((item) => item.id), ['nearby-1']);
  assert.equal(result.fallbackReason, 'Activa tu ubicación para ordenar por cercanía.');
});

test('cerca ordena por distancia cuando hay ubicación', () => {
  const items = [
    baseProcession({ id: 'far', geometry: { matchedKey: 'far', source: 'geometry', path: [[42.62, -5.6]], markers: [] }, hasGeometry: true }),
    baseProcession({ id: 'near', geometry: { matchedKey: 'near', source: 'geometry', path: [[42.6002, -5.5601]], markers: [] }, hasGeometry: true }),
  ];

  const result = getQuickFilterProcessions({
    items,
    quickFilter: 'nearby',
    currentTime: new Date('2026-03-28T19:00:00'),
    today: '2026-03-28',
    userLocation: [42.6, -5.56],
  });

  assert.deepEqual(result.items.map((item) => item.id), ['near', 'far']);

  const distanceMap = getQuickFilterDistanceMap({
    items: result.items,
    quickFilter: 'nearby',
    userLocation: [42.6, -5.56],
  });

  assert.equal(distanceMap.has('near'), true);
  assert.equal((distanceMap.get('near') ?? Infinity) < (distanceMap.get('far') ?? 0), true);
});

test('cerca prioriza activas sobre finalizadas cuando la distancia es prácticamente equivalente', () => {
  const result = getQuickFilterProcessions({
    items: [
      baseProcession({
        id: 'finished',
        title: 'Finalizada',
        startTime: '10:00',
        endTime: '11:00',
        geometry: { matchedKey: 'finished', source: 'geometry', path: [[42.6001, -5.5601]], markers: [] },
      }),
      baseProcession({
        id: 'active',
        title: 'Activa',
        startTime: '18:00',
        endTime: '21:00',
        geometry: { matchedKey: 'active', source: 'geometry', path: [[42.60015, -5.5601]], markers: [] },
      }),
    ],
    quickFilter: 'nearby',
    currentTime: new Date('2026-03-28T19:00:00'),
    today: '2026-03-28',
    userLocation: [42.6, -5.56],
  });

  assert.deepEqual(result.items.map((item) => item.id), ['active', 'finished']);
});

test('cerca devuelve vacío confiable cuando no hay geometría elegible', () => {
  const result = getQuickFilterProcessions({
    items: [baseProcession({ id: 'no-geometry', hasGeometry: false, geometry: null })],
    quickFilter: 'nearby',
    currentTime: new Date('2026-03-28T19:00:00'),
    today: '2026-03-28',
    userLocation: [42.6, -5.56],
  });

  assert.deepEqual(result.items, []);
  assert.match(result.fallbackReason ?? '', /geometría suficiente/i);
});

test('detail sheet prioriza mapa oficial y sanea URLs externas', () => {
  const detail = getProcessionDetailSheetData(
    baseProcession({
      officialMapUrl: 'https://oficial.example/recorrido',
      officialSourceUrl: 'https://fuente.example/detalle',
      officialItinerary: 'Salida · Calle Ancha · Plaza Mayor',
    }),
    new Date('2026-03-28T19:00:00'),
  );

  assert.equal(detail.routeAvailability, 'official-map');
  assert.equal(detail.officialMapUrl, 'https://oficial.example/recorrido');
  assert.equal(sanitizeExternalUrl('https://oficial.example/recorrido'), 'https://oficial.example/recorrido');
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(detail.canAvoidZone, true);
  assert.match(detail.avoidZoneReason, /oculta temporalmente/i);
});

test('detail sheet cae a itinerario oficial cuando no hay mapa válido', () => {
  const detail = getProcessionDetailSheetData(
    baseProcession({
      officialMapUrl: 'nota-invalida',
      officialItinerary: 'Salida · Calle Ancha · Plaza Mayor',
    }),
    new Date('2026-03-28T19:00:00'),
  );

  assert.equal(detail.routeAvailability, 'official-itinerary');
  assert.equal(detail.officialMapUrl, null);
  assert.match(detail.routeAvailabilityLabel, /itinerario oficial/i);
  assert.match(detail.officialItinerary ?? '', /calle ancha/i);
});

test('detail sheet usa la fuente oficial cuando solo queda ese fallback seguro', () => {
  const detail = getProcessionDetailSheetData(
    baseProcession({
      officialSourceUrl: 'https://fuente.example/detalle',
      officialMapUrl: '',
      officialItinerary: '',
    }),
    new Date('2026-03-28T19:00:00'),
  );

  assert.equal(detail.routeAvailability, 'official-source');
  assert.equal(detail.officialSourceUrl, 'https://fuente.example/detalle');
  assert.match(detail.routeAvailabilityLabel, /fuente oficial/i);
});

test('detail sheet muestra fallback explícito cuando no hay datos oficiales de recorrido', () => {
  const detail = getProcessionDetailSheetData(
    baseProcession({
      hasGeometry: false,
      geometry: null,
      officialMapUrl: '',
      officialSourceUrl: '',
      officialItinerary: '',
      description: '',
    }),
    new Date('2026-03-28T19:00:00'),
  );

  assert.equal(detail.routeAvailability, 'unavailable');
  assert.match(detail.routeAvailabilityLabel, /no disponible/i);
  assert.match(detail.description, /descripción oficial pendiente/i);
  assert.equal(detail.canAvoidZone, false);
  assert.match(detail.avoidZoneReason, /solo está disponible/i);
});
