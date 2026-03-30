import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { Procession, ProcessionSheetItem as ProcessionSheetItemModel, QuickFilterKey, SearchQuery } from './types/procession';

let dom: JSDOM;
let AppShell: typeof import('./App').AppShell;
let BottomSheet: typeof import('./components/BottomSheet').default;
let getSheetSnapHeights: typeof import('./components/BottomSheet').getSheetSnapHeights;
let resolveSheetSnap: typeof import('./components/BottomSheet').resolveSheetSnap;
let HomeTopBar: typeof import('./components/HomeTopBar').default;
let ProcessionSheetItem: typeof import('./components/ProcessionSheetItem').default;

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

const initialTime = new Date('2026-03-28T19:00:00');

beforeEach(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });

  dom.window.requestAnimationFrame = ((callback: FrameRequestCallback) => setTimeout(() => callback(0), 0)) as typeof dom.window.requestAnimationFrame;
  dom.window.cancelAnimationFrame = ((handle: number) => clearTimeout(handle)) as typeof dom.window.cancelAnimationFrame;

  globalThis.window = dom.window as typeof globalThis.window & Window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.Node = dom.window.Node;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame;

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  ({ AppShell } = await import('./App'));
  ({ default: BottomSheet, getSheetSnapHeights, resolveSheetSnap } = await import('./components/BottomSheet'));
  ({ default: HomeTopBar } = await import('./components/HomeTopBar'));
  ({ default: ProcessionSheetItem } = await import('./components/ProcessionSheetItem'));
});

afterEach(() => {
  cleanup();
  dom.window.close();
  mock.restoreAll();
});

function MockMapView({
  processions,
  selectedProcession,
  selectedProcessionId,
  displayMode,
  locateRequestId,
  viewportPaddingBottom,
  onMapBackgroundTap,
}: {
  processions: Procession[];
  selectedProcession: Procession | null;
  selectedProcessionId: string | null;
  displayMode: 'procession' | 'day' | 'free';
  locateRequestId: number;
  viewportPaddingBottom: number;
  onMapBackgroundTap: () => void;
}) {
  return (
    <section aria-label="Mapa principal">
      <div data-testid="map-procession-count">{processions.length}</div>
      <div data-testid="map-selected-procession">{selectedProcession?.id ?? 'none'}</div>
      <div data-testid="map-selected-procession-id">{selectedProcessionId ?? 'none'}</div>
      <div data-testid="map-display-mode">{displayMode}</div>
      <div data-testid="map-locate-request-id">{locateRequestId}</div>
      <div data-testid="map-padding-bottom">{viewportPaddingBottom}</div>
      <button type="button" onClick={onMapBackgroundTap}>Vaciar selección</button>
    </section>
  );
}

function MockBottomSheet({
  items,
  availableDays,
  selectedDay,
  quickFilter,
  searchQuery,
  quickFilterMessage,
  onSelectDay,
  onToggleQuickFilter,
  onResetDiscovery,
  snap,
  setSnap,
  onSelectProcession,
}: {
  items: ProcessionSheetItemModel[];
  availableDays: Array<{ date: string; shortLabel: string }>;
  selectedDay: string | null;
  quickFilter: QuickFilterKey | null;
  searchQuery: string;
  quickFilterMessage?: string | null;
  onSelectDay: (day: string) => void;
  onToggleQuickFilter: (filter: QuickFilterKey) => void;
  onResetDiscovery: () => void;
  snap: 'collapsed' | 'mid' | 'expanded';
  setSnap: (snap: 'collapsed' | 'mid' | 'expanded') => void;
  onSelectProcession: (processionId: string) => void;
}) {
  return (
    <section aria-label="Panel de procesiones">
      <div data-testid="sheet-snap">{snap}</div>
      <button type="button" onClick={() => setSnap('expanded')}>Expandir panel</button>
      {availableDays.map((day) => (
        <button
          key={day.date}
          type="button"
          onClick={() => onSelectDay(day.date)}
          data-testid={`sheet-day-${day.date}`}
          data-selected={selectedDay === day.date ? 'true' : 'false'}
        >
          {day.shortLabel}
        </button>
      ))}
      {(['today', 'active', 'upcoming', 'nearby'] as QuickFilterKey[]).map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onToggleQuickFilter(filter)}
          data-testid={`sheet-filter-${filter}`}
          data-selected={quickFilter === filter ? 'true' : 'false'}
        >
          {filter}
        </button>
      ))}
      {searchQuery ? <div data-testid="sheet-search-query">{searchQuery}</div> : null}
      {quickFilterMessage ? <div data-testid="sheet-filter-message">{quickFilterMessage}</div> : null}
      {(searchQuery || quickFilter) ? <button type="button" onClick={onResetDiscovery}>Reset discovery</button> : null}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelectProcession(item.processionId)}
          data-testid={`sheet-item-${item.processionId}`}
          data-selected={item.isSelected ? 'true' : 'false'}
        >
          {item.title} · {item.mapLabel}
        </button>
      ))}
    </section>
  );
}

