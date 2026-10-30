import {
  CalendarDays,
  ClipboardCheck,
  Construction,
  Layers,
  MessageSquare,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Placeholder content — the trainer panel is not wired to real data yet.

const STATS: { label: string; value: string; hint: string; icon: LucideIcon; color: string }[] = [
  { label: 'Podopieczni', value: '12', hint: 'aktywnych', icon: Users, color: 'hsl(var(--primary))' },
  { label: 'Check-iny', value: '3', hint: 'do przejrzenia', icon: ClipboardCheck, color: 'hsl(var(--chart-2))' },
  { label: 'Sesje', value: '8', hint: 'w tym tygodniu', icon: CalendarDays, color: 'hsl(var(--chart-4))' },
  { label: 'Wiadomości', value: '5', hint: 'bez odpowiedzi', icon: MessageSquare, color: 'hsl(var(--chart-5))' },
];

const ATHLETES: { name: string; status: string; lastActivity: string; tone: 'ok' | 'warn' | 'idle' }[] = [
  { name: 'Anna Kowalska', status: 'Check-in czeka na przegląd', lastActivity: 'Dziś, 07:40', tone: 'warn' },
  { name: 'Marek Nowak', status: 'Plan realizowany w 85%', lastActivity: 'Wczoraj, 18:15', tone: 'ok' },
  { name: 'Ewa Zielińska', status: 'Nowa wiadomość', lastActivity: 'Wczoraj, 12:02', tone: 'warn' },
  { name: 'Piotr Wiśniewski', status: 'Brak treningu od 6 dni', lastActivity: '4 dni temu', tone: 'idle' },
];

const TONE_DOT: Record<(typeof ATHLETES)[number]['tone'], string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  idle: 'bg-muted-foreground/50',
};

const ROADMAP: { title: string; description: string; icon: LucideIcon }[] = [
  { title: 'Lista podopiecznych', description: 'Postępy, aktywność i notatki każdego podopiecznego w jednym miejscu.', icon: Users },
  { title: 'Plany treningowe', description: 'Układaj programy w etapach i przypisuj je podopiecznym.', icon: Layers },
  { title: 'Plany dietetyczne', description: 'Jadłospisy i makroskładniki dopasowane do celu.', icon: UtensilsCrossed },
  { title: 'Check-iny i raporty', description: 'Przeglądaj tygodniowe raporty i odpowiadaj na nie od razu.', icon: ClipboardCheck },
];

function initials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

export default function TrainerPanelPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-4 pt-18 md:px-6 md:pt-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Dla trenera</p>
        <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">Panel trenera</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Podopieczni, plany i sesje — wszystko, czego potrzebujesz do prowadzenia klientów.
        </p>
      </header>

      <section
        aria-labelledby="trainer-panel-wip"
        className="hero-ember texture-grain relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] p-5 text-white shadow-glow"
      >
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[1.1rem] border-white/10" />
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <Construction className="h-7 w-7" />
        </span>
        <div className="relative min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">Wkrótce</p>
          <h2 id="trainer-panel-wip" className="font-display text-xl font-extrabold uppercase leading-tight">
            Panel w budowie
          </h2>
          <p className="mt-0.5 text-sm text-white/85">
            Pracujemy nad narzędziami dla trenerów. Poniżej podgląd tego, co tu się pojawi — dane są przykładowe.
          </p>
        </div>
      </section>

      <section aria-label="Podsumowanie (dane przykładowe)" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map(stat => (
          <div key={stat.label} className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 16%, transparent)`, color: stat.color }}
            >
              <stat.icon className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-3 font-display text-3xl font-extrabold leading-none">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold">{stat.label}</p>
            <p className="text-[11px] text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="trainer-panel-athletes">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="trainer-panel-athletes" className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Podopieczni
          </h2>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Przykładowe dane
          </span>
        </div>
        <ul className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
          {ATHLETES.map(athlete => (
            <li key={athlete.name} className="flex items-center gap-3.5 px-3.5 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold">
                {initials(athlete.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{athlete.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT[athlete.tone])} />
                  <span className="truncate">{athlete.status}</span>
                </span>
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{athlete.lastActivity}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trainer-panel-roadmap">
        <h2 id="trainer-panel-roadmap" className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Co tu będzie
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {ROADMAP.map(item => (
            <div key={item.title} className="flex items-start gap-3.5 rounded-3xl border border-dashed border-border bg-card/50 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{item.title}</span>
                <span className="block text-xs text-muted-foreground">{item.description}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
