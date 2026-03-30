import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ProcessionDetailSheetData } from '../types/procession';
import ProcessionDetailSheet from './ProcessionDetailSheet';

let dom: JSDOM;

const baseDetail = (overrides: Partial<ProcessionDetailSheetData> = {}): ProcessionDetailSheetData => ({
  processionId: 'proc-1',
  title: 'Procesión del Perdón',
  organizer: 'Cofradía del Perdón',
  dayLabel: 'Jueves Santo',
  timeLabel: '18:00 · 20:00',
  statusLabel: 'En directo',
  startLabel: 'Sale de San Marcelo',
  description: 'Descripción oficial.',
  isTrackable: true,
  officialItinerary: 'San Marcelo · Calle Ancha · Plaza Mayor',
  officialMapUrl: 'https://oficial.example/mapa',
  officialSourceUrl: 'https://oficial.example/fuente',
  routeAvailability: 'official-map',
  routeAvailabilityLabel: 'Recorrido oficial disponible',
  routeFallbackText: 'Puedes abrir el recorrido oficial y consultar también el itinerario textual si está disponible.',
  canAvoidZone: true,
  avoidZoneReason: 'Oculta temporalmente esta zona en tu vista local. No recalcula rutas.',
  ...overrides,
});

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  globalThis.window = dom.window as typeof globalThis.window & Window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.Node = dom.window.Node;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  cleanup();
  dom.window.close();
});

test('renderiza la ficha expandida con CTA segura cuando hay recorrido oficial', () => {
  let clicks = 0;
  let avoidZoneClicks = 0;

  const view = render(
    <ProcessionDetailSheet
      detail={baseDetail()}
      theme="dark"
      onViewRoute={() => {
        clicks += 1;
      }}
      onAvoidZone={() => {
        avoidZoneClicks += 1;
      }}
    />,
  );

  assert.equal(view.getByText('Procesión del Perdón').tagName, 'H2');
  assert.equal(view.getByText('Cofradía del Perdón').tagName, 'P');
  assert.equal(view.getByRole('button', { name: 'Ver recorrido' }).tagName, 'BUTTON');
  assert.match(view.getByText(/recorrido oficial disponible/i).textContent ?? '', /oficial/i);

  fireEvent.click(view.getByRole('button', { name: 'Ver recorrido' }));
  fireEvent.click(view.getByRole('button', { name: 'Evitar zona' }));
  assert.equal(clicks, 1);
  assert.equal(avoidZoneClicks, 1);
  assert.match(view.getByText(/oculta temporalmente esta zona/i).textContent ?? '', /local/i);
});

test('muestra itinerario y CTA local cuando solo existe itinerario oficial', () => {
  const view = render(
    <ProcessionDetailSheet
      detail={baseDetail({
        officialMapUrl: null,
        officialSourceUrl: null,
        routeAvailability: 'official-itinerary',
        routeAvailabilityLabel: 'Itinerario oficial disponible',
        routeFallbackText: 'Consulta el itinerario oficial textual desde esta ficha.',
      })}
      theme="light"
    />,
  );

  fireEvent.click(view.getByRole('button', { name: 'Ver recorrido' }));

  assert.match(view.getByText(/san marcelo · calle ancha · plaza mayor/i).textContent ?? '', /plaza mayor/i);
  assert.equal(view.getByText(/itinerario oficial listo para consultar/i).tagName, 'P');
});

test('desactiva la CTA y mantiene fallbacks explícitos con datos parciales', () => {
  const view = render(
    <ProcessionDetailSheet
      detail={baseDetail({
        description: 'Descripción oficial pendiente de publicación.',
        officialItinerary: null,
        officialMapUrl: null,
        officialSourceUrl: null,
        isTrackable: false,
        routeAvailability: 'unavailable',
        routeAvailabilityLabel: 'Recorrido no disponible',
        routeFallbackText: 'Recorrido no disponible por ahora.',
        canAvoidZone: false,
        avoidZoneReason: 'Evitar zona solo está disponible cuando la procesión tiene geometría válida.',
      })}
      theme="dark"
    />,
  );

  assert.equal(view.getByRole('button', { name: 'Ver recorrido' }).getAttribute('disabled'), '');
  assert.equal(view.getByRole('button', { name: 'Evitar zona' }).getAttribute('disabled'), '');
  assert.equal(view.getByText(/descripción oficial pendiente/i).tagName, 'P');
  assert.equal(view.getByText(/recorrido no disponible por ahora/i).tagName, 'P');
  assert.equal(view.getByText(/sin seguimiento en mapa/i).tagName, 'DD');
  assert.match(view.getByText(/evitar zona solo está disponible/i).textContent ?? '', /geometría válida/i);
});
