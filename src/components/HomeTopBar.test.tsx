import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { render } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import HomeTopBar from './HomeTopBar';

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

test('la top bar muestra un input real y acciones táctiles claras', () => {
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
  assert.equal(view.getByLabelText('Centrar en mi ubicación').className.includes('h-12 w-12'), true);
  assert.equal(view.getByLabelText('Cambiar tema').className.includes('h-12 w-12'), true);
});
