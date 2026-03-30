import test from 'node:test';
import assert from 'node:assert/strict';
import type { Procession } from '../types/procession';
import { getLocateMePanOffset, getVisibleMapProcessions } from './map-view-state';

const baseProcession = (overrides: Partial<Procession> = {}): Procession => ({
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
    path: [[42.59, -5.56], [42.6, -5.57]],
    markers: [],
  },
  hasGeometry: true,
  matching: { strategy: 'exact', confidence: 1, matchedKey: 'proc-1' },
  ...overrides,
});

test('modo día mantiene visibles todas las procesiones trackable del día', () => {
  const visible = getVisibleMapProcessions({
    processions: [
      baseProcession({ id: 'day-a' }),
      baseProcession({ id: 'day-b', startTime: '20:00', endTime: '22:00' }),
      baseProcession({ id: 'day-c-no-geometry', hasGeometry: false, geometry: null }),
    ],
    displayMode: 'day',
    selectedProcession: null,
    selectedProcessionId: null,
  });

  assert.deepEqual(visible.map((procession) => procession.id), ['day-a', 'day-b']);
});

test('modo procesión muestra solo la procesión elegida', () => {
  const selectedProcession = baseProcession({ id: 'selected' });
  const visible = getVisibleMapProcessions({
    processions: [
      baseProcession({ id: 'other-a' }),
      selectedProcession,
      baseProcession({ id: 'other-b', startTime: '20:00', endTime: '22:00' }),
    ],
    displayMode: 'procession',
    selectedProcession,
    selectedProcessionId: 'selected',
  });

  assert.deepEqual(visible.map((procession) => procession.id), ['selected']);
});

test('modo procesión oculta el resto cuando la seleccionada no tiene geometría', () => {
  const visible = getVisibleMapProcessions({
    processions: [
      baseProcession({ id: 'other-a' }),
      baseProcession({ id: 'other-b', startTime: '20:00', endTime: '22:00' }),
    ],
    displayMode: 'procession',
    selectedProcession: null,
    selectedProcessionId: 'no-geometry',
  });

  assert.deepEqual(visible, []);
});

test('ubicarme calcula offset vertical real según overlays', () => {
  assert.equal(getLocateMePanOffset(112, 164), 26);
  assert.equal(getLocateMePanOffset(112, 112), 0);
});
