import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import BottomSheet, { getSheetSnapHeights, resolveSheetSnap } from './BottomSheet';
import ProcessionSheetItem from './ProcessionSheetItem';

let dom: JSDOM;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  globalThis.window = dom.window as typeof globalThis.window & Window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.Node = dom.window.Node;
});

afterEach(() => {
  cleanup();
  dom.window.close();
});

test('los snaps del sheet priorizan el punto más cercano con inercia creíble', () => {
  const snapHeights = getSheetSnapHeights(800);

  assert.equal(resolveSheetSnap({ snap: 'mid', offsetY: 210, velocityY: 120, snapHeights }), 'collapsed');
  assert.equal(resolveSheetSnap({ snap: 'collapsed', offsetY: -180, velocityY: -820, snapHeights }), 'mid');
  assert.equal(resolveSheetSnap({ snap: 'mid', offsetY: -170, velocityY: -1050, snapHeights }), 'expanded');
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
  assert.equal(view.getByRole('button').className.includes('min-h-[88px]'), true);
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
      uxMode="LIST"
      snap="mid"
      onRequestSnap={() => {}}
    />,
  );

  assert.equal(view.getByLabelText('Cambiar altura del panel').className.includes('min-h-14'), true);
  assert.equal(view.getByRole('button', { name: /jue 28 mar/i }).className.includes('min-h-12'), true);
  assert.equal(view.getByRole('button', { name: 'Hoy' }).tagName, 'BUTTON');
  assert.equal(view.getByText('Activa tu ubicación para ordenar por cercanía.').tagName, 'P');
});
