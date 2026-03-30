import type { Procession } from '../types/procession';

export type MapDisplayMode = 'procession' | 'day' | 'free';

interface VisibleMapProcessionsOptions {
  processions: Procession[];
  displayMode: MapDisplayMode;
  selectedProcession: Procession | null;
  selectedProcessionId: string | null;
}

export const getVisibleMapProcessions = ({
  processions,
  displayMode,
  selectedProcession,
  selectedProcessionId,
}: VisibleMapProcessionsOptions) => {
  const trackableProcessions = processions.filter((procession) => procession.hasGeometry);

  if (displayMode !== 'procession') {
    return trackableProcessions;
  }

  if (selectedProcession?.hasGeometry) {
    return [selectedProcession];
  }

  if (selectedProcessionId) {
    return [];
  }

  return trackableProcessions;
};

export const getLocateMePanOffset = (viewportPaddingTop: number, viewportPaddingBottom: number) => (
  Math.round((viewportPaddingBottom - viewportPaddingTop) / 2)
);
