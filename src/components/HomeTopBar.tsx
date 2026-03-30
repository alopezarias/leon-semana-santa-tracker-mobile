import { LocateFixed, Moon, Sun } from 'lucide-react';
import type { Theme } from '../types/procession';

interface HomeTopBarProps {
  title: string;
  theme: Theme;
  isLocating: boolean;
  onToggleTheme: () => void;
  onLocateMe: () => void;
}

export default function HomeTopBar({
  title,
  theme,
  isLocating,
  onToggleTheme,
  onLocateMe,
}: HomeTopBarProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[1100] px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
    >
      <div
        className={`pointer-events-auto flex items-center justify-between gap-3 rounded-full border px-4 py-3 shadow-lg backdrop-blur-xl ${
          isDark ? 'border-white/10 bg-slate-950/78 text-white' : 'border-white/70 bg-white/88 text-slate-900'
        }`}
        aria-label="Barra superior home"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLocateMe}
            disabled={isLocating}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition-[transform,background-color,color,opacity] active:scale-[0.98] disabled:opacity-70 ${
              isDark ? 'bg-white/[0.08] text-sky-300' : 'bg-slate-100 text-sky-700'
            }`}
            aria-label={isLocating ? 'Buscando tu ubicación' : 'Centrar en mi ubicación'}
          >
            <LocateFixed className={`h-5 w-5 ${isLocating ? 'animate-pulse' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition-[transform,background-color,color] active:scale-[0.98] ${
              isDark ? 'bg-white/[0.08] text-amber-300' : 'bg-slate-100 text-slate-700'
            }`}
            aria-label="Cambiar tema"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
