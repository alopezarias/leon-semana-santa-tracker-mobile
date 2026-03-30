import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import ProcessionSheetItem from './ProcessionSheetItem';
import type { HomeUxMode, ProcessionSheetItem as ProcessionSheetItemModel, QuickFilterKey, SheetSnap, Theme } from '../types/procession';

interface AvailableDay {
  date: string;
  label: string;
  shortLabel: string;
  count: number;
}

interface BottomSheetProps {
  items: ProcessionSheetItemModel[];
  availableDays: AvailableDay[];
  selectedDay: string | null;
  quickFilter: QuickFilterKey | null;
  searchQuery: string;
  quickFilterMessage?: string | null;
  onSelectDay: (date: string) => void;
  onToggleQuickFilter: (filter: QuickFilterKey) => void;
  onResetDiscovery: () => void;
  onSelectProcession: (processionId: string) => void;
  theme: Theme;
  uxMode: HomeUxMode;
  snap: SheetSnap;
  onRequestSnap: (snap: SheetSnap) => void;
}

const snapRatio: Record<SheetSnap, number> = {
  collapsed: 0.24,
  mid: 0.54,
  expanded: 0.84,
};

const snapOrder: SheetSnap[] = ['collapsed', 'mid', 'expanded'];
const QUICK_FILTER_LABELS: Record<QuickFilterKey, string> = {
  today: 'Hoy',
  active: 'En curso',
  upcoming: 'Próximas',
  nearby: 'Cerca',
};

const nextSnap = (current: SheetSnap) => snapOrder[Math.min(snapOrder.length - 1, snapOrder.indexOf(current) + 1)];

export const getSheetSnapHeights = (viewportHeight: number): Record<SheetSnap, number> => ({
  collapsed: Math.round(viewportHeight * snapRatio.collapsed),
  mid: Math.round(viewportHeight * snapRatio.mid),
  expanded: Math.round(viewportHeight * snapRatio.expanded),
});

export const resolveSheetSnap = ({
  snap,
  offsetY,
  velocityY,
  snapHeights,
}: {
  snap: SheetSnap;
  offsetY: number;
  velocityY: number;
  snapHeights: Record<SheetSnap, number>;
}): SheetSnap => {
  const projectedHeight = snapHeights[snap] - offsetY - (velocityY * 0.16);

  return snapOrder.reduce((closestSnap, candidateSnap) => {
    const candidateDistance = Math.abs(snapHeights[candidateSnap] - projectedHeight);
    const closestDistance = Math.abs(snapHeights[closestSnap] - projectedHeight);
    return candidateDistance < closestDistance ? candidateSnap : closestSnap;
  }, snapOrder[0]);
};

