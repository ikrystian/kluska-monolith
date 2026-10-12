import { useEffect, useState, type ReactNode } from 'react';
import { Check, Pause, Play, RefreshCw, RotateCcw } from 'lucide-react';

/* The app's screens, rebuilt as real UI on the dark `.screen` surface — no device frame.
   Shared by the pinned scroll-spy, the mobile rail and the chapter cards. */

export function ScreenSheet({
  title,
  meta,
  children,
  className = '',
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`screen ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-3.5 sm:px-5">
        <p className="font-display font-semibold tracking-[-0.02em]">{title}</p>
        {meta && <span className="label text-ink-2">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

const sets = [
  { n: '1', w: '120', r: '6', rpe: '7,5', state: 'done' },
  { n: '2', w: '130', r: '5', rpe: '8', state: 'done' },
  { n: '3', w: '140', r: '5', rpe: '9', state: 'pr' },
  { n: '4', w: '140', r: '—', rpe: '—', state: 'next' },
] as const;

export function WorkoutScreen() {
  return (
    <ScreenSheet title="Przysiad ze sztangą" meta="Ćwiczenie 1 z 5">
      <table className="w-full text-sm">
        <thead>
          <tr className="label text-left text-ink-2">
            <th className="px-4 py-2.5 font-medium sm:px-5">Seria</th>
            <th className="py-2.5 font-medium">kg</th>
            <th className="py-2.5 font-medium">Powt.</th>
            <th className="px-4 py-2.5 text-right font-medium sm:px-5">RPE</th>
          </tr>
        </thead>
        <tbody className="num">
          {sets.map((s) => (
            <tr key={s.n} className={`border-t border-rule ${s.state === 'next' ? 'bg-screen-2 text-ink-2' : ''}`}>
              <td className="px-4 py-3 sm:px-5">
                <span className="inline-flex items-center gap-2">
                  {s.state === 'next' ? (
                    <span className="size-4 rounded-full border border-ink-2" aria-hidden />
                  ) : (
                    <span className="grid size-4 place-items-center rounded-full bg-volt text-on-volt" aria-hidden>
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                  {s.n}
                  {s.state === 'pr' && <span className="chip !min-h-5 bg-volt !px-1.5 text-[0.6875rem] text-on-volt">PR</span>}
                </span>
              </td>
              <td className={`py-3 font-semibold ${s.state === 'pr' ? 'text-accent' : ''}`}>{s.w}</td>
              <td className="py-3">{s.r}</td>
              <td className="px-4 py-3 text-right text-ink-2 sm:px-5">{s.rpe}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap justify-between gap-2 border-t border-rule px-4 py-3 text-sm sm:px-5">
        <span className="text-ink-2">
          Objętość <span className="num font-semibold text-ink">2 070 kg</span>
        </span>
        <span className="num text-ink-2">tydzień temu 135 kg × 5</span>
      </div>
    </ScreenSheet>
  );
}

/* a static read-out of the rest timer, for the pinned stage */
export function TimerScreen() {
  return (
    <ScreenSheet title="Przerwa" meta="po serii 3">
      <div className="px-4 py-6 sm:px-5">
        <p className="num text-6xl font-semibold text-accent">01:24</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-screen-2">
          <div className="h-full w-[38%] rounded-full bg-accent" />
        </div>
        <p className="mt-3 text-sm text-ink-2">Następna: seria 4 — 140 kg × 5</p>
      </div>
    </ScreenSheet>
  );
}

const REST = 90;

/* the same timer, working — lives in a rail card where the visitor can press play */
export function RestTimer() {
  const [seconds, setSeconds] = useState(REST);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const toggle = () => {
    if (seconds === 0) setSeconds(REST);
    setRunning((r) => !r);
  };
  const reset = () => {
    setRunning(false);
    setSeconds(REST);
  };
  const label = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="screen flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
      <div>
        <p className="label text-ink-2">Przerwa — kliknij play</p>
        <p className={`num text-4xl font-semibold ${running ? 'text-accent' : ''}`} aria-live="off">
          {label}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={running ? 'Zatrzymaj stoper' : 'Uruchom stoper'}
          className="grid size-12 place-items-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover"
        >
          {running ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Resetuj stoper"
          className="grid size-12 place-items-center rounded-full border border-rule-strong transition-colors hover:border-ink-2"
        >
          <RotateCcw className="size-5" />
        </button>
      </div>
    </div>
  );
}

export const splits = [
  ['km 1', '4:58', 46],
  ['km 2', '4:49', 62],
  ['km 3', '4:41', 78],
  ['km 4', '4:44', 72],
  ['km 5', '4:37', 88],
] as const;

export function SplitBars() {
  return (
    <table className="num w-full text-sm">
      <tbody>
        {splits.map(([k, t, w]) => (
          <tr key={k} className="border-t border-rule first:border-t-0">
            <td className="w-px whitespace-nowrap px-4 py-2.5 text-ink-2 sm:px-5">{k}</td>
            <td className="py-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-screen-2">
                <div className={`h-full rounded-full ${k === 'km 5' ? 'bg-volt' : 'bg-ink-2'}`} style={{ width: `${w}%` }} />
              </div>
            </td>
            <td className="w-px whitespace-nowrap px-4 py-2.5 text-right font-semibold sm:px-5">{t}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RunScreen() {
  return (
    <ScreenSheet title="Park Leśny — pętla 10 km" meta="wysłano do Strava">
      <dl className="grid grid-cols-3 divide-x divide-rule">
        {[
          ['Dystans', '10,24 km'],
          ['Tempo', '4:45 /km'],
          ['Kalorie', '680 kcal'],
        ].map(([k, v]) => (
          <div key={k} className="px-3 py-4 sm:px-4">
            <dt className="label text-ink-2">{k}</dt>
            <dd className="num mt-1 text-sm font-semibold sm:text-base">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-rule">
        <SplitBars />
      </div>
    </ScreenSheet>
  );
}

const barcode = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 2, 1];

export function Barcode({ className = 'h-10' }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-stretch gap-[2px] ${className}`} aria-hidden>
      {barcode.map((w, k) => (
        <span key={k} className="bg-ink" style={{ width: w }} />
      ))}
    </div>
  );
}

