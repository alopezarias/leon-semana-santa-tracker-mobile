import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, mock, test } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { HomePresentation, Procession, ProcessionDetailSheetData, ProcessionSheetItem as ProcessionSheetItemModel, QuickFilterKey, SearchQuery } from './types/procession';

let dom: JSDOM;
let AppShell: typeof import('./App').AppShell;

const baseProcession = (overrides: Partial<Procession> = {}): Procession => ({ id: 'proc-1', slug: 'proc-1', dayLabel: 'Jueves Santo', date: '2026-03-28', title: 'Procesión 1', type: 'Procesión', organizer: 'Cofradía 1', start: 'San Marcelo', time: '18:00', startTime: '18:00', endTime: '20:00', description: 'Descripción', routeLabels: [], colorLight: '#123456', colorDark: '#abcdef', geometry: { matchedKey: 'proc-1', source: 'geometry', path: [[42.59, -5.56], [42.6, -5.57]], markers: [] }, hasGeometry: true, matching: { strategy: 'exact', confidence: 1, matchedKey: 'proc-1' }, ...overrides });
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

function MockMapView({ processions, presentation }: { processions: Procession[]; presentation: HomePresentation; selectedProcession: Procession | null; locateRequestId: number; viewportPaddingBottom: number; onMapBackgroundTap: () => void; onSelectProcession: (processionId: string) => void; }) {
  return <section aria-label="Mapa principal"><div data-testid="map-procession-count">{processions.length}</div><div data-testid="home-ux-mode">{presentation.uxMode}</div></section>;
}

function MockBottomSheet({ items, availableDays, selectedDay, quickFilter, searchQuery, quickFilterMessage, onSelectDay, onToggleQuickFilter, onResetDiscovery, snap, uxMode, onRequestSnap, onSelectProcession }: { items: ProcessionSheetItemModel[]; availableDays: Array<{ date: string; shortLabel: string }>; selectedDay: string | null; quickFilter: QuickFilterKey | null; searchQuery: string; quickFilterMessage?: string | null; onSelectDay: (day: string) => void; onToggleQuickFilter: (filter: QuickFilterKey) => void; onResetDiscovery: () => void; snap: 'collapsed' | 'mid' | 'expanded'; uxMode: 'IDLE' | 'LIST' | 'SELECTED' | 'DETAIL'; onRequestSnap: (snap: 'collapsed' | 'mid' | 'expanded') => void; onSelectProcession: (processionId: string) => void; detailSheetData?: ProcessionDetailSheetData | null; onViewRoute?: () => void; onAvoidZone?: () => void; avoidZone?: unknown; onClearAvoidZone?: () => void; }) {
  return <section aria-label="Panel de procesiones"><div data-testid="sheet-snap">{snap}</div><div data-testid="sheet-ux-mode">{uxMode}</div>{availableDays.map((day) => <button key={day.date} type="button" onClick={() => onSelectDay(day.date)} data-testid={`sheet-day-${day.date}`} data-selected={selectedDay === day.date ? 'true' : 'false'}>{day.shortLabel}</button>)}{(['today', 'active', 'upcoming', 'nearby'] as QuickFilterKey[]).map((filter) => <button key={filter} type="button" onClick={() => onToggleQuickFilter(filter)} data-testid={`sheet-filter-${filter}`} data-selected={quickFilter === filter ? 'true' : 'false'}>{filter}</button>)}{searchQuery ? <div data-testid="sheet-search-query">{searchQuery}</div> : null}{quickFilterMessage ? <div data-testid="sheet-filter-message">{quickFilterMessage}</div> : null}{(searchQuery || quickFilter) ? <button type="button" onClick={onResetDiscovery}>Reset discovery</button> : null}{items.map((item) => <button key={item.id} type="button" onClick={() => onSelectProcession(item.processionId)} data-testid={`sheet-item-${item.processionId}`} data-selected={item.isSelected ? 'true' : 'false'}>{item.title} · {item.mapLabel}</button>)}</section>;
}

