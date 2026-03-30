import { useState } from 'react';
import clsx from 'clsx';
import type { ProcessionDetailSheetData, Theme } from '../types/procession';

interface ProcessionDetailSheetProps {
  detail: ProcessionDetailSheetData;
  theme: Theme;
  onViewRoute?: () => void;
}

const isRouteActionAvailable = (routeAvailability: ProcessionDetailSheetData['routeAvailability']) => (
  routeAvailability !== 'unavailable' && routeAvailability !== 'tracking-only'
);

export default function ProcessionDetailSheet({ detail, theme, onViewRoute }: ProcessionDetailSheetProps) {
  const isDark = theme === 'dark';
  const [itineraryNoticeVisible, setItineraryNoticeVisible] = useState(false);
  const canViewRoute = isRouteActionAvailable(detail.routeAvailability);
  const shouldOpenExternal = Boolean(detail.officialMapUrl || detail.officialSourceUrl);

  const handleViewRoute = () => {
    if (!canViewRoute) {
      return;
    }

    if (shouldOpenExternal) {
      onViewRoute?.();
      return;
    }

    setItineraryNoticeVisible(true);
  };

  return (
    <article className="space-y-4 pb-2" aria-label="Detalle de procesión">
      <header className={clsx(
        'rounded-[24px] border p-4',
        isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50',
      )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx(
            'inline-flex min-h-8 items-center rounded-full px-3 text-[11px] font-semibold',
            detail.statusLabel === 'En directo'
              ? 'bg-emerald-500/15 text-emerald-400'
              : isDark ? 'bg-white/[0.08] text-slate-300' : 'bg-white text-slate-600',
          )}
          >
            {detail.statusLabel}
          </span>
          <span className={clsx('text-xs font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {detail.dayLabel}
          </span>
        </div>

        <h2 className="mt-3 text-xl font-semibold leading-tight">{detail.title}</h2>
        <p className={clsx('mt-1 text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>{detail.organizer}</p>

        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className={clsx('text-[11px] font-semibold uppercase tracking-[0.16em]', isDark ? 'text-slate-500' : 'text-slate-400')}>Horario</dt>
            <dd className="mt-1 text-sm font-medium">{detail.timeLabel}</dd>
          </div>
          <div>
            <dt className={clsx('text-[11px] font-semibold uppercase tracking-[0.16em]', isDark ? 'text-slate-500' : 'text-slate-400')}>Salida</dt>
            <dd className="mt-1 text-sm font-medium">{detail.startLabel}</dd>
          </div>
          <div>
            <dt className={clsx('text-[11px] font-semibold uppercase tracking-[0.16em]', isDark ? 'text-slate-500' : 'text-slate-400')}>Mapa</dt>
            <dd className="mt-1 text-sm font-medium">{detail.isTrackable ? 'Seguimiento en mapa disponible' : 'Sin seguimiento en mapa'}</dd>
          </div>
        </dl>
      </header>

      <section className={clsx(
        'rounded-[24px] border p-4',
        isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white',
      )}
      >
        <h3 className="text-sm font-semibold">Descripción</h3>
        <p className={clsx('mt-2 text-sm leading-6', isDark ? 'text-slate-300' : 'text-slate-600')}>{detail.description}</p>
      </section>

      <section className={clsx(
        'rounded-[24px] border p-4',
        isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white',
      )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Recorrido</h3>
            <p className={clsx('mt-1 text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>{detail.routeAvailabilityLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleViewRoute}
            disabled={!canViewRoute}
            className={clsx(
              'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-[transform,background-color,color,opacity] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55',
              isDark ? 'bg-sky-500 text-white' : 'bg-slate-900 text-white',
            )}
          >
            Ver recorrido
          </button>
        </div>

        <p className={clsx('mt-3 text-sm leading-6', isDark ? 'text-slate-400' : 'text-slate-500')}>
          {detail.routeFallbackText}
        </p>

        {detail.officialItinerary ? (
          <div className={clsx(
            'mt-4 rounded-[20px] border px-4 py-3',
            isDark ? 'border-white/10 bg-slate-950/70' : 'border-slate-200 bg-slate-50',
          )}
          >
            <p className={clsx('text-[11px] font-semibold uppercase tracking-[0.16em]', isDark ? 'text-slate-500' : 'text-slate-400')}>
              Itinerario oficial
            </p>
            <p className={clsx('mt-2 text-sm leading-6', isDark ? 'text-slate-200' : 'text-slate-700')}>
              {detail.officialItinerary}
            </p>
          </div>
        ) : null}

        {itineraryNoticeVisible ? (
          <p className={clsx('mt-3 text-sm font-medium', isDark ? 'text-sky-300' : 'text-sky-700')}>
            Itinerario oficial listo para consultar.
          </p>
        ) : null}
      </section>
    </article>
  );
}
