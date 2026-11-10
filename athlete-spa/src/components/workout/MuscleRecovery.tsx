import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PersonStanding, LayoutGrid, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutLog } from '@/lib/types';
import { areaReadiness, MUSCLE_AREAS, RECOVERY_HOURS, type MuscleAreaId } from '@/lib/muscle-areas';
import { BodyAnatomySvg, MuscleAreaIcon, getReadinessColor } from './BodyPartsSvg';
import { haptic } from '@/lib/haptics';

const VIEW_STORAGE_KEY = 'athlete-spa:muscle-recovery-view';

/**
 * Which muscles are ready, calculated from the athlete's recent sessions.
 * Displays muscle groups dynamically on an interactive SVG anatomical body
 * or focused SVG part tiles.
 */
export function MuscleRecovery({ logs }: { logs: WorkoutLog[] }) {
  const [viewMode, setViewMode] = useState<'body' | 'parts'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'body' || saved === 'parts') return saved;
    }
    return 'body';
  });

  const [selectedId, setSelectedId] = useState<MuscleAreaId | null>(null);

  const areas = useMemo(() => areaReadiness(logs), [logs]);

  if (logs.length === 0) return null;

  const fresh = areas.filter(area => area.ready >= 1).map(area => area.label.toLowerCase());
  const selectedArea = areas.find(a => a.id === selectedId) ?? null;
  const areaDef = MUSCLE_AREAS.find(a => a.id === selectedId);

  const handleToggleView = (next: 'body' | 'parts') => {
    setViewMode(next);
    haptic('tap');
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Ignore private browsing storage errors
    }
  };

  const handleSelectArea = (id: MuscleAreaId) => {
    haptic('tap');
    setSelectedId(prev => (prev === id ? null : id));
  };

  return (
    <section className="rounded-2xl bg-card p-4 transition-all duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[15px] font-semibold tracking-tight">Regeneracja</h2>
            {fresh.length === areas.length && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-volt/15 px-1.5 py-0.5 text-[10px] font-bold text-volt">
                <Sparkles className="h-2.5 w-2.5" />
                100%
              </span>
            )}
          </div>
          <p className="mt-0.5 min-w-0 truncate text-[13px] text-muted-foreground">
            {fresh.length > 0
              ? `Gotowe: ${fresh.slice(0, 3).join(', ')}${fresh.length > 3 ? ` +${fresh.length - 3}` : ''}`
              : 'Wszystko jeszcze odpoczywa'}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-xl bg-secondary/80 p-0.5 text-muted-foreground">
          <button
            type="button"
            onClick={() => handleToggleView('body')}
            aria-label="Widok sylwetki SVG"
            title="Widok sylwetki"
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all duration-200',
              viewMode === 'body'
                ? 'bg-card text-foreground shadow-xs'
                : 'hover:text-foreground'
            )}
          >
            <PersonStanding className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Sylwetka</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleView('parts')}
            aria-label="Widok partii SVG"
            title="Widok partii"
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all duration-200',
              viewMode === 'parts'
                ? 'bg-card text-foreground shadow-xs'
                : 'hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Partie</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Anatomical SVG Body Map */}
      {viewMode === 'body' && (
        <div className="mt-2 space-y-3">
          {/* Centered SVG Figures */}
          <div className="relative mx-auto flex max-w-[280px] items-center justify-center py-1">
            <BodyAnatomySvg
              areas={areas}
              selectedArea={selectedId}
              onSelectArea={handleSelectArea}
              className="h-[185px] w-auto max-w-full drop-shadow-sm"
            />
          </div>

          {/* Quick selection chips for the 6 muscle areas */}
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {areas.map(area => {
              const { dotColor, statusLabel } = getReadinessColor(area.ready);
              const isSelected = selectedId === area.id;

              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleSelectArea(area.id)}
                  aria-label={`${area.label} (${statusLabel}, ${Math.round(area.ready * 100)}%)`}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-2 py-1.5 text-left text-xs transition-all active:scale-[0.98]',
                    isSelected
                      ? 'border-primary bg-primary/10 font-semibold text-foreground shadow-xs'
                      : 'border-border/60 bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', dotColor)} />
                    <span className="truncate font-medium">{area.label}</span>
                  </span>
                  <span className="ml-1 shrink-0 text-[11px] font-bold text-foreground/80">
                    {Math.round(area.ready * 100)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 pt-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-volt" />
              <span>Gotowe</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-food" />
              <span>Regeneracja</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>Zmęczone</span>
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: 6 Focused SVG Muscle Area Tiles */}
      {viewMode === 'parts' && (
        <ul className="mt-3 grid grid-cols-6 gap-1.5">
          {areas.map(area => {
            const isSelected = selectedId === area.id;
            const { fill, twText } = getReadinessColor(area.ready);

            return (
              <li key={area.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => handleSelectArea(area.id)}
                  aria-label={`${area.label}: ${Math.round(area.ready * 100)}% regeneracji`}
                  className={cn(
                    'group relative flex w-full flex-col items-center justify-between rounded-xl border p-1.5 text-center transition-all duration-200 active:scale-[0.96]',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border/60 bg-secondary/50 hover:border-border hover:bg-secondary/80'
                  )}
                >
                  {/* Focused anatomical SVG icon */}
                  <div className="relative flex h-11 w-full items-center justify-center">
                    <MuscleAreaIcon id={area.id} ready={area.ready} className="h-10 w-10 transition-transform group-hover:scale-105" />
                  </div>

                  {/* Percentage & Label */}
                  <div className="mt-1 w-full">
                    <span className={cn('block font-mono text-[11px] font-bold leading-none', twText)}>
                      {Math.round(area.ready * 100)}%
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
                      {area.label}
                    </span>
                  </div>

                  {/* Subtle bottom progress bar */}
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${Math.max(8, area.ready * 100)}%`,
                        backgroundColor: fill,
                      }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Selected Muscle Detail Sheet / Card */}
      {selectedArea && (
        <div className="mt-3.5 rounded-xl border border-border/80 bg-secondary/40 p-3 animate-in fade-in-50 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm">{selectedArea.label}</h3>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    getReadinessColor(selectedArea.ready).twBg,
                    getReadinessColor(selectedArea.ready).twText
                  )}
                >
                  {getReadinessColor(selectedArea.ready).statusLabel} • {Math.round(selectedArea.ready * 100)}%
                </span>
              </div>
              {areaDef?.muscles && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Partia obejmuje: {areaDef.muscles.join(', ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                haptic('tap');
                setSelectedId(null);
              }}
              aria-label="Zamknij podgląd partii"
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(6, selectedArea.ready * 100)}%`,
                backgroundColor: getReadinessColor(selectedArea.ready).fill,
              }}
            />
          </div>

          {/* Workout history / recovery timing */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>
              {selectedArea.lastDate
                ? `Ostatni trening: ${formatDistanceToNow(selectedArea.lastDate, { addSuffix: true, locale: pl })} (${format(selectedArea.lastDate, 'd MMM, HH:mm', { locale: pl })})`
                : 'Brak treningu w ostatnich 72h'}
            </span>
            <span className="font-medium text-foreground">
              {selectedArea.ready >= 1
                ? 'W pełni gotowa do mocnego wysiłku'
                : `Pozostało ok. ${Math.max(1, Math.round(RECOVERY_HOURS - selectedArea.hours))}h regeneracji`}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
