import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, mock, test } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { AvoidZone, HomePresentation, Procession, ProcessionDetailSheetData, ProcessionSheetItem as ProcessionSheetItemModel, QuickFilterKey, SearchQuery } from './types/procession';

let dom: JSDOM;
let AppShell: typeof import('./App').AppShell;

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

before(async () => {
  const bootstrapDom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  bootstrapDom.window.requestAnimationFrame = ((callback: FrameRequestCallback) => setTimeout(() => callback(0), 0)) as typeof bootstrapDom.window.requestAnimationFrame;
  bootstrapDom.window.cancelAnimationFrame = ((handle: number) => clearTimeout(handle)) as typeof bootstrapDom.window.cancelAnimationFrame;
  globalThis.window = bootstrapDom.window as typeof globalThis.window & Window;
  globalThis.document = bootstrapDom.window.document;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: bootstrapDom.window.navigator });
  globalThis.HTMLElement = bootstrapDom.window.HTMLElement;
  globalThis.SVGElement = bootstrapDom.window.SVGElement;
  globalThis.Node = bootstrapDom.window.Node;
  globalThis.localStorage = bootstrapDom.window.localStorage;
  globalThis.requestAnimationFrame = bootstrapDom.window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = bootstrapDom.window.cancelAnimationFrame;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  ({ AppShell } = await import('./App'));

  bootstrapDom.window.close();
});

beforeEach(() => {
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
});

afterEach(() => {
  cleanup();
  dom.window.close();
  mock.restoreAll();
});