export default function BottomSheet({
  items,
  availableDays,
  selectedDay,
  quickFilter,
  searchQuery,
  quickFilterMessage,
  onSelectDay,
  onToggleQuickFilter,
  onResetDiscovery,
  onSelectProcession,
  theme,
  uxMode,
  snap,
  onRequestSnap,
}: BottomSheetProps) {
  const isDark = theme === 'dark';
  const shouldReduceMotion = useReducedMotion();
  const [viewportHeight, setViewportHeight] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsSettling(true);
    const timer = window.setTimeout(() => setIsSettling(false), 180);
    return () => window.clearTimeout(timer);
  }, [snap]);

  const snapHeights = useMemo(() => getSheetSnapHeights(viewportHeight), [viewportHeight]);

  return (
    <motion.section
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.16}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          onRequestSnap(resolveSheetSnap({
            snap,
            offsetY: info.offset.y,
            velocityY: info.velocity.y,
            snapHeights,
          }));
      }}
      animate={{
        height: snapHeights[snap],
        boxShadow: isDragging
          ? '0 -18px 44px rgba(2, 6, 23, 0.26)'
          : '0 -24px 50px rgba(2, 6, 23, 0.34)',
      }}
      transition={shouldReduceMotion
        ? { duration: 0.18 }
        : { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 }}
      className={`absolute inset-x-0 bottom-0 z-[1200] overflow-hidden rounded-t-[30px] border-t shadow-[0_-24px_50px_rgba(2,6,23,0.34)] ${
        isDark ? 'border-white/10 bg-slate-950/94 text-white' : 'border-slate-200 bg-white/96 text-slate-900'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <div className="flex h-full flex-col px-4 pb-2 pt-3">
        <button
          type="button"
          onClick={() => onRequestSnap(nextSnap(snap))}
          className="-mx-2 mb-3 flex min-h-14 items-center justify-between gap-3 rounded-[24px] px-2 text-left transition-colors active:scale-[0.995]"
          aria-label="Cambiar altura del panel"
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-1.5 w-12 rounded-full transition-all ${
                isDragging || isSettling
                  ? isDark
                    ? 'bg-sky-300 shadow-[0_0_0_4px_rgba(56,189,248,0.14)]'
                    : 'bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.14)]'
                  : isDark
                    ? 'bg-slate-600'
                    : 'bg-slate-300'
              }`}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold">Procesiones</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {items.length ? `${items.length} disponibles` : 'Sin procesiones en esta vista'}
              </p>
            </div>
          </div>

          <span className={`text-[11px] font-medium uppercase tracking-[0.18em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {uxMode === 'DETAIL' ? 'detalle' : snap}
          </span>
        </button>

        {snap !== 'collapsed' && availableDays.length > 0 ? (
          <>
            <div className="hide-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
              {availableDays.map((day) => {
                const isSelected = selectedDay === day.date;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => onSelectDay(day.date)}
                    className={`min-h-12 min-w-[108px] rounded-[20px] px-4 py-3 text-left text-sm transition-[transform,background-color,color] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : isDark
                          ? 'bg-white/[0.08] text-slate-200'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="text-[11px] opacity-80">{day.shortLabel}</div>
                    <div className="mt-1 font-semibold">{day.count}</div>
                  </button>
                );
              })}
            </div>

            <div className="hide-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
              {(Object.keys(QUICK_FILTER_LABELS) as QuickFilterKey[]).map((filter) => {
                const isActive = quickFilter === filter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => onToggleQuickFilter(filter)}
                    className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-[transform,background-color,color,border-color] active:scale-[0.98] ${
                      isActive
                        ? 'border border-sky-400 bg-sky-500 text-white'
                        : isDark
                          ? 'border border-white/10 bg-white/[0.06] text-slate-200'
                          : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                    aria-pressed={isActive}
                  >
                    {QUICK_FILTER_LABELS[filter]}
                  </button>
                );
              })}
            </div>

            {quickFilterMessage ? (
              <p className={`mb-3 px-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {quickFilterMessage}
              </p>
            ) : null}
          </>
        ) : null}

        <div className="hide-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
          {items.length ? items.map((item) => (
            <ProcessionSheetItem
              key={item.id}
              item={item}
              theme={theme}
              onSelect={onSelectProcession}
            />
          )) : (
            <div className={`rounded-[22px] border border-dashed px-4 py-5 text-sm ${isDark ? 'border-white/10 bg-white/[0.05] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              <p className="font-semibold">
                {searchQuery || quickFilter
                  ? 'No hay resultados con la búsqueda o filtros actuales.'
                  : 'No hay procesiones para este día.'}
              </p>
              <p className="mt-2">
                {searchQuery || quickFilter
                  ? 'Prueba a limpiar la búsqueda o quitar el filtro activo.'
                  : 'El mapa sigue disponible mientras cambias de día.'}
              </p>
              {(searchQuery || quickFilter) ? (
                <button
                  type="button"
                  onClick={onResetDiscovery}
                  className={`mt-4 inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium ${
                    isDark ? 'bg-white/[0.08] text-white' : 'bg-slate-900 text-white'
                  }`}
                >
                  Limpiar búsqueda y filtros
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
