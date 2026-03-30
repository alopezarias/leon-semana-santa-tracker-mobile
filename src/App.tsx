/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { useEffect, useMemo, useState } from 'react';
import { format, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import BottomSheet from './components/BottomSheet';
import HomeTopBar from './components/HomeTopBar';
import MapView from './components/MapView';
import type { MapDisplayMode } from './lib/map-view-state';
import {
  getDefaultSelectedProcessionId,
  getProcessionSheetItems,
  processions,
} from './lib/processions';
import type { Procession, SheetSnap, Theme } from './types/procession';

interface ToastState {
  tone: 'success' | 'error';
  message: string;
}

const LOCATION_TIMEOUT_MS = 10000;

const sheetViewportPadding: Record<SheetSnap, number> = {
  collapsed: 176,
  mid: 352,
  expanded: 548,
};

const toastOffset: Record<SheetSnap, string> = {
  collapsed: 'calc(env(safe-area-inset-bottom, 0px) + 24vh + 64px)',
  mid: 'calc(env(safe-area-inset-bottom, 0px) + 54vh + 48px)',
  expanded: 'calc(env(safe-area-inset-bottom, 0px) + 84vh + 28px)',
};

const getDefaultDay = (availableDays: string[], currentDate: string) => {
  if (availableDays.includes(currentDate)) {
    return currentDate;
  }

  return availableDays.find((day) => isAfter(new Date(`${day}T00:00:00`), new Date(`${currentDate}T00:00:00`))) ?? availableDays[0] ?? null;
};

const isPermissionDeniedError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error && typeof error.message === 'string'
    ? error.message.toLowerCase()
    : '';

  return code === 1 || message.includes('permission');
};

const getCurrentNativeLocation = async () => {
  const permissionState = await Geolocation.requestPermissions();
  const hasLocationPermission = permissionState.location === 'granted' || permissionState.coarseLocation === 'granted';

  if (!hasLocationPermission) {
    const permissionError = new Error('Location permission denied');
    (permissionError as Error & { code?: number }).code = 1;
    throw permissionError;
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: LOCATION_TIMEOUT_MS,
    maximumAge: 0,
  });

  return [position.coords.latitude, position.coords.longitude] as [number, number];
};

interface AppShellProps {
  initialTime?: Date;
  processionsData?: Procession[];
  MapViewComponent?: typeof MapView;
  HomeTopBarComponent?: typeof HomeTopBar;
  BottomSheetComponent?: typeof BottomSheet;
}

