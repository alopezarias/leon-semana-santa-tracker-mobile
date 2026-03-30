import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, mock, test } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { AvoidZone, HomePresentation, Procession, ProcessionDetailSheetData, ProcessionSheetItem as ProcessionSheetItemModel, QuickFilterKey, SearchQuery } from './types/procession';

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

function MockMapView({ processions, presentation, selectedProcession, avoidZone, onMapBackgroundTap, onSelectProcession }: { processions: Procession[]; presentation: HomePresentation; selectedProcession: Procession | null; locateRequestId: number; viewportPaddingBottom: number; avoidZone?: AvoidZone | null; onMapBackgroundTap: () => void; onSelectProcession: (processionId: string) => void; }) {
  return <section aria-label="Mapa principal"><div data-testid="map-procession-count">{processions.length}</div><div data-testid="map-selected-procession">{selectedProcession?.id ?? 'none'}</div><div data-testid="map-selected-procession-id">{presentation.selectedProcessionId ?? 'none'}</div><div data-testid="home-ux-mode">{presentation.uxMode}</div><div data-testid="map-avoid-zone">{avoidZone?.label ?? 'none'}</div>{processions.map((procession) => <button key={procession.id} type="button" data-testid={`map-route-${procession.id}`} onClick={() => onSelectProcession(procession.id)}>Seleccionar {procession.title}</button>)}<button type="button" onClick={onMapBackgroundTap}>Vaciar selección</button></section>;
}

function MockBottomSheet({ items, availableDays, selectedDay, quickFilter, searchQuery, quickFilterMessage, onSelectDay, onToggleQuickFilter, onResetDiscovery, snap, uxMode, onRequestSnap, onSelectProcession, detailSheetData, onViewRoute, onAvoidZone, avoidZone, onClearAvoidZone }: { items: ProcessionSheetItemModel[]; availableDays: Array<{ date: string; shortLabel: string }>; selectedDay: string | null; quickFilter: QuickFilterKey | null; searchQuery: string; quickFilterMessage?: string | null; onSelectDay: (day: string) => void; onToggleQuickFilter: (filter: QuickFilterKey) => void; onResetDiscovery: () => void; snap: 'collapsed' | 'mid' | 'expanded'; uxMode: 'IDLE' | 'LIST' | 'SELECTED' | 'DETAIL'; onRequestSnap: (snap: 'collapsed' | 'mid' | 'expanded') => void; onSelectProcession: (processionId: string) => void; detailSheetData?: ProcessionDetailSheetData | null; onViewRoute?: () => void; onAvoidZone?: () => void; avoidZone?: AvoidZone | null; onClearAvoidZone?: () => void; }) {
  return <section aria-label="Panel de procesiones"><div data-testid="sheet-snap">{snap}</div><div data-testid="sheet-ux-mode">{uxMode}</div><button type="button" onClick={() => onRequestSnap('expanded')}>Expandir panel</button><button type="button" onClick={() => onRequestSnap('mid')}>Panel a media altura</button>{availableDays.map((day) => <button key={day.date} type="button" onClick={() => onSelectDay(day.date)} data-testid={`sheet-day-${day.date}`} data-selected={selectedDay === day.date ? 'true' : 'false'}>{day.shortLabel}</button>)}{(['today', 'active', 'upcoming', 'nearby'] as QuickFilterKey[]).map((filter) => <button key={filter} type="button" onClick={() => onToggleQuickFilter(filter)} data-testid={`sheet-filter-${filter}`} data-selected={quickFilter === filter ? 'true' : 'false'}>{filter}</button>)}{searchQuery ? <div data-testid="sheet-search-query">{searchQuery}</div> : null}{quickFilterMessage ? <div data-testid="sheet-filter-message">{quickFilterMessage}</div> : null}{avoidZone ? <><div data-testid="sheet-avoid-zone">{avoidZone.label}</div><button type="button" onClick={() => onClearAvoidZone?.()}>Quitar evitar zona</button></> : null}{(searchQuery || quickFilter) ? <button type="button" onClick={onResetDiscovery}>Reset discovery</button> : null}{uxMode === 'DETAIL' && detailSheetData ? <><div data-testid="sheet-detail-title">{detailSheetData.title}</div><button type="button" onClick={() => onViewRoute?.()}>Ver recorrido</button><button type="button" onClick={() => onAvoidZone?.()} disabled={!detailSheetData.canAvoidZone}>Evitar zona</button></> : items.map((item) => <button key={item.id} type="button" onClick={() => onSelectProcession(item.processionId)} data-testid={`sheet-item-${item.processionId}`} data-selected={item.isSelected ? 'true' : 'false'}>{item.title} · {item.mapLabel}</button>)}</section>;
}

