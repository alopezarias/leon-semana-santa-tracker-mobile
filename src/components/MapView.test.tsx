import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { LeafletBindings } from './MapView';
import type { HomePresentation, Procession } from '../types/procession';

const require = createRequire(import.meta.url);

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

const defaultPresentation: HomePresentation = {
  uxMode: 'LIST',
  mapDisplayMode: 'day',
  selectedProcessionId: null,
  sheetSnap: 'mid',
};

const defaultTime = new Date('2026-03-28T19:00:00');

const setupDom = () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });

  globalThis.window = dom.window as typeof globalThis.window & Window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.Node = dom.window.Node;
  globalThis.requestAnimationFrame = (((callback: FrameRequestCallback) => setTimeout(() => callback(0), 0)) as unknown) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((handle: number) => clearTimeout(handle)) as typeof globalThis.cancelAnimationFrame;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return dom;
};

const teardownDom = (dom: JSDOM) => {
  cleanup();
  dom.window.close();
};

const buildLeafletBindings = () => {
  const map = {
    flyTo: () => {},
    panBy: () => {},
    fitBounds: () => {},
    on: () => {},
    off: () => {},
  };
  let mapHandlers: Record<string, (...args: any[]) => void> = {};

  const leaflet: LeafletBindings = {
    MapContainer: ({ children, ...props }) => <section data-testid="mock-map-container" data-props={JSON.stringify(props)}>{children}</section>,
    TileLayer: (props) => <div data-testid="mock-tile-layer" data-props={JSON.stringify(props)} />,
    Polyline: ({ positions, pathOptions, eventHandlers }) => (
      <button
        type="button"
        data-testid="mock-polyline"
        data-points={Array.isArray(positions) ? positions.length : 0}
        data-color={String((pathOptions as { color?: string } | undefined)?.color ?? '')}
        data-weight={String((pathOptions as { weight?: number } | undefined)?.weight ?? '')}
        data-opacity={String((pathOptions as { opacity?: number } | undefined)?.opacity ?? '')}
        onClick={() => {
          const stopPropagation = () => {};
          (eventHandlers as { click?: (event: { originalEvent: { stopPropagation: () => void } }) => void } | undefined)?.click?.({
            originalEvent: { stopPropagation },
          });
        }}
      >
        polyline
      </button>
    ),
    CircleMarker: ({ center, radius, pathOptions }) => (
      <div
        data-testid="mock-circle-marker"
        data-center={JSON.stringify(center)}
        data-radius={String(radius ?? '')}
        data-path-options={JSON.stringify(pathOptions ?? {})}
      />
    ),
    useMap: () => map,
    useMapEvents: (handlers) => {
      mapHandlers = handlers;
    },
  };

  return {
    leaflet,
    triggerBackgroundTap: () => mapHandlers.click?.(),
  };
};

const renderMapView = ({
  processions,
  presentation = defaultPresentation,
  selectedProcession = null,
  currentTime = defaultTime,
  onMapBackgroundTap = () => {},
  onSelectProcession = () => {},
}: {
  processions: Procession[];
  presentation?: HomePresentation;
  selectedProcession?: Procession | null;
  currentTime?: Date;
  onMapBackgroundTap?: () => void;
  onSelectProcession?: (processionId: string) => void;
}) => {
  const { MapViewWithBindings } = require('./MapView') as typeof import('./MapView');
  const bindings = buildLeafletBindings();

  const view = render(
    <MapViewWithBindings
      processions={processions}
      presentation={presentation}
      selectedProcession={selectedProcession}
      userLocation={null}
      locateRequestId={0}
      theme="light"
      currentTime={currentTime}
      viewportPaddingTop={112}
      viewportPaddingBottom={176}
      onMapBackgroundTap={onMapBackgroundTap}
      onSelectProcession={onSelectProcession}
      leaflet={bindings.leaflet}
    />,
  );

  return { ...view, ...bindings };
};

test('usa el componente por defecto exportado sin cambiar el contrato público', () => {
  const dom = setupDom();

  try {
    const { default: MapView } = require('./MapView') as typeof import('./MapView');
    assert.equal(typeof MapView, 'function');
  } finally {
    teardownDom(dom);
  }
});

test('tocar un recorrido real del mapa dispara la selección exacta', () => {
  const dom = setupDom();
  const selectedIds: string[] = [];

  try {
    const view = renderMapView({
      processions: [baseProcession()],
      onSelectProcession: (processionId) => selectedIds.push(processionId),
    });

    fireEvent.click(view.getAllByTestId('mock-polyline')[0]);

    assert.deepEqual(selectedIds, ['proc-1']);
  } finally {
    teardownDom(dom);
  }
});

