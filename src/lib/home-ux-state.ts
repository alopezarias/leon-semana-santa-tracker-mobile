import type { HomeBrowsingMapMode, HomePresentation, HomeUxState, QuickFilterKey, SearchQuery, SheetSnap } from '../types/procession';

export interface HomeDiscoveryContext {
  visibleProcessionIds: string[];
  searchQuery: SearchQuery;
  quickFilter: QuickFilterKey | null;
}

export type HomeUxAction =
  | { type: 'openList'; snap?: 'mid' | 'expanded' }
  | { type: 'selectProcession'; processionId: string }
  | { type: 'expandDetail' }
  | { type: 'collapseDetail' }
  | { type: 'backgroundTap'; hasDiscoveryContext: boolean }
  | { type: 'back'; hasDiscoveryContext: boolean }
  | { type: 'requestSheetSnap'; snap: SheetSnap }
  | { type: 'syncVisibleProcessions'; visibleProcessionIds: string[]; hasDiscoveryContext: boolean; browsingMapMode?: HomeBrowsingMapMode };

export const createIdleHomeUxState = (browsingMapMode: HomeBrowsingMapMode = 'day'): HomeUxState => ({
  mode: 'IDLE',
  browsingMapMode,
});

export const getHasDiscoveryContext = ({
  visibleProcessionIds,
  searchQuery,
  quickFilter,
}: HomeDiscoveryContext) => visibleProcessionIds.length > 0 || searchQuery.trim().length > 0 || quickFilter !== null;

export const resolveBrowsingFallbackState = ({
  hasDiscoveryContext,
  browsingMapMode = 'day',
}: {
  hasDiscoveryContext: boolean;
  browsingMapMode?: HomeBrowsingMapMode;
}): HomeUxState => {
  if (hasDiscoveryContext) {
    return { mode: 'LIST', snap: 'mid' };
  }

  return createIdleHomeUxState(browsingMapMode);
};

export const resolveHomePresentation = (
  state: HomeUxState,
  options?: { selectedProcessionHasGeometry?: boolean | null },
): HomePresentation => {
  const selectedMapMode = options?.selectedProcessionHasGeometry === false ? 'day' : 'procession';

  switch (state.mode) {
    case 'IDLE':
      return {
        uxMode: state.mode,
        selectedProcessionId: null,
        sheetSnap: 'collapsed',
        mapDisplayMode: state.browsingMapMode,
      };
    case 'LIST':
      return {
        uxMode: state.mode,
        selectedProcessionId: null,
        sheetSnap: state.snap,
        mapDisplayMode: 'day',
      };
    case 'SELECTED':
      return {
        uxMode: state.mode,
        selectedProcessionId: state.selectedProcessionId,
        sheetSnap: 'collapsed',
        mapDisplayMode: selectedMapMode,
      };
    case 'DETAIL':
      return {
        uxMode: state.mode,
        selectedProcessionId: state.selectedProcessionId,
        sheetSnap: 'expanded',
        mapDisplayMode: selectedMapMode,
      };
    default:
      return state satisfies never;
  }
};

export const transitionHomeUxState = (state: HomeUxState, action: HomeUxAction): HomeUxState => {
  switch (action.type) {
    case 'openList':
      return { mode: 'LIST', snap: action.snap ?? 'mid' };
    case 'selectProcession':
      return { mode: 'SELECTED', selectedProcessionId: action.processionId };
    case 'expandDetail':
      if (state.mode === 'SELECTED' || state.mode === 'DETAIL') {
        return { mode: 'DETAIL', selectedProcessionId: state.selectedProcessionId };
      }

      if (state.mode === 'LIST') {
        return { mode: 'LIST', snap: 'expanded' };
      }

      return { mode: 'LIST', snap: 'mid' };
    case 'collapseDetail':
      if (state.mode === 'DETAIL') {
        return { mode: 'SELECTED', selectedProcessionId: state.selectedProcessionId };
      }

      if (state.mode === 'LIST') {
        return state.snap === 'expanded' ? { mode: 'LIST', snap: 'mid' } : createIdleHomeUxState();
      }

      return state;
    case 'backgroundTap':
    case 'back':
      if (state.mode === 'DETAIL') {
        return { mode: 'SELECTED', selectedProcessionId: state.selectedProcessionId };
      }

      if (state.mode === 'SELECTED') {
        return resolveBrowsingFallbackState({ hasDiscoveryContext: action.hasDiscoveryContext, browsingMapMode: 'free' });
      }

      return state;
    case 'requestSheetSnap':
      if (action.snap === 'collapsed') {
        if (state.mode === 'DETAIL') {
          return { mode: 'SELECTED', selectedProcessionId: state.selectedProcessionId };
        }

        if (state.mode === 'LIST') {
          return createIdleHomeUxState();
        }

        return state;
      }

      if (action.snap === 'mid') {
        if (state.mode === 'DETAIL') {
          return { mode: 'SELECTED', selectedProcessionId: state.selectedProcessionId };
        }

        if (state.mode === 'SELECTED') {
          return { mode: 'DETAIL', selectedProcessionId: state.selectedProcessionId };
        }

        return { mode: 'LIST', snap: 'mid' };
      }

      if (state.mode === 'SELECTED' || state.mode === 'DETAIL') {
        return { mode: 'DETAIL', selectedProcessionId: state.selectedProcessionId };
      }

      return { mode: 'LIST', snap: 'expanded' };
    case 'syncVisibleProcessions': {
      const browsingMapMode = action.browsingMapMode ?? 'day';
      const hasVisibleResults = action.visibleProcessionIds.length > 0;

      if (state.mode === 'SELECTED' || state.mode === 'DETAIL') {
        if (action.visibleProcessionIds.includes(state.selectedProcessionId)) {
          return state;
        }

        return resolveBrowsingFallbackState({
          hasDiscoveryContext: action.hasDiscoveryContext,
          browsingMapMode,
        });
      }

      if (state.mode === 'LIST' && !action.hasDiscoveryContext) {
        return createIdleHomeUxState(browsingMapMode);
      }

      if (state.mode === 'IDLE' && hasVisibleResults && browsingMapMode !== 'free') {
        return createIdleHomeUxState('day');
      }

      return state;
    }
    default:
      return action satisfies never;
  }
};
