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
    presentation: {
      uxMode: 'LIST',
      mapDisplayMode: 'day',
      selectedProcessionId: null,
      sheetSnap: 'mid',
    },
    selectedProcession: null,
  });

  assert.deepEqual(visible.map((procession) => procession.id), ['day-a', 'day-b']);
});

test('modo procesión mantiene la seleccionada primero y el resto como contexto', () => {
  const selectedProcession = baseProcession({ id: 'selected' });
  const visible = getVisibleMapProcessions({
    processions: [
      baseProcession({ id: 'other-a' }),
      selectedProcession,
      baseProcession({ id: 'other-b', startTime: '20:00', endTime: '22:00' }),
    ],
    presentation: {
      uxMode: 'SELECTED',
      mapDisplayMode: 'procession',
      selectedProcessionId: 'selected',
      sheetSnap: 'collapsed',
    },
    selectedProcession,
  });

  assert.deepEqual(visible.map((procession) => procession.id), ['selected', 'other-a', 'other-b']);
});

test('modo procesión cae a contexto trackable si la seleccionada no tiene geometría disponible', () => {
  const visible = getVisibleMapProcessions({
    processions: [
      baseProcession({ id: 'other-a' }),
      baseProcession({ id: 'other-b', startTime: '20:00', endTime: '22:00' }),
    ],
    presentation: {
      uxMode: 'SELECTED',
      mapDisplayMode: 'procession',
      selectedProcessionId: 'no-geometry',
      sheetSnap: 'collapsed',
    },
    selectedProcession: null,
  });

  assert.deepEqual(visible.map((procession) => procession.id), ['other-a', 'other-b']);
});

test('modo free mantiene visibles las procesiones trackable sin selección', () => {
  const visible = getVisibleMapProcessions({
    processions: [
      baseProcession({ id: 'free-a' }),
      baseProcession({ id: 'free-b', hasGeometry: false, geometry: null }),
      baseProcession({ id: 'free-c' }),
    ],
    presentation: {
      uxMode: 'IDLE',
      mapDisplayMode: 'free',
      selectedProcessionId: null,
      sheetSnap: 'collapsed',
    },
    selectedProcession: null,
  });

  assert.deepEqual(visible.map((procession) => procession.id), ['free-a', 'free-c']);
});

test('ubicarme calcula offset vertical real según overlays', () => {
  assert.equal(getLocateMePanOffset(112, 164), 26);
  assert.equal(getLocateMePanOffset(112, 112), 0);
});
