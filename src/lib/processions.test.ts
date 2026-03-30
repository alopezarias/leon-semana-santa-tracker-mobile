import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultSelectedProcessionId,
  getProcessionSheetItems,
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
