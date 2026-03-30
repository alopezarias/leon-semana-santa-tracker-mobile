import { LocateFixed, Moon, Search, Sun, X } from 'lucide-react';
import type { SearchQuery, Theme } from '../types/procession';

interface HomeTopBarProps {
  theme: Theme;
  isLocating: boolean;
  searchQuery: SearchQuery;
  resultCount: number;
  onSearchChange: (value: SearchQuery) => void;
  onClearSearch: () => void;
  onToggleTheme: () => void;
  onLocateMe: () => void;
}

export default function HomeTopBar({
  theme,
  isLocating,
  searchQuery,
  resultCount,
  onSearchChange,
  onClearSearch,
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
        className={`pointer-events-auto flex items-center gap-3 rounded-full border px-3 py-2.5 shadow-lg backdrop-blur-xl ${
          isDark ? 'border-white/10 bg-slate-950/78 text-white' : 'border-white/70 bg-white/88 text-slate-900'
        }`}
        aria-label="Barra superior home"
      >
        <div className={`flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-2 ${
          isDark ? 'bg-white/[0.06]' : 'bg-slate-100/90'
        }`}>
          <Search className={`h-4 w-4 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <label className="sr-only" htmlFor="home-search">Buscar procesión, cofradía o día</label>
          <input
            id="home-search"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar procesión, cofradía o día"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            aria-label="Buscar procesión, cofradía o día"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={onClearSearch}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-[transform,background-color,color] active:scale-[0.98] ${
                isDark ? 'bg-white/[0.08] text-slate-200' : 'bg-white text-slate-600'
              }`}
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="hidden shrink-0 sm:block">
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {resultCount} resultados
          </p>
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
