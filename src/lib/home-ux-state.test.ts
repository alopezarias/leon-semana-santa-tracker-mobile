import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleHomeUxState, getHasDiscoveryContext, resolveHomePresentation, transitionHomeUxState } from './home-ux-state';

test('resolve presentation to canonical tuples', () => {
  assert.deepEqual(resolveHomePresentation(createIdleHomeUxState()), {
    uxMode: 'IDLE',
    selectedProcessionId: null,
    sheetSnap: 'collapsed',
    mapDisplayMode: 'day',
  });

  assert.deepEqual(resolveHomePresentation({ mode: 'LIST', snap: 'expanded' }), {
    uxMode: 'LIST',
    selectedProcessionId: null,
    sheetSnap: 'expanded',
    mapDisplayMode: 'day',
  });

  assert.deepEqual(resolveHomePresentation({ mode: 'SELECTED', selectedProcessionId: 'proc-1' }, { selectedProcessionHasGeometry: false }), {
    uxMode: 'SELECTED',
    selectedProcessionId: 'proc-1',
    sheetSnap: 'collapsed',
    mapDisplayMode: 'day',
  });
});

test('upward gesture from selected goes directly to detail', () => {
  const nextState = transitionHomeUxState({ mode: 'SELECTED', selectedProcessionId: 'proc-1' }, {
    type: 'requestSheetSnap',
    snap: 'mid',
  });

  assert.deepEqual(nextState, { mode: 'DETAIL', selectedProcessionId: 'proc-1' });
});

test('background tap and back collapse by explicit steps', () => {
  assert.deepEqual(
    transitionHomeUxState({ mode: 'DETAIL', selectedProcessionId: 'proc-1' }, { type: 'back', hasDiscoveryContext: true }),
    { mode: 'SELECTED', selectedProcessionId: 'proc-1' },
  );

  assert.deepEqual(
    transitionHomeUxState({ mode: 'SELECTED', selectedProcessionId: 'proc-1' }, { type: 'backgroundTap', hasDiscoveryContext: true }),
    { mode: 'LIST', snap: 'mid' },
  );

  assert.deepEqual(
    transitionHomeUxState({ mode: 'SELECTED', selectedProcessionId: 'proc-1' }, { type: 'backgroundTap', hasDiscoveryContext: false }),
    { mode: 'IDLE', browsingMapMode: 'free' },
  );
});

test('sync visible processions clears invalid selection safely', () => {
  assert.deepEqual(
    transitionHomeUxState({ mode: 'DETAIL', selectedProcessionId: 'proc-1' }, {
      type: 'syncVisibleProcessions',
      visibleProcessionIds: ['proc-2'],
      hasDiscoveryContext: true,
      browsingMapMode: 'day',
    }),
    { mode: 'LIST', snap: 'mid' },
  );

  assert.deepEqual(
    transitionHomeUxState({ mode: 'SELECTED', selectedProcessionId: 'proc-1' }, {
      type: 'syncVisibleProcessions',
      visibleProcessionIds: [],
      hasDiscoveryContext: false,
      browsingMapMode: 'day',
    }),
    { mode: 'IDLE', browsingMapMode: 'day' },
  );
});

test('discovery context keeps empty search results in list mode', () => {
  assert.equal(getHasDiscoveryContext({ visibleProcessionIds: [], searchQuery: 'nazareno', quickFilter: null }), true);
  assert.equal(getHasDiscoveryContext({ visibleProcessionIds: [], searchQuery: '', quickFilter: 'active' }), true);
  assert.equal(getHasDiscoveryContext({ visibleProcessionIds: [], searchQuery: '', quickFilter: null }), false);
});
