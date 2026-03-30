import { useEffect, useMemo, useRef, type Key } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import type { ComponentType, ReactNode } from 'react';
import { differenceInSeconds } from 'date-fns';
import { getLocateMePanOffset, getVisibleMapProcessions, type MapDisplayMode } from '../lib/map-view-state';
import { getEstimatedRouteSegments, getInterpolatedPosition, getProcessionStatus, getRouteBounds } from '../lib/processions';
import type { HomePresentation, Procession, Theme } from '../types/procession';

export interface MapViewProps {
  processions: Procession[];
  presentation: HomePresentation;
  selectedProcession: Procession | null;
  userLocation: [number, number] | null;
  locateRequestId: number;
  theme: Theme;
  currentTime: Date;
  viewportPaddingTop: number;
  viewportPaddingBottom: number;
  onMapBackgroundTap: () => void;
  onSelectProcession: (processionId: string) => void;
}

export interface LeafletBindings {
  CircleMarker: ComponentType<Record<string, unknown>>;
  MapContainer: ComponentType<Record<string, unknown> & { children?: ReactNode }>;
  Polyline: ComponentType<Record<string, unknown>>;
  TileLayer: ComponentType<Record<string, unknown>>;
  useMap: () => {
    flyTo: (...args: unknown[]) => void;
    panBy: (...args: unknown[]) => void;
    fitBounds: (...args: unknown[]) => void;
    on: (...args: unknown[]) => void;
    off: (...args: unknown[]) => void;
  };
  useMapEvents: (handlers: Record<string, (...args: any[]) => void>) => void;
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

const defaultLeafletBindings: LeafletBindings = {
  CircleMarker: CircleMarker as unknown as LeafletBindings['CircleMarker'],
  MapContainer: MapContainer as unknown as LeafletBindings['MapContainer'],
  Polyline: Polyline as unknown as LeafletBindings['Polyline'],
  TileLayer: TileLayer as unknown as LeafletBindings['TileLayer'],
  useMap,
  useMapEvents: useMapEvents as LeafletBindings['useMapEvents'],
};

function MapBackgroundTapHandler({ onTap, leaflet }: { onTap: () => void; leaflet: LeafletBindings }) {
  leaflet.useMapEvents({
    click: () => onTap(),
  });

  return null;
}

function MapViewport({
  processions,
  selectedProcession,
  presentation,
  userLocation,
  locateRequestId,
  viewportPaddingTop,
  viewportPaddingBottom,
  leaflet,
}: Pick<MapViewProps, 'processions' | 'selectedProcession' | 'presentation' | 'userLocation' | 'locateRequestId' | 'viewportPaddingTop' | 'viewportPaddingBottom'> & { leaflet: LeafletBindings }) {
  const map = leaflet.useMap();
  const lastLocateRequestId = useRef<number | null>(null);
  const displayMode: MapDisplayMode = presentation.mapDisplayMode;

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
  onSelectProcession,
  leaflet,
}: {
  key?: Key;
  procession: Procession;
  isSelected: boolean;
  isDimmed: boolean;
  theme: Theme;
  currentTime: Date;
  onSelectProcession: (processionId: string) => void;
  leaflet: LeafletBindings;
}) {
  const { CircleMarker: LeafletCircleMarker, Polyline: LeafletPolyline } = leaflet;
  const geometry = procession.geometry;

  if (!geometry || geometry.path.length === 0) {
    return null;
  }

  const color = theme === 'dark' ? procession.colorDark : procession.colorLight;
  const routeSegments = isSelected ? getEstimatedRouteSegments(procession, currentTime) : null;
  const start = new Date(`${procession.date}T${procession.startTime}:00`);
  let end = new Date(`${procession.date}T${procession.endTime}:00`);

  if (end < start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  const totalDuration = Math.max(1, differenceInSeconds(end, start));
  const elapsed = differenceInSeconds(currentTime, start);
  const interpolationProgress = Math.max(0, Math.min(1, elapsed / totalDuration));
  const movingPosition = isSelected && getProcessionStatus(procession, currentTime) === 'active'
    ? getInterpolatedPosition(geometry.path, routeSegments?.progress ?? interpolationProgress)
    : null;
  const baseWeight = isSelected ? 8 : 4;
  const baseOpacity = isSelected ? 0.98 : isDimmed ? 0.16 : 0.46;

  return (
    <>
      {isSelected && (
        <LeafletPolyline
          positions={geometry.path}
          eventHandlers={{
            click: (event) => {
              event.originalEvent.stopPropagation();
              onSelectProcession(procession.id);
            },
          }}
          pathOptions={{
            color: theme === 'dark' ? '#f8fafc' : '#0f172a',
            weight: 12,
            opacity: 0.26,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      <LeafletPolyline
        positions={routeSegments?.completed ?? geometry.path}
        eventHandlers={{
          click: (event) => {
            event.originalEvent.stopPropagation();
            onSelectProcession(procession.id);
          },
        }}
        pathOptions={{
          color: routeSegments ? (theme === 'dark' ? '#94a3b8' : '#475569') : color,
          weight: baseWeight,
          opacity: routeSegments ? 0.72 : baseOpacity,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {routeSegments && (
        <LeafletPolyline
          positions={routeSegments.pending}
          eventHandlers={{
            click: (event) => {
              event.originalEvent.stopPropagation();
              onSelectProcession(procession.id);
            },
          }}
          pathOptions={{
            color,
            weight: 8,
            opacity: 0.98,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {movingPosition && (
        <LeafletCircleMarker
          center={movingPosition}
          radius={9}
          pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }}
        />
      )}
    </>
  );
}

export function MapViewWithBindings({
  processions,
  presentation,
  selectedProcession,
  userLocation,
  locateRequestId,
  theme,
  currentTime,
  viewportPaddingTop,
  viewportPaddingBottom,
  onMapBackgroundTap,
  onSelectProcession,
  leaflet = defaultLeafletBindings,
}: MapViewProps & { leaflet?: LeafletBindings }) {
  const {
    CircleMarker: LeafletCircleMarker,
    MapContainer: LeafletMapContainer,
    TileLayer: LeafletTileLayer,
  } = leaflet;
  const tileLayer = TILE_LAYERS[theme];
  const trackableProcessions = processions.filter((procession) => procession.hasGeometry);
  const visibleProcessions = getVisibleMapProcessions({
    processions,
    presentation,
    selectedProcession,
  });

  return (
    <div className="absolute inset-0 z-0">
      <LeafletMapContainer
        center={LEON_CENTER}
        zoom={15}
        zoomControl={false}
        className="h-full w-full"
      >
        <LeafletTileLayer attribution={tileLayer.attribution} url={tileLayer.url} />
        <MapBackgroundTapHandler onTap={onMapBackgroundTap} leaflet={leaflet} />
        <MapViewport
          processions={trackableProcessions}
          selectedProcession={selectedProcession}
          presentation={presentation}
          userLocation={userLocation}
          locateRequestId={locateRequestId}
          viewportPaddingTop={viewportPaddingTop}
          viewportPaddingBottom={viewportPaddingBottom}
          leaflet={leaflet}
        />

        {visibleProcessions.map((procession) => (
          <ProcessionRoute
            key={procession.id}
            procession={procession}
            isSelected={selectedProcession?.id === procession.id}
            isDimmed={Boolean(selectedProcession && selectedProcession.id !== procession.id)}
            theme={theme}
            currentTime={currentTime}
            onSelectProcession={onSelectProcession}
            leaflet={leaflet}
          />
        ))}

        {userLocation && (
          <>
            <LeafletCircleMarker
              center={userLocation}
              radius={18}
              pathOptions={{ color: 'transparent', fillColor: '#38bdf8', fillOpacity: 0.18 }}
            />
            <LeafletCircleMarker
              center={userLocation}
              radius={9}
              pathOptions={{ color: '#fff', weight: 3, fillColor: '#0ea5e9', fillOpacity: 0.95 }}
            />
          </>
        )}
      </LeafletMapContainer>
    </div>
  );
}

export default function MapView(props: MapViewProps) {
  return <MapViewWithBindings {...props} />;
}