export function AppShell({
  initialTime = new Date(),
  processionsData = processions,
  MapViewComponent = MapView,
  HomeTopBarComponent = HomeTopBar,
  BottomSheetComponent = BottomSheet,
}: AppShellProps) {
  const [currentTime, setCurrentTime] = useState<Date>(initialTime);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locateRequestId, setLocateRequestId] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    const storedTheme = window.localStorage.getItem('leon-theme');
    return storedTheme === 'light' ? 'light' : 'dark';
  });
  const [selectedProcessionId, setSelectedProcessionId] = useState<string | null | undefined>(undefined);
  const [mapDisplayMode, setMapDisplayMode] = useState<MapDisplayMode>('procession');
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('collapsed');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('leon-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const todayStr = format(currentTime, 'yyyy-MM-dd');

  const availableDays = useMemo(() => {
    const groups = new Map<string, { date: string; label: string; shortLabel: string; count: number }>();

    for (const procession of processionsData) {
      if (groups.has(procession.date)) continue;

      groups.set(procession.date, {
        date: procession.date,
        label: procession.dayLabel,
        shortLabel: format(new Date(`${procession.date}T12:00:00`), 'EEE d MMM', { locale: es }),
        count: processionsData.filter((item) => item.date === procession.date).length,
      });
    }

    return Array.from(groups.values());
  }, [processionsData]);

  useEffect(() => {
    if (!selectedDay) {
      setSelectedDay(getDefaultDay(availableDays.map((day) => day.date), todayStr));
      return;
    }

    const exists = availableDays.some((day) => day.date === selectedDay);
    if (!exists) {
      setSelectedDay(getDefaultDay(availableDays.map((day) => day.date), todayStr));
    }
  }, [availableDays, selectedDay, todayStr]);

  const selectedDayProcessions = useMemo(
    () => processionsData.filter((procession) => procession.date === selectedDay),
    [processionsData, selectedDay],
  );

  useEffect(() => {
    if (!selectedDayProcessions.length) {
      if (selectedProcessionId !== null) {
        setSelectedProcessionId(null);
      }
      setMapDisplayMode('day');
      return;
    }

    const exists = selectedDayProcessions.some((procession) => procession.id === selectedProcessionId);
    if (selectedProcessionId === undefined) {
      const defaultSelectedProcessionId = getDefaultSelectedProcessionId(selectedDayProcessions, currentTime);
      setSelectedProcessionId(defaultSelectedProcessionId);
      setMapDisplayMode(defaultSelectedProcessionId ? 'procession' : 'day');
      return;
    }

    if (selectedProcessionId !== null && !exists) {
      const defaultSelectedProcessionId = getDefaultSelectedProcessionId(selectedDayProcessions, currentTime);
      setSelectedProcessionId(defaultSelectedProcessionId);
      setMapDisplayMode(defaultSelectedProcessionId ? 'procession' : 'day');
    }
  }, [currentTime, selectedDayProcessions, selectedProcessionId]);

  const selectedProcessionIdValue = selectedProcessionId ?? null;

  const selectedProcession = useMemo<Procession | null>(
    () => selectedDayProcessions.find((procession) => procession.id === selectedProcessionIdValue) ?? null,
    [selectedDayProcessions, selectedProcessionIdValue],
  );

  const selectedMapProcession = selectedProcession?.hasGeometry ? selectedProcession : null;

  const sheetItems = useMemo(() => getProcessionSheetItems({
    items: selectedDayProcessions,
    currentTime,
    selectedProcessionId: selectedProcessionIdValue,
    theme,
  }), [currentTime, selectedDayProcessions, selectedProcessionIdValue, theme]);

  const handleLocationSuccess = (position: [number, number]) => {
    setUserLocation(position);
    setLocateRequestId((current) => current + 1);
    setToast({ tone: 'success', message: 'Ubicación centrada en el mapa.' });
    setSheetSnap('collapsed');
    setIsLocating(false);
  };

  const handleLocationError = (error: unknown) => {
    console.error('Error getting location:', error);
    setToast({
      tone: 'error',
      message: isPermissionDeniedError(error)
        ? 'Permite la ubicación para centrar el mapa en tu posición.'
        : 'No se pudo obtener tu ubicación en este momento.',
    });
    setIsLocating(false);
  };

  const handleLocateMe = () => {
    setIsLocating(true);

    if (Capacitor.isNativePlatform()) {
      void getCurrentNativeLocation()
        .then(handleLocationSuccess)
        .catch(handleLocationError);
      return;
    }

    if (!('geolocation' in navigator)) {
      setToast({ tone: 'error', message: 'Tu dispositivo no soporta geolocalización.' });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleLocationSuccess([position.coords.latitude, position.coords.longitude]);
      },
      handleLocationError,
      { enableHighAccuracy: true, timeout: LOCATION_TIMEOUT_MS, maximumAge: 0 },
    );
  };

  const handleSelectProcession = (processionId: string) => {
    setSelectedProcessionId(processionId);
    setMapDisplayMode('procession');
    setSheetSnap('collapsed');
  };

  const handleSelectDay = (day: string) => {
    setSelectedDay(day);
    setSelectedProcessionId(null);
    setMapDisplayMode('day');
    setSheetSnap('collapsed');
  };

  const handleMapBackgroundTap = () => {
    setSelectedProcessionId(null);
    setMapDisplayMode('free');
  };

  return (
    <div className={`relative h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
      <MapViewComponent
        processions={selectedDayProcessions}
        selectedProcession={selectedMapProcession}
        selectedProcessionId={selectedProcessionIdValue}
        userLocation={userLocation}
        locateRequestId={locateRequestId}
        displayMode={mapDisplayMode}
        theme={theme}
        currentTime={currentTime}
        viewportPaddingTop={112}
        viewportPaddingBottom={sheetViewportPadding[sheetSnap]}
        onMapBackgroundTap={handleMapBackgroundTap}
      />

      <HomeTopBarComponent
        title="León en mapa"
        theme={theme}
        isLocating={isLocating}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onLocateMe={handleLocateMe}
      />

      {toast && (
        <div
          className={`absolute left-4 right-4 z-[1300] rounded-[22px] px-4 py-3 text-sm font-medium shadow-xl ${toast.tone === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}
          style={{ bottom: toastOffset[sheetSnap] }}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      <BottomSheetComponent
        items={sheetItems}
        availableDays={availableDays}
        selectedDay={selectedDay}
        onSelectDay={handleSelectDay}
        onSelectProcession={handleSelectProcession}
        theme={theme}
        snap={sheetSnap}
        setSnap={setSheetSnap}
      />
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
