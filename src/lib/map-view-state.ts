import type { HomePresentation, Procession } from '../types/procession';

export type MapDisplayMode = 'procession' | 'day' | 'free';

interface VisibleMapProcessionsOptions {
  processions: Procession[];
  presentation: HomePresentation;
  selectedProcession: Procession | null;
}

export const getVisibleMapProcessions = ({
  processions,
  presentation,
  selectedProcession,
}: VisibleMapProcessionsOptions) => {
  const trackableProcessions = processions.filter((procession) => procession.hasGeometry);
  const { mapDisplayMode, selectedProcessionId } = presentation;

  if (mapDisplayMode !== 'procession') {
    return trackableProcessions;
  }

  if (selectedProcession?.hasGeometry) {
    return [
      selectedProcession,
      ...trackableProcessions.filter((procession) => procession.id !== selectedProcession.id),
    ];
  }

  if (selectedProcessionId) {
    return trackableProcessions;
  }

  return trackableProcessions;
};

export const getLocateMePanOffset = (viewportPaddingTop: number, viewportPaddingBottom: number) => (
  Math.round((viewportPaddingBottom - viewportPaddingTop) / 2)
);