function MockHomeTopBar({
  searchQuery,
  resultCount,
  onSearchChange,
  onClearSearch,
  onToggleTheme,
  onLocateMe,
}: {
      theme: 'light' | 'dark';
      isLocating: boolean;
      searchQuery: SearchQuery;
  resultCount: number;
  onSearchChange: (value: SearchQuery) => void;
  onClearSearch: () => void;
  onToggleTheme: () => void;
  onLocateMe: () => void;
}) {
  return (
    <section aria-label="Barra superior home">
      <label htmlFor="mock-search">Buscar</label>
      <input
        id="mock-search"
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        onInput={(event) => onSearchChange((event.target as HTMLInputElement).value)}
      />
      <div data-testid="topbar-result-count">{resultCount}</div>
      <button type="button" onClick={onClearSearch}>Limpiar búsqueda</button>
      <button type="button" onClick={onLocateMe}>Centrar en mi ubicación</button>
      <button type="button" onClick={onToggleTheme}>Cambiar tema</button>
    </section>
  );
}

test('renderiza la home map-first con mapa, top bar mínima y sheet', () => {
  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[baseProcession()]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  assert.equal(view.getByLabelText('Mapa principal').tagName, 'SECTION');
  assert.equal(view.getByLabelText('Barra superior home').tagName, 'SECTION');
  assert.equal(view.getByLabelText('Panel de procesiones').tagName, 'SECTION');
  assert.equal(view.queryByText(/Ver ruta|Ocultar ruta/i), null);
});