function MockHomeTopBar({ searchQuery, resultCount, onSearchChange, onClearSearch, onToggleTheme, onLocateMe }: { theme: 'light' | 'dark'; isLocating: boolean; searchQuery: SearchQuery; resultCount: number; onSearchChange: (value: SearchQuery) => void; onClearSearch: () => void; onToggleTheme: () => void; onLocateMe: () => void; }) {
  return <section aria-label="Barra superior home"><label htmlFor="mock-search">Buscar</label><input id="mock-search" type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} onInput={(event) => onSearchChange((event.target as HTMLInputElement).value)} /><div data-testid="topbar-result-count">{resultCount}</div><button type="button" onClick={onClearSearch}>Limpiar búsqueda</button><button type="button" onClick={onLocateMe}>Centrar en mi ubicación</button><button type="button" onClick={onToggleTheme}>Cambiar tema</button></section>;
}

test('una selección nacida en mapa conserva continuidad hasta detail y se reconcilia con búsqueda', async () => {
  const view = render(<AppShell initialTime={initialTime} processionsData={[baseProcession({ id: 'nazareno', title: 'Nazareno', organizer: 'Cofradía del Nazareno' }), baseProcession({ id: 'perdon', title: 'Perdón', organizer: 'Cofradía del Perdón', startTime: '22:00', endTime: '23:30' })]} MapViewComponent={MockMapView as never} HomeTopBarComponent={MockHomeTopBar as never} BottomSheetComponent={MockBottomSheet as never} />);
  fireEvent.click(view.getByTestId('map-route-perdon'));
  fireEvent.click(view.getByRole('button', { name: 'Panel a media altura' }));
  fireEvent.input(view.getByLabelText('Buscar'), { target: { value: 'nazareno' } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(view.getByTestId('home-ux-mode').textContent, 'LIST');
  assert.equal(view.getByTestId('map-selected-procession-id').textContent, 'none');
});

test('detail activa evitar zona y permite limpiarla sin romper el flujo', () => {
  const view = render(<AppShell initialTime={initialTime} processionsData={[baseProcession({ id: 'nazareno', title: 'Nazareno' }), baseProcession({ id: 'perdon', title: 'Perdón', geometry: { matchedKey: 'perdon', source: 'geometry', path: [[42.61, -5.58], [42.6105, -5.5805]], markers: [] } })]} MapViewComponent={MockMapView as never} HomeTopBarComponent={MockHomeTopBar as never} BottomSheetComponent={MockBottomSheet as never} />);
  fireEvent.click(view.getByTestId('sheet-item-nazareno'));
  fireEvent.click(view.getByRole('button', { name: 'Panel a media altura' }));
  fireEvent.click(view.getByRole('button', { name: 'Evitar zona' }));
  assert.equal(view.getByTestId('sheet-avoid-zone').textContent, 'Nazareno');
  assert.equal(view.getByTestId('map-avoid-zone').textContent, 'Nazareno');
  fireEvent.click(view.getByRole('button', { name: 'Quitar evitar zona' }));
  assert.equal(view.getByTestId('map-avoid-zone').textContent, 'none');
});

test('si la búsqueda invalida la procesión origen del avoid-zone, el estado se limpia', async () => {
  const view = render(<AppShell initialTime={initialTime} processionsData={[baseProcession({ id: 'nazareno', title: 'Nazareno' }), baseProcession({ id: 'perdon', title: 'Perdón', startTime: '22:00', endTime: '23:30' })]} MapViewComponent={MockMapView as never} HomeTopBarComponent={MockHomeTopBar as never} BottomSheetComponent={MockBottomSheet as never} />);
  fireEvent.click(view.getByTestId('sheet-item-nazareno'));
  fireEvent.click(view.getByRole('button', { name: 'Panel a media altura' }));
  fireEvent.click(view.getByRole('button', { name: 'Evitar zona' }));
  fireEvent.input(view.getByLabelText('Buscar'), { target: { value: 'perdon' } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(view.getByTestId('map-avoid-zone').textContent, 'none');
});

test('si búsqueda invalida la selección cae a list manteniendo contexto de descubrimiento', async () => {
  const view = render(<AppShell initialTime={initialTime} processionsData={[baseProcession({ id: 'nazareno', title: 'Nazareno', organizer: 'Cofradía del Nazareno' }), baseProcession({ id: 'perdon', title: 'Perdón', organizer: 'Cofradía del Perdón', startTime: '22:00', endTime: '23:30' })]} MapViewComponent={MockMapView as never} HomeTopBarComponent={MockHomeTopBar as never} BottomSheetComponent={MockBottomSheet as never} />);
  fireEvent.click(view.getByTestId('sheet-item-perdon'));
  fireEvent.input(view.getByLabelText('Buscar'), { target: { value: 'nazareno' } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(view.getByTestId('home-ux-mode').textContent, 'LIST');
  assert.equal(view.getByTestId('sheet-snap').textContent, 'mid');
});