test('tap de fondo o non-hit en IDLE y LIST no crea selección falsa', () => {
  const cases: Array<{ name: string; presentation: HomePresentation }> = [
    {
      name: 'IDLE',
      presentation: { uxMode: 'IDLE', mapDisplayMode: 'free', selectedProcessionId: null, sheetSnap: 'collapsed' },
    },
    {
      name: 'LIST',
      presentation: { uxMode: 'LIST', mapDisplayMode: 'day', selectedProcessionId: null, sheetSnap: 'mid' },
    },
  ];

  for (const scenario of cases) {
    const dom = setupDom();
    let backgroundTaps = 0;
    const selectedIds: string[] = [];

    try {
      const view = renderMapView({
        processions: [baseProcession()],
        presentation: scenario.presentation,
        onMapBackgroundTap: () => {
          backgroundTaps += 1;
        },
        onSelectProcession: (processionId) => selectedIds.push(processionId),
      });

      view.triggerBackgroundTap();

      assert.equal(backgroundTaps, 1, `${scenario.name} should keep background taps routed to fallback handler`);
      assert.deepEqual(selectedIds, [], `${scenario.name} should not synthesize a selection`);
    } finally {
      teardownDom(dom);
    }
  }
});

test('la seleccionada domina visualmente y el contexto queda atenuado', () => {
  const dom = setupDom();
  const selected = baseProcession({
    id: 'selected',
    colorLight: '#f97316',
    startTime: '22:00',
    endTime: '23:30',
  });
  const context = baseProcession({ id: 'context', colorLight: '#0ea5e9' });

  try {
    const view = renderMapView({
      processions: [selected, context],
      presentation: {
        uxMode: 'SELECTED',
        mapDisplayMode: 'procession',
        selectedProcessionId: 'selected',
        sheetSnap: 'collapsed',
      },
      selectedProcession: selected,
    });

    const polylines = view.getAllByTestId('mock-polyline').map((item) => ({
      color: item.getAttribute('data-color'),
      weight: item.getAttribute('data-weight'),
      opacity: item.getAttribute('data-opacity'),
    }));

    assert.deepEqual(polylines, [
      { color: '#0f172a', weight: '12', opacity: '0.26' },
      { color: '#f97316', weight: '8', opacity: '0.98' },
      { color: '#0ea5e9', weight: '4', opacity: '0.16' },
    ]);
  } finally {
    teardownDom(dom);
  }
});

test('renderiza hecho/pendiente para la seleccionada activa y cae a highlight simple cuando no es fiable', () => {
  const dom = setupDom();
  const active = baseProcession({
    id: 'active',
    colorLight: '#22c55e',
    geometry: {
      matchedKey: 'active',
      source: 'geometry',
      path: [[42.59, -5.56], [42.6, -5.57], [42.61, -5.58]],
      markers: [],
    },
  });
  const fallback = baseProcession({
    id: 'fallback',
    colorLight: '#8b5cf6',
    startTime: '22:00',
    endTime: '23:30',
  });

  try {
    const activeView = renderMapView({
      processions: [active],
      presentation: {
        uxMode: 'SELECTED',
        mapDisplayMode: 'procession',
        selectedProcessionId: 'active',
        sheetSnap: 'collapsed',
      },
      selectedProcession: active,
    });

    assert.deepEqual(activeView.getAllByTestId('mock-polyline').map((item) => ({
      color: item.getAttribute('data-color'),
      weight: item.getAttribute('data-weight'),
      opacity: item.getAttribute('data-opacity'),
    })), [
      { color: '#0f172a', weight: '12', opacity: '0.26' },
      { color: '#475569', weight: '8', opacity: '0.72' },
      { color: '#22c55e', weight: '8', opacity: '0.98' },
    ]);
    assert.equal(activeView.getAllByTestId('mock-circle-marker').length > 0, true);

    cleanup();

    const fallbackView = renderMapView({
      processions: [fallback],
      presentation: {
        uxMode: 'SELECTED',
        mapDisplayMode: 'procession',
        selectedProcessionId: 'fallback',
        sheetSnap: 'collapsed',
      },
      selectedProcession: fallback,
    });

    assert.deepEqual(fallbackView.getAllByTestId('mock-polyline').map((item) => ({
      color: item.getAttribute('data-color'),
      weight: item.getAttribute('data-weight'),
      opacity: item.getAttribute('data-opacity'),
    })), [
      { color: '#0f172a', weight: '12', opacity: '0.26' },
      { color: '#8b5cf6', weight: '8', opacity: '0.98' },
    ]);
  } finally {
    teardownDom(dom);
  }
});