test('seleccionar un item trackable sincroniza sheet y mapa', () => {
  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({ id: 'trackable-1', title: 'Trackable 1' }),
        baseProcession({ id: 'trackable-2', title: 'Trackable 2', startTime: '22:00', endTime: '23:30' }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.click(view.getByTestId('sheet-item-trackable-2'));

  assert.equal(view.getByTestId('map-selected-procession').textContent, 'trackable-2');
  assert.equal(view.getByTestId('map-display-mode').textContent, 'procession');
  assert.equal(view.getByTestId('sheet-item-trackable-2').getAttribute('data-selected'), 'true');
  assert.equal(view.getByTestId('sheet-snap').textContent, 'collapsed');
  assert.equal(view.getByTestId('map-padding-bottom').textContent, '176');
});

test('seleccionar un item sin geometría mantiene selección visual pero no ruta activa', () => {
  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({ id: 'trackable-1', title: 'Trackable 1' }),
        baseProcession({
          id: 'no-geometry',
          title: 'Sin recorrido',
          hasGeometry: false,
          geometry: null,
          startTime: '22:00',
          endTime: '23:30',
        }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.click(view.getByTestId('sheet-item-no-geometry'));

  assert.equal(view.getByTestId('sheet-item-no-geometry').getAttribute('data-selected'), 'true');
  assert.equal(view.getByTestId('map-selected-procession').textContent, 'none');
   assert.equal(view.getByTestId('map-selected-procession-id').textContent, 'no-geometry');
  assert.equal(view.getByTestId('sheet-snap').textContent, 'collapsed');
  assert.equal(view.getByText(/Sin recorrido disponible/i).tagName, 'BUTTON');
});

test('los snaps del sheet priorizan el punto más cercano con inercia creíble', () => {
  const snapHeights = getSheetSnapHeights(800);

  assert.equal(resolveSheetSnap({ snap: 'mid', offsetY: 210, velocityY: 120, snapHeights }), 'collapsed');
  assert.equal(resolveSheetSnap({ snap: 'collapsed', offsetY: -180, velocityY: -820, snapHeights }), 'mid');
  assert.equal(resolveSheetSnap({ snap: 'mid', offsetY: -170, velocityY: -1050, snapHeights }), 'expanded');
});

test('seleccionar un día recoge el panel y muestra todas las procesiones del día', () => {
  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({ id: 'day-1-a', date: '2026-03-28', dayLabel: 'Jueves Santo', title: 'Día 1 A' }),
        baseProcession({ id: 'day-1-b', date: '2026-03-28', dayLabel: 'Jueves Santo', title: 'Día 1 B', startTime: '22:00', endTime: '23:00' }),
        baseProcession({ id: 'day-2-a', date: '2026-03-29', dayLabel: 'Viernes Santo', title: 'Día 2 A' }),
        baseProcession({ id: 'day-2-b', date: '2026-03-29', dayLabel: 'Viernes Santo', title: 'Día 2 B', startTime: '21:00', endTime: '23:00' }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.click(view.getByRole('button', { name: 'Expandir panel' }));
  fireEvent.click(view.getByTestId('sheet-day-2026-03-29'));

  assert.equal(view.getByTestId('sheet-snap').textContent, 'collapsed');
  assert.equal(view.getByTestId('map-procession-count').textContent, '2');
  assert.equal(view.getByTestId('map-display-mode').textContent, 'day');
  assert.equal(view.getByTestId('map-selected-procession').textContent, 'none');
  assert.equal(view.getByTestId('sheet-day-2026-03-29').getAttribute('data-selected'), 'true');
});

test('ubicarme dispara un enfoque real de cámara al usuario', () => {
  const getCurrentPosition = mock.fn((success: (position: GeolocationPosition) => void) => {
    success({
      coords: {
        latitude: 42.601,
        longitude: -5.57,
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    } as GeolocationPosition);
  });

  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });

  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[baseProcession()]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.click(view.getByRole('button', { name: 'Centrar en mi ubicación' }));

  assert.equal(getCurrentPosition.mock.callCount(), 1);
  assert.equal(view.getByTestId('map-locate-request-id').textContent, '1');
  assert.equal(view.getByTestId('sheet-snap').textContent, 'collapsed');
  assert.equal(view.getByText('Ubicación centrada en el mapa.').tagName, 'DIV');
});

test('tocar el fondo del mapa limpia la selección actual', () => {
  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({ id: 'trackable-1', title: 'Trackable 1' }),
        baseProcession({ id: 'trackable-2', title: 'Trackable 2', startTime: '22:00', endTime: '23:30' }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.click(view.getByTestId('sheet-item-trackable-2'));
  fireEvent.click(view.getByRole('button', { name: 'Vaciar selección' }));

  assert.equal(view.getByTestId('map-selected-procession').textContent, 'none');
  assert.equal(view.getByTestId('sheet-item-trackable-2').getAttribute('data-selected'), 'false');
});

test('el item compacto elimina el patrón Ver ruta/Ocultar ruta', () => {
  const view = render(
    <ProcessionSheetItem
      theme="dark"
      onSelect={() => {}}
      item={{
        id: 'sheet-proc-1',
        processionId: 'proc-1',
        title: 'Procesión 1',
        timeLabel: '18:00 · 20:00',
        subtitle: 'Cofradía 1',
        status: 'active',
        isTrackable: true,
        isSelected: false,
        sortBucket: 'live-trackable',
        accentColor: '#abcdef',
        mapLabel: 'En mapa',
      }}
    />,
  );

  assert.equal(view.getByRole('button').textContent?.includes('Ver ruta'), false);
  assert.equal(view.getByRole('button').textContent?.includes('Ocultar ruta'), false);
  assert.equal(view.getByRole('button').className.includes('min-h-[88px]'), true);
});

test('la top bar muestra un input real y permite limpiar la búsqueda', () => {
  const view = render(
    <HomeTopBar
      theme="dark"
      isLocating={false}
      searchQuery="Nazareno"
      resultCount={3}
      onSearchChange={() => {}}
      onClearSearch={() => {}}
      onToggleTheme={() => {}}
      onLocateMe={() => {}}
    />,
  );

  const topBar = view.getByLabelText('Barra superior home');
  assert.equal(topBar.tagName, 'DIV');
  assert.equal((view.getByLabelText('Buscar procesión, cofradía o día') as HTMLInputElement).value, 'Nazareno');
  assert.equal(view.getByLabelText('Limpiar búsqueda').tagName, 'BUTTON');
  assert.equal(view.getByLabelText('Centrar en mi ubicación').tagName, 'BUTTON');
  assert.equal(view.getByLabelText('Cambiar tema').tagName, 'BUTTON');
  assert.equal(view.getByLabelText('Centrar en mi ubicación').className.includes('h-12 w-12'), true);
  assert.equal(view.getByLabelText('Cambiar tema').className.includes('h-12 w-12'), true);
});

test('el sheet usa chips de día y filtros rápidos con reset de estado vacío', () => {
  const view = render(
    <BottomSheet
      items={[
        {
          id: 'sheet-proc-1',
          processionId: 'proc-1',
          title: 'Procesión 1',
          timeLabel: '18:00 · 20:00',
          subtitle: 'Cofradía 1',
          status: 'active',
          isTrackable: true,
          isSelected: false,
          sortBucket: 'live-trackable',
          accentColor: '#abcdef',
          mapLabel: 'En mapa',
        },
      ]}
      availableDays={[{ date: '2026-03-28', label: 'Jueves Santo', shortLabel: 'jue 28 mar', count: 1 }]}
      selectedDay="2026-03-28"
      quickFilter="today"
      searchQuery="nazareno"
      quickFilterMessage="Activa tu ubicación para ordenar por cercanía."
      onSelectDay={() => {}}
      onToggleQuickFilter={() => {}}
      onResetDiscovery={() => {}}
      onSelectProcession={() => {}}
      theme="dark"
      snap="mid"
      setSnap={() => {}}
    />,
  );

  assert.equal(view.getByLabelText('Cambiar altura del panel').className.includes('min-h-14'), true);
  assert.equal(view.getByRole('button', { name: /jue 28 mar/i }).className.includes('min-h-12'), true);
  assert.equal(view.getByRole('button', { name: 'Hoy' }).tagName, 'BUTTON');
  assert.equal(view.getByText('Activa tu ubicación para ordenar por cercanía.').tagName, 'P');
});

test('buscar filtra la lista y el mapa sin romper la selección', async () => {
  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({ id: 'nazareno', title: 'Nazareno', organizer: 'Cofradía del Nazareno' }),
        baseProcession({ id: 'perdon', title: 'Perdón', organizer: 'Cofradía del Perdón', startTime: '22:00', endTime: '23:30' }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.input(view.getByLabelText('Buscar'), { target: { value: 'perdon' } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  fireEvent.click(view.getByTestId('sheet-item-perdon'));

  assert.equal(view.getByTestId('map-procession-count').textContent, '1');
  assert.equal(view.getByTestId('sheet-item-perdon').getAttribute('data-selected'), 'true');
  assert.equal(view.getByTestId('map-selected-procession-id').textContent, 'perdon');
  assert.equal(view.queryByTestId('sheet-item-nazareno'), null);
  assert.equal(view.getByTestId('topbar-result-count').textContent, '1');
});

test('el filtro Cerca pide ubicación bajo demanda y si falla no vacía resultados', () => {
  const getCurrentPosition = mock.fn((_: PositionCallback, error: PositionErrorCallback) => {
    error({ code: 1, message: 'permission denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
  });

  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });

  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({ id: 'trackable-1', title: 'Trackable 1' }),
        baseProcession({ id: 'trackable-2', title: 'Trackable 2', startTime: '22:00', endTime: '23:30' }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.click(view.getByTestId('sheet-filter-nearby'));

  assert.equal(getCurrentPosition.mock.callCount(), 1);
  assert.equal(view.getByTestId('map-procession-count').textContent, '2');
  assert.equal(view.getByTestId('sheet-filter-nearby').getAttribute('data-selected'), 'false');
  assert.equal(view.getByTestId('sheet-filter-message').textContent, 'Activa tu ubicación para usar el filtro Cerca.');
});

test('limpiar búsqueda y filtros recupera el listado completo', () => {
  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({ id: 'nazareno', title: 'Nazareno' }),
        baseProcession({ id: 'perdon', title: 'Perdón', startTime: '22:00', endTime: '23:30' }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.change(view.getByLabelText('Buscar'), { target: { value: 'nazareno' } });
  fireEvent.click(view.getByTestId('sheet-filter-active'));
  fireEvent.click(view.getByRole('button', { name: 'Reset discovery' }));

  assert.equal(view.getByTestId('map-procession-count').textContent, '2');
  assert.equal(view.getByTestId('topbar-result-count').textContent, '2');
});
