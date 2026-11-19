import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AlertTriangle, CalendarDays, Dumbbell, Inbox, Layers, Users, type LucideIcon } from 'lucide-react';
import type { TrainerRequest } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { resolveMediaUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { AthleteRow, AthleteTone, PanelSession, PanelStats } from './panel-data';

const TONE_DOT: Record<AthleteTone, string> = {
  ok: 'bg-volt',
  warn: 'bg-food',
  idle: 'bg-muted-foreground/50',
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

function SectionHeader({ id, title, count }: { id: string; title: string; count?: number }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 id={id} className="text-xs font-semibold text-muted-foreground">
        {title}
      </h2>
      {count !== undefined && (
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{count}</span>
      )}
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border/70 px-5 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

interface StatTile {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  color: string;
}

function buildStatTiles(stats: PanelStats): StatTile[] {
  return [
    { label: 'Podopieczni', value: stats.athletes, hint: 'przypisanych', icon: Users, color: 'hsl(var(--primary))' },
    { label: 'Zapytania', value: stats.pendingRequests, hint: 'czekają na decyzję', icon: Inbox, color: 'hsl(var(--social))' },
    { label: 'Sesje', value: stats.sessionsThisWeek, hint: 'w tym tygodniu', icon: CalendarDays, color: 'hsl(var(--primary))' },
    { label: 'Treningi', value: stats.workoutsLastWeek, hint: 'w ostatnich 7 dniach', icon: Dumbbell, color: 'hsl(var(--volt))' },
    { label: 'Bez aktywności', value: stats.inactive, hint: 'bez treningu 7+ dni', icon: AlertTriangle, color: 'hsl(var(--food))' },
    { label: 'Plany', value: stats.activePlans, hint: 'przypisane sportowcom', icon: Layers, color: 'hsl(var(--social))' },
  ];
}

export function PanelStatsGrid({ stats }: { stats: PanelStats }) {
  return (
    <section aria-label="Statystyki" className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {buildStatTiles(stats).map(tile => (
        <div key={tile.label} className="rounded-2xl bg-card p-4">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ backgroundColor: `color-mix(in srgb, ${tile.color} 16%, transparent)`, color: tile.color }}
          >
            <tile.icon className="h-[18px] w-[18px]" />
          </span>
          <p className="mt-3 font-display text-4xl font-bold leading-none tabular-nums">{tile.value}</p>
          <p className="mt-1 text-xs font-semibold">{tile.label}</p>
          <p className="text-xs text-muted-foreground">{tile.hint}</p>
        </div>
      ))}
    </section>
  );
}

export function InquiriesSection({
  requests,
  busyId,
  onAccept,
  onReject,
}: {
  requests: TrainerRequest[];
  busyId: string | null;
  onAccept: (request: TrainerRequest) => void;
  onReject: (request: TrainerRequest) => void;
}) {
  return (
    <section aria-labelledby="panel-inquiries">
      <SectionHeader id="panel-inquiries" title="Zapytania o współpracę" count={requests.length} />
      {requests.length === 0 ? (
        <EmptyNote>Brak nowych zapytań. Pełna wizytówka zachęca sportowców do kontaktu.</EmptyNote>
      ) : (
        <ul className="space-y-2.5">
          {requests.map(request => (
            <li key={request.id} className="rounded-2xl bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{request.athleteName}</p>
                  {request.goal && <p className="text-xs font-semibold text-primary">{request.goal}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {format(new Date(request.createdAt), 'd MMM', { locale: pl })}
                </span>
              </div>
              {request.message && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{request.message}</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" disabled={busyId === request.id} onClick={() => onAccept(request)}>
                  Przyjmij
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  disabled={busyId === request.id}
                  onClick={() => onReject(request)}
                >
                  Odrzuć
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SchedulePreview({ sessions }: { sessions: PanelSession[] }) {
  return (
    <section aria-labelledby="panel-schedule">
      <SectionHeader id="panel-schedule" title="Harmonogram · najbliższe 7 dni" count={sessions.length} />
      {sessions.length === 0 ? (
        <EmptyNote>Brak zaplanowanych sesji w najbliższym tygodniu.</EmptyNote>
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
          {sessions.map(session => {
            const at = new Date(session.date);
            return (
              <li key={session.id} className="flex items-center gap-3 px-3.5 py-3">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">{format(at, 'EEE', { locale: pl })}</p>
                  <p className="font-display text-2xl font-bold leading-none">{format(at, 'd')}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{session.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {format(at, 'HH:mm')} · {session.athleteName}
                    {session.location && ` · ${session.location}`}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{session.duration} min</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AthletesSection({ rows }: { rows: AthleteRow[] }) {
  return (
    <section aria-labelledby="panel-athletes">
      <SectionHeader id="panel-athletes" title="Przegląd podopiecznych" count={rows.length} />
      {rows.length === 0 ? (
        <EmptyNote>Nie masz jeszcze podopiecznych. Gdy przyjmiesz zapytanie, sportowiec pojawi się tutaj.</EmptyNote>
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
          {rows.map(row => (
            <li key={row.id} className="flex items-center gap-3.5 px-3.5 py-3">
              <Avatar className="h-10 w-10 shrink-0">
                {row.avatarUrl && <AvatarImage src={resolveMediaUrl(row.avatarUrl)} alt="" className="object-cover" />}
                <AvatarFallback className="bg-secondary text-sm font-semibold">{initials(row.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{row.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT[row.tone])} />
                  <span className="truncate">{row.status}</span>
                </p>
                {row.nextSession && (
                  <p className="truncate text-xs text-muted-foreground">
                    Następna sesja: {format(new Date(row.nextSession.date), 'EEE d MMM, HH:mm', { locale: pl })}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-right text-xs text-muted-foreground">
                {row.lastWorkoutAt ? format(row.lastWorkoutAt, 'd MMM', { locale: pl }) : '–'}
                <span className="block text-[11px]">ostatni trening</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