export function ScanScreen() {
  return (
    <ScreenSheet title="Skaner kodów" meta="Open Food Facts">
      <div className="flex items-center gap-4 px-4 py-5 sm:px-5">
        <Barcode />
        <p className="min-w-0 text-sm leading-snug">
          <span className="chip bg-volt text-on-volt">
            <Check className="size-3" strokeWidth={3} aria-hidden />
            Znaleziono
          </span>
          <span className="mt-1.5 block font-medium">Skyr naturalny</span>
        </p>
      </div>
      <dl className="grid grid-cols-4 divide-x divide-rule border-t border-rule text-center">
        {[
          ['kcal', '63'],
          ['Białko', '11 g'],
          ['Węgle', '4 g'],
          ['Tłuszcz', '0,2 g'],
        ].map(([k, v]) => (
          <div key={k} className="px-1 py-3">
            <dt className="label text-ink-2">{k}</dt>
            <dd className="num mt-0.5 text-sm font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-rule px-4 py-3 text-sm text-ink-2 sm:px-5">Wartości na 100 g</p>
    </ScreenSheet>
  );
}

export const macros = [
  ['Białko', '185 / 190 g', 97],
  ['Węglowodany', '270 / 300 g', 90],
  ['Tłuszcze', '58 / 80 g', 72],
] as const;

export function MacroBars() {
  return (
    <div className="space-y-3 px-4 py-4 sm:px-5">
      {macros.map(([k, v, p]) => (
        <div key={k}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{k}</span>
            <span className="num text-ink-2">{v}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-screen-2">
            <div className={`h-full rounded-full ${k === 'Białko' ? 'bg-accent' : 'bg-ink-2'}`} style={{ width: `${p}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DietScreen() {
  return (
    <ScreenSheet title="Plan na dziś — 2 750 kcal" meta="zostało 300 kcal">
      <MacroBars />
      <ul className="divide-y divide-rule border-t border-rule text-sm">
        {[
          ['Śniadanie', 'Owsianka proteinowa z borówkami', '550'],
          ['Obiad', 'Łosoś, kasza bulgur, warzywa', '720'],
          ['Przed treningiem', 'Ryż z bananem i izolatem', '470'],
        ].map(([when, what, kcal]) => (
          <li key={when} className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="label text-ink-2">{when}</p>
              <p className="truncate font-medium">{what}</p>
            </div>
            <span className="num shrink-0 font-semibold">{kcal} kcal</span>
          </li>
        ))}
      </ul>
    </ScreenSheet>
  );
}

export function CheckinScreen() {
  return (
    <ScreenSheet title="Raport tygodniowy #12" meta="odpowiedź 2 h temu">
      <dl className="grid grid-cols-3 divide-x divide-rule">
        {[
          ['Waga', '82,4 kg', '−0,6'],
          ['Talia', '81 cm', '−1'],
          ['Regeneracja', '9 / 10', ''],
        ].map(([k, v, d]) => (
          <div key={k} className="px-3 py-4 sm:px-4">
            <dt className="label text-ink-2">{k}</dt>
            <dd className="num mt-1 text-sm font-semibold sm:text-base">
              {v} {d && <span className="text-xs font-medium text-volt">{d}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <blockquote className="border-t border-rule px-4 py-4 sm:px-5">
        <p className="label text-ink-2">Trener Michał</p>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed">
          Dobry progres na ławce. Talia spada zgodnie z planem — od poniedziałku +100 g węglowodanów w dni treningowe.
        </p>
      </blockquote>
    </ScreenSheet>
  );
}

export function SyncScreen() {
  return (
    <ScreenSheet title="Zapis na telefonie" meta="brak zasięgu">
      <ol className="text-sm">
        {[
          ['Seria 3', '140 kg × 5'],
          ['Seria 4', '140 kg × 4'],
        ].map(([s, v]) => (
          <li key={s} className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
            <span className="min-w-0 truncate">
              {s} · <span className="num">{v}</span>
            </span>
            <span className="chip shrink-0 bg-screen-2 text-ink-2">na telefonie</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <span className="inline-flex min-w-0 items-center gap-2 truncate">
            <RefreshCw className="size-3.5 shrink-0 text-ink-2" aria-hidden />
            Wracasz do zasięgu
          </span>
          <span className="chip shrink-0 bg-volt text-on-volt">
            <Check className="size-3" strokeWidth={3} aria-hidden />
            w chmurze
          </span>
        </li>
      </ol>
    </ScreenSheet>
  );
}

export const roster = [
  { name: 'Anna Kowalczyk', status: 'Check-in do przejrzenia', tone: 'new' },
  { name: 'Tomasz Wrona', status: 'Push B ukończony · 2 godz. temu', tone: 'ok' },
  { name: 'Ola Nowicka', status: '5 dni bez treningu', tone: 'warn' },
  { name: 'Marek Zieliński', status: 'Plan kończy się w niedzielę', tone: 'ok' },
] as const;

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('');
}

export function RosterScreen() {
  return (
    <ScreenSheet title="Podopieczni" meta="4 aktywnych">
      <ul>
        {roster.map((p) => (
          <li key={p.name} className="flex items-center gap-4 border-b border-rule px-4 py-4 last:border-b-0 sm:px-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-screen-2 text-xs font-semibold text-ink-2" aria-hidden>
              {initials(p.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-medium">{p.name}</p>
              <p className={`truncate text-sm ${p.tone === 'warn' ? 'text-accent' : 'text-ink-2'}`}>{p.status}</p>
            </div>
            {p.tone === 'new' && <span className="chip shrink-0 bg-volt text-on-volt">Nowy</span>}
          </li>
        ))}
      </ul>
    </ScreenSheet>
  );
}
