import clsx from 'clsx';
import { MapPin } from 'lucide-react';
import { PROCESSION_STATUS_LABELS, type ProcessionSheetItem as ProcessionSheetItemModel, type Theme } from '../types/procession';

interface ProcessionSheetItemProps {
  key?: string;
  item: ProcessionSheetItemModel;
  theme: Theme;
  onSelect: (processionId: string) => void;
}

export default function ProcessionSheetItem({ item, theme, onSelect }: ProcessionSheetItemProps) {
  const isDark = theme === 'dark';
  const distanceLabel = item.distanceMeters !== undefined
    ? `A ${Math.max(50, Math.round(item.distanceMeters / 50) * 50)} m`
    : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.processionId)}
      className={clsx(
        'min-h-[88px] w-full rounded-[22px] border px-4 py-3.5 text-left transition-[transform,background-color,border-color,box-shadow] active:scale-[0.99]',
        isDark ? 'border-white/[0.08] bg-white/[0.05] text-white' : 'border-slate-200 bg-white text-slate-900',
        item.isSelected && (isDark ? 'border-sky-400/60 bg-sky-500/10 shadow-[0_10px_30px_rgba(14,165,233,0.14)]' : 'border-sky-500/35 bg-sky-50 shadow-[0_10px_26px_rgba(14,165,233,0.12)]'),
      )}
      aria-pressed={item.isSelected}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 h-10 w-1 rounded-full" style={{ backgroundColor: item.accentColor }} aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span
              className={clsx(
                'inline-flex min-h-8 items-center rounded-full px-3 text-[11px] font-semibold',
                item.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : isDark
                    ? 'bg-white/[0.08] text-slate-300'
                    : 'bg-slate-100 text-slate-600',
              )}
            >
              {PROCESSION_STATUS_LABELS[item.status]}
            </span>
            <span className={clsx('text-xs font-medium', isDark ? 'text-slate-300' : 'text-slate-500')}>
              {item.timeLabel}
            </span>
          </div>

            <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-5">{item.title}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className={clsx('line-clamp-1 text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>
                {distanceLabel ? `${item.subtitle} · ${distanceLabel}` : item.subtitle}
              </p>
            <span
              className={clsx(
                'inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium',
                item.isTrackable
                  ? 'bg-sky-500/12 text-sky-500'
                  : isDark
                    ? 'bg-amber-500/12 text-amber-300'
                    : 'bg-amber-50 text-amber-700',
              )}
            >
              <MapPin className="h-3.5 w-3.5" />
              {item.mapLabel}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