function MockMapView({
  processions,
  presentation,
  selectedProcession,
  locateRequestId,
  viewportPaddingBottom,
  onMapBackgroundTap,
  onSelectProcession,
  avoidZone,
}: {
  processions: Procession[];
  presentation: HomePresentation;
  selectedProcession: Procession | null;
  locateRequestId: number;
  viewportPaddingBottom: number;
  avoidZone?: AvoidZone | null;
  onMapBackgroundTap: () => void;
  onSelectProcession: (processionId: string) => void;
}) {
  return (
    <section aria-label="Mapa principal">
      <div data-testid="map-procession-count">{processions.length}</div>
      <div data-testid="map-selected-procession">{selectedProcession?.id ?? 'none'}</div>
      <div data-testid="map-selected-procession-id">{presentation.selectedProcessionId ?? 'none'}</div>
      <div data-testid="map-display-mode">{presentation.mapDisplayMode}</div>
      <div data-testid="home-ux-mode">{presentation.uxMode}</div>
      <div data-testid="map-locate-request-id">{locateRequestId}</div>
      <div data-testid="map-padding-bottom">{viewportPaddingBottom}</div>
      <div data-testid="map-avoid-zone">{avoidZone?.label ?? 'none'}</div>
      {processions.map((procession) => (
        <button key={procession.id} type="button" data-testid={`map-route-${procession.id}`} onClick={() => onSelectProcession(procession.id)}>
          Seleccionar {procession.title} en mapa
        </button>
      ))}
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
  uxMode,
  onRequestSnap,
  onSelectProcession,
  detailSheetData,
  onViewRoute,
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
  uxMode: 'IDLE' | 'LIST' | 'SELECTED' | 'DETAIL';
  onRequestSnap: (snap: 'collapsed' | 'mid' | 'expanded') => void;
  onSelectProcession: (processionId: string) => void;
  detailSheetData?: ProcessionDetailSheetData | null;
  onViewRoute?: () => void;
}) {
  return (
    <section aria-label="Panel de procesiones">
      <div data-testid="sheet-snap">{snap}</div>
      <div data-testid="sheet-ux-mode">{uxMode}</div>
      <button type="button" onClick={() => onRequestSnap('expanded')}>Expandir panel</button>
      <button type="button" onClick={() => onRequestSnap('mid')}>Panel a media altura</button>
      <button type="button" onClick={() => onRequestSnap('collapsed')}>Colapsar panel</button>
      {availableDays.map((day) => (
        <button key={day.date} type="button" onClick={() => onSelectDay(day.date)} data-testid={`sheet-day-${day.date}`} data-selected={selectedDay === day.date ? 'true' : 'false'}>
          {day.shortLabel}
        </button>
      ))}
      {(['today', 'active', 'upcoming', 'nearby'] as QuickFilterKey[]).map((filter) => (
        <button key={filter} type="button" onClick={() => onToggleQuickFilter(filter)} data-testid={`sheet-filter-${filter}`} data-selected={quickFilter === filter ? 'true' : 'false'}>
          {filter}
        </button>
      ))}
      {searchQuery ? <div data-testid="sheet-search-query">{searchQuery}</div> : null}
      {quickFilterMessage ? <div data-testid="sheet-filter-message">{quickFilterMessage}</div> : null}
      {(searchQuery || quickFilter) ? <button type="button" onClick={onResetDiscovery}>Reset discovery</button> : null}
      {uxMode === 'DETAIL' && detailSheetData ? (
        <>
          <div data-testid="sheet-detail-title">{detailSheetData.title}</div>
          <div data-testid="sheet-detail-route-availability">{detailSheetData.routeAvailability}</div>
          <div data-testid="sheet-detail-itinerary">{detailSheetData.officialItinerary ?? 'none'}</div>
          <button type="button" onClick={() => onViewRoute?.()} disabled={detailSheetData.routeAvailability === 'unavailable' || detailSheetData.routeAvailability === 'tracking-only'}>
            Ver recorrido
          </button>
        </>
      ) : items.map((item) => (
        <button key={item.id} type="button" onClick={() => onSelectProcession(item.processionId)} data-testid={`sheet-item-${item.processionId}`} data-selected={item.isSelected ? 'true' : 'false'}>
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
      <input id="mock-search" type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} onInput={(event) => onSearchChange((event.target as HTMLInputElement).value)} />
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
  assert.equal(view.getByTestId('home-ux-mode').textContent, 'SELECTED');
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
  assert.equal(view.getByText(/Sin recorrido disponible/i).tagName, 'BUTTON');
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
  assert.equal(view.getByTestId('home-ux-mode').textContent, 'LIST');
});

test('tocar un recorrido visible en el mapa selecciona la procesión sin crear modo paralelo', () => {
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

  fireEvent.click(view.getByTestId('map-route-trackable-1'));

  assert.equal(view.getByTestId('map-selected-procession').textContent, 'trackable-1');
  assert.equal(view.getByTestId('map-selected-procession-id').textContent, 'trackable-1');
  assert.equal(view.getByTestId('home-ux-mode').textContent, 'SELECTED');
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
  assert.equal(view.getByTestId('topbar-result-count').textContent, '1');
});

test('expandir desde selected lleva a detail directamente', () => {
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
  fireEvent.click(view.getByRole('button', { name: 'Panel a media altura' }));

  assert.equal(view.getByTestId('home-ux-mode').textContent, 'DETAIL');
  assert.equal(view.getByTestId('sheet-snap').textContent, 'expanded');
});

test('detail renderiza la ficha seleccionada sin mezclarla con la lista', () => {
  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({ id: 'trackable-1', title: 'Trackable 1', officialItinerary: 'Salida · Calle Ancha' }),
        baseProcession({ id: 'trackable-2', title: 'Trackable 2', startTime: '22:00', endTime: '23:30' }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.click(view.getByTestId('sheet-item-trackable-1'));
  fireEvent.click(view.getByRole('button', { name: 'Panel a media altura' }));

  assert.equal(view.getByTestId('sheet-ux-mode').textContent, 'DETAIL');
  assert.equal(view.getByTestId('sheet-detail-title').textContent, 'Trackable 1');
  assert.equal(view.getByTestId('sheet-detail-itinerary').textContent, 'Salida · Calle Ancha');
});

test('ver recorrido abre URL oficial válida con precedencia segura', () => {
  const openSpy = mock.fn(() => null);
  Object.defineProperty(globalThis.window, 'open', { configurable: true, value: openSpy });

  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({
          id: 'trackable-1',
          title: 'Trackable 1',
          officialMapUrl: 'https://oficial.example/mapa',
          officialSourceUrl: 'https://oficial.example/fuente',
          officialItinerary: 'Salida · Calle Ancha',
        }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.click(view.getByTestId('sheet-item-trackable-1'));
  fireEvent.click(view.getByRole('button', { name: 'Panel a media altura' }));
  fireEvent.click(view.getByRole('button', { name: 'Ver recorrido' }));

  assert.equal(openSpy.mock.callCount(), 1);
  assert.deepEqual(openSpy.mock.calls[0].arguments, ['https://oficial.example/mapa', '_blank', 'noopener,noreferrer']);
});

test('ver recorrido cae a la fuente oficial si el mapa no es válido', () => {
  const openSpy = mock.fn(() => null);
  Object.defineProperty(globalThis.window, 'open', { configurable: true, value: openSpy });

  const view = render(
    <AppShell
      initialTime={initialTime}
      processionsData={[
        baseProcession({
          id: 'trackable-1',
          title: 'Trackable 1',
          officialMapUrl: 'javascript:alert(1)',
          officialSourceUrl: 'https://oficial.example/fuente',
          officialItinerary: '',
        }),
      ]}
      MapViewComponent={MockMapView as never}
      HomeTopBarComponent={MockHomeTopBar as never}
      BottomSheetComponent={MockBottomSheet as never}
    />,
  );

  fireEvent.click(view.getByTestId('sheet-item-trackable-1'));
  fireEvent.click(view.getByRole('button', { name: 'Panel a media altura' }));
  fireEvent.click(view.getByRole('button', { name: 'Ver recorrido' }));

  assert.equal(openSpy.mock.callCount(), 1);
  assert.deepEqual(openSpy.mock.calls[0].arguments, ['https://oficial.example/fuente', '_blank', 'noopener,noreferrer']);
  assert.equal(view.getByTestId('sheet-detail-route-availability').textContent, 'official-source');
});