function MockHomeTopBar({ searchQuery, resultCount, onSearchChange, onClearSearch, onToggleTheme, onLocateMe }: { theme: 'light' | 'dark'; isLocating: boolean; searchQuery: SearchQuery; resultCount: number; onSearchChange: (value: SearchQuery) => void; onClearSearch: () => void; onToggleTheme: () => void; onLocateMe: () => void; }) {
  return <section aria-label="Barra superior home"><label htmlFor="mock-search">Buscar</label><input id="mock-search" type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} onInput={(event) => onSearchChange((event.target as HTMLInputElement).value)} /><div data-testid="topbar-result-count">{resultCount}</div><button type="button" onClick={onClearSearch}>Limpiar búsqueda</button><button type="button" onClick={onLocateMe}>Centrar en mi ubicación</button><button type="button" onClick={onToggleTheme}>Cambiar tema</button></section>;
}

test('sin resultados por búsqueda mantiene list para mostrar estado vacío', async () => {
  const view = render(<AppShell initialTime={initialTime} processionsData={[baseProcession({ id: 'nazareno', title: 'Nazareno' })]} MapViewComponent={MockMapView as never} HomeTopBarComponent={MockHomeTopBar as never} BottomSheetComponent={MockBottomSheet as never} />);
  fireEvent.input(view.getByLabelText('Buscar'), { target: { value: 'perdon' } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(view.getByTestId('home-ux-mode').textContent, 'LIST');
  assert.equal(view.getByRole('button', { name: 'Reset discovery' }).tagName, 'BUTTON');
});

test('el filtro Cerca pide ubicación bajo demanda y si falla no vacía resultados', () => {
  const getCurrentPosition = mock.fn((_: PositionCallback, error: PositionErrorCallback) => error({ code: 1, message: 'permission denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError));
  Object.defineProperty(globalThis.navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
  const view = render(<AppShell initialTime={initialTime} processionsData={[baseProcession({ id: 'trackable-1', title: 'Trackable 1' }), baseProcession({ id: 'trackable-2', title: 'Trackable 2', startTime: '22:00', endTime: '23:30' })]} MapViewComponent={MockMapView as never} HomeTopBarComponent={MockHomeTopBar as never} BottomSheetComponent={MockBottomSheet as never} />);
  fireEvent.click(view.getByTestId('sheet-filter-nearby'));
  assert.equal(getCurrentPosition.mock.callCount(), 1);
  assert.equal(view.getByTestId('map-procession-count').textContent, '2');
  assert.match(view.getByTestId('sheet-filter-message').textContent ?? '', /revisa el permiso/i);
});

test('cerca muestra estado vacío útil cuando no hay rutas válidas', () => {
  const getCurrentPosition = mock.fn((success: (position: GeolocationPosition) => void) => success({ coords: { latitude: 42.601, longitude: -5.57, accuracy: 1, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON: () => ({}) }, timestamp: Date.now(), toJSON: () => ({}) } as GeolocationPosition));
  Object.defineProperty(globalThis.navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
  const view = render(<AppShell initialTime={initialTime} processionsData={[baseProcession({ id: 'no-geometry', title: 'Sin recorrido', hasGeometry: false, geometry: null })]} MapViewComponent={MockMapView as never} HomeTopBarComponent={MockHomeTopBar as never} BottomSheetComponent={MockBottomSheet as never} />);
  fireEvent.click(view.getByTestId('sheet-filter-nearby'));
  assert.equal(view.getByTestId('map-procession-count').textContent, '0');
  assert.match(view.getByTestId('sheet-filter-message').textContent ?? '', /no encontramos recorridos válidos cerca de ti/i);
});

test('limpiar búsqueda y filtros recupera el listado completo', () => {
  const view = render(<AppShell initialTime={initialTime} processionsData={[baseProcession({ id: 'nazareno', title: 'Nazareno' }), baseProcession({ id: 'perdon', title: 'Perdón', startTime: '22:00', endTime: '23:30' })]} MapViewComponent={MockMapView as never} HomeTopBarComponent={MockHomeTopBar as never} BottomSheetComponent={MockBottomSheet as never} />);
  fireEvent.change(view.getByLabelText('Buscar'), { target: { value: 'nazareno' } });
  fireEvent.click(view.getByTestId('sheet-filter-active'));
  fireEvent.click(view.getByRole('button', { name: 'Reset discovery' }));
  assert.equal(view.getByTestId('map-procession-count').textContent, '2');
  assert.equal(view.getByTestId('topbar-result-count').textContent, '2');
});
