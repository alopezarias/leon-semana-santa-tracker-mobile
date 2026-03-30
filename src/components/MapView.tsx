import { useEffect, useMemo, useRef, type Key } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { differenceInSeconds } from 'date-fns';
import { getLocateMePanOffset, getVisibleMapProcessions, type MapDisplayMode } from '../lib/map-view-state';
import { getInterpolatedPosition, getRouteBounds } from '../lib/processions';
import type { Procession, Theme } from '../types/procession';

interface MapViewProps {
  processions: Procession[];
  selectedProcession: Procession | null;
  selectedProcessionId: string | null;
  userLocation: [number, number] | null;
  locateRequestId: number;
  displayMode: MapDisplayMode;
  theme: Theme;
  currentTime: Date;
  viewportPaddingTop: number;
  viewportPaddingBottom: number;
  onMapBackgroundTap: () => void;
}

const LEON_CENTER: LatLngExpression = [42.5987, -5.5671];

const TILE_LAYERS = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
};

function MapBackgroundTapHandler({ onTap }: { onTap: () => void }) {
  useMapEvents({
    click: () => onTap(),
  });

  return null;
}

function MapViewport({
  processions,
  selectedProcession,
  userLocation,
  locateRequestId,
  displayMode,
  viewportPaddingTop,
  viewportPaddingBottom,
}: Pick<MapViewProps, 'processions' | 'selectedProcession' | 'userLocation' | 'locateRequestId' | 'displayMode' | 'viewportPaddingTop' | 'viewportPaddingBottom'>) {
  const map = useMap();
  const lastLocateRequestId = useRef<number | null>(null);

  const selectedBounds = useMemo(() => {
    if (!selectedProcession?.hasGeometry) {
      return null;
    }

    const routeBounds = getRouteBounds([selectedProcession]);
    return routeBounds ? [routeBounds.southWest, routeBounds.northEast] as LatLngBoundsExpression : null;
  }, [selectedProcession]);

  const defaultBounds = useMemo(() => {
    const routeBounds = getRouteBounds(processions.filter((item) => item.hasGeometry));
    return routeBounds ? [routeBounds.southWest, routeBounds.northEast] as LatLngBoundsExpression : null;
  }, [processions]);

  useEffect(() => {
    if (userLocation && lastLocateRequestId.current !== locateRequestId) {
      const panOffsetY = getLocateMePanOffset(viewportPaddingTop, viewportPaddingBottom);
      map.flyTo(userLocation, 16, { duration: 0.8 });

      if (panOffsetY !== 0) {
        const handleMoveEnd = () => {
          map.off('moveend', handleMoveEnd);
          map.panBy([0, panOffsetY], { animate: true, duration: 0.25 });
        };

        map.on('moveend', handleMoveEnd);
      }

      lastLocateRequestId.current = locateRequestId;
      return;
    }

    if (displayMode === 'procession' && selectedBounds) {
      map.fitBounds(selectedBounds, {
        paddingTopLeft: [24, viewportPaddingTop],
        paddingBottomRight: [24, viewportPaddingBottom],
      });
      return;
    }

    if (displayMode === 'day' && defaultBounds) {
      map.fitBounds(defaultBounds, {
        paddingTopLeft: [24, viewportPaddingTop],
        paddingBottomRight: [24, viewportPaddingBottom],
      });
    }
  }, [defaultBounds, displayMode, locateRequestId, map, selectedBounds, userLocation, viewportPaddingBottom, viewportPaddingTop]);

  return null;
}

function ProcessionRoute({
  procession,
  isSelected,
  isDimmed,
  theme,
  currentTime,
}: {
  key?: Key;
  procession: Procession;
  isSelected: boolean;
  isDimmed: boolean;
  theme: Theme;
  currentTime: Date;
}) {
  const geometry = procession.geometry;

  if (!geometry || geometry.path.length === 0) {
    return null;
  }

  const color = theme === 'dark' ? procession.colorDark : procession.colorLight;
  const start = new Date(`${procession.date}T${procession.startTime}:00`);
  let end = new Date(`${procession.date}T${procession.endTime}:00`);

  if (end < start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  const totalDuration = Math.max(1, differenceInSeconds(end, start));
  const elapsed = differenceInSeconds(currentTime, start);
  const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
  const movingPosition = isSelected && currentTime >= start && currentTime <= end
    ? getInterpolatedPosition(geometry.path, progress)
    : null;

  return (
    <>
      <Polyline
        positions={geometry.path}
        eventHandlers={{
          click: (event) => {
            event.originalEvent.stopPropagation();
          },
        }}
        pathOptions={{
          color,
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.92 : isDimmed ? 0.18 : 0.42,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {movingPosition && (
        <CircleMarker
          center={movingPosition}
          radius={9}
          pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }}
        />
      )}
    </>
  );
}

export default function MapView({
  processions,
  selectedProcession,
  selectedProcessionId,
  userLocation,
  locateRequestId,
  displayMode,
  theme,
  currentTime,
  viewportPaddingTop,
  viewportPaddingBottom,
  onMapBackgroundTap,
}: MapViewProps) {
  const tileLayer = TILE_LAYERS[theme];
  const trackableProcessions = processions.filter((procession) => procession.hasGeometry);
  const visibleProcessions = getVisibleMapProcessions({
    processions,
    displayMode,
    selectedProcession,
    selectedProcessionId,
  });

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={LEON_CENTER}
        zoom={15}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer attribution={tileLayer.attribution} url={tileLayer.url} />
        <MapBackgroundTapHandler onTap={onMapBackgroundTap} />
        <MapViewport
          processions={trackableProcessions}
          selectedProcession={selectedProcession}
          userLocation={userLocation}
          locateRequestId={locateRequestId}
          displayMode={displayMode}
          viewportPaddingTop={viewportPaddingTop}
          viewportPaddingBottom={viewportPaddingBottom}
        />

        {visibleProcessions.map((procession) => (
          <ProcessionRoute
            key={procession.id}
            procession={procession}
            isSelected={selectedProcession?.id === procession.id}
            isDimmed={displayMode !== 'procession' && Boolean(selectedProcession && selectedProcession.id !== procession.id)}
            theme={theme}
            currentTime={currentTime}
          />
        ))}

        {userLocation && (
          <>
            <CircleMarker
              center={userLocation}
              radius={18}
              pathOptions={{ color: 'transparent', fillColor: '#38bdf8', fillOpacity: 0.18 }}
            />
            <CircleMarker
              center={userLocation}
              radius={9}
              pathOptions={{ color: '#fff', weight: 3, fillColor: '#0ea5e9', fillOpacity: 0.95 }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
