import { useEffect, useState } from 'react';
import {
  Check,
  CheckCheck,
  Coins,
  Drumstick,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  ListChecks,
  MapPin,
  Moon,
  ScanBarcode,
  Sparkles,
  Timer,
  Trophy,
  Volume2,
  Droplet,
  StretchHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useLoop, useOnScreen } from '../lib/motion';
import { useCountUp } from '../lib/stages';
import { PetAvatar } from '../pet/PetAvatar';
import { Bar, Phone, Ring, Tick, nf, vars } from './ui';

/* Every screen here plays a short scene while it is on screen and rests on its last frame under
   reduced motion. All numbers are sample data. */

/* ------------------------------------------------------------------ Dziś */

const WEEK = [
  ['pon', 9, true],
  ['wto', 10, false],
  ['śro', 11, true],
  ['czw', 12, false],
  ['pią', 13, true],
  ['sob', 14, false],
  ['nie', 15, false],
] as const;

const GOALS: { label: string; done: string; todo: string; icon: LucideIcon; tone: string }[] = [
  { label: 'Trening', done: 'Full Body A zrobiony', todo: 'jeszcze przed Tobą', icon: Dumbbell, tone: 'var(--color-accent)' },
  { label: 'Kalorie', done: '2 380 / 2 400 kcal', todo: '990 / 2 400 kcal', icon: Flame, tone: 'var(--color-food)' },
  { label: 'Białko', done: '152 / 150 g', todo: '64 / 150 g', icon: Drumstick, tone: 'var(--color-run)' },
  { label: 'Nawyki', done: '3 / 3 odhaczone', todo: '1 / 3 odhaczone', icon: ListChecks, tone: 'var(--color-volt)' },
];

export function TodayDemo({ className = '' }: { className?: string }) {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const step = useLoop(6, [1500, 1300, 1300, 1300, 1300, 3600], on);
  const done = Math.min(4, step);
  const all = done === 4;

  return (
    <div ref={ref} className={className}>
      <Phone title="leniwakluska" tab="Dziś" label="Ekran Dziś: pasek tygodnia, cztery cele dnia i zwierzak">
        <div className="px-1 pb-1">
          <div className="grid grid-cols-7 text-center">
            {WEEK.map(([d, n, trained]) => {
              const today = d === 'sob';
              const lime = trained || (today && done >= 1);
              return (
                <div key={d} className="flex flex-col items-center gap-1.5">
                  <span className="text-[0.625rem] font-medium text-ink-3">{d}</span>
                  <span
                    key={String(lime)}
                    className={`big grid size-8 place-items-center rounded-full text-base ${lime ? 'bg-volt text-on-volt' : today ? 'bg-ink text-paper' : 'text-ink-2'} ${today && lime ? 'land' : ''}`}
                  >
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[0.6875rem] text-ink-2">
            <span>
              W tym tygodniu <b className="text-ink">{done >= 1 ? '4/4' : '3/4'}</b>
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3 text-accent" />
              <b className="text-ink">{done >= 1 ? 4 : 3}</b> dni serii
            </span>
          </div>
        </div>

        <div className="card p-3.5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[0.8125rem] font-semibold">Cele dnia</p>
              <p className="text-[0.6875rem] text-ink-2">{all ? 'Sztanga dnia załadowana' : `Jeszcze ${4 - done} do zamknięcia dnia`}</p>
            </div>
            <p className="big text-3xl">
              <span className={all ? 'text-volt' : ''}>{done}</span>
              <span className="text-base text-ink-3">/4</span>
            </p>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {GOALS.map((g, n) => (
              <Bar key={g.label} value={done > n ? 1 : 0} tone={g.tone} className="h-1" />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {GOALS.map((g, n) => {
              const ok = done > n;
              return (
                <div key={g.label} className="rounded-xl bg-screen p-2.5">
                  {ok ? (
                    <Tick on className="size-8" />
                  ) : (
                    <Ring value={0.4} size={32} stroke={3} tone={g.tone}>
                      <g.icon className="size-3.5" style={{ color: g.tone }} />
                    </Ring>
                  )}
                  <p className="mt-2 text-[0.8125rem] font-semibold leading-tight">{g.label}</p>
                  <p className="truncate text-[0.625rem] text-ink-2">{ok ? g.done : g.todo}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card flex items-center gap-3 p-3">
          <PetAvatar species="hamster" stage="junior" size={54} mood={all ? 'energetic' : 'happy'} action={all ? 'cheer' : 'idle'} />
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-semibold">Kluska</p>
            <p className="truncate text-[0.6875rem] text-ink-2">{all ? 'Komplet! +40 FitCoins na smakołyki' : 'Czeka na Twój trening'}</p>
          </div>
          {all && (
            <span className="land chip ml-auto bg-volt text-on-volt">
              <Coins className="size-3" />
              +40
            </span>
          )}
        </div>
      </Phone>
    </div>
  );
}

/* ------------------------------------------------------------------ Trening */

const SET_TYPES = ['Rozgrzewkowa', 'Robocza', 'Back-off', 'Drop set', 'Do odmowy'];
const SETS = [
  ['1', '60', '8', '—', 0],
  ['2', '120', '6', '7,5', 1],
  ['3', '130', '5', '8', 1],
  ['4', '140', '5', '9', 1],
] as const;

export function WorkoutDemo() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const step = useLoop(7, [1200, 1500, 1500, 1500, 1900, 1100, 3800], on);
  const done = Math.min(4, step);
  const rewards = step === 6;
  const resting = step >= 1 && step <= 4;

  return (
    <div ref={ref}>
      <Phone title="Trening" tab="Trening" label="Dziennik treningu: serie przysiadu odhaczane jedna po drugiej, przerwa i nagrody na koniec">
        <div className="card relative overflow-hidden">
          <div className="flex items-baseline justify-between px-3.5 pt-3.5">
            <p className="font-display text-xl font-bold uppercase leading-none">Przysiad ze sztangą</p>
            <span className="text-[0.6875rem] text-ink-2">1 z 5</span>
          </div>
          <div className="no-bar mt-2.5 flex gap-1.5 overflow-hidden px-3.5">
            {SET_TYPES.map((t, n) => {
              const active = n === (done === 0 ? 0 : 1);
              return (
                <span key={t} className={`chip !min-h-6 shrink-0 text-[0.625rem] ${active ? 'bg-accent text-on-accent' : 'bg-screen text-ink-2'}`}>
                  {t}
                </span>
              );
            })}
          </div>
          <div className="num mt-3 text-[0.8125rem]">
            <div className="grid grid-cols-[2.25rem_1fr_1fr_1fr_2rem] px-3.5 pb-1.5 text-[0.625rem] font-medium text-ink-3">
              <span>Seria</span>
              <span>kg</span>
              <span>Powt.</span>
              <span>RPE</span>
              <span />
            </div>
            {SETS.map(([n, kg, reps, rpe], k) => {
              const ok = done > k;
              const pr = k === 3 && ok;
              return (
                <div key={n} className={`grid grid-cols-[2.25rem_1fr_1fr_1fr_2rem] items-center border-t border-rule px-3.5 py-2.5 ${done === k ? 'bg-screen' : ''}`}>
                  <span className="text-ink-2">{n}</span>
                  <span className={`font-semibold ${pr ? 'text-volt' : ''}`}>
                    {kg}
                    {pr && <span className="land chip ml-1.5 !min-h-4 bg-volt !px-1.5 text-[0.5625rem] text-on-volt">PR</span>}
                  </span>
                  <span className={ok ? '' : 'text-ink-2'}>{reps}</span>
                  <span className="text-ink-2">{ok ? rpe : '—'}</span>
                  <Tick on={ok} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-rule px-3.5 py-2.5 text-[0.6875rem] text-ink-2">
            <span>tydzień temu 135 kg × 5</span>
            <span>
              Objętość <b className="num text-ink">{nf([0, 480, 1200, 1850, 2550][done])} kg</b>
            </span>
          </div>

          {rewards && (
            <div className="land absolute inset-0 flex flex-col justify-center bg-screen-2/97 px-4 text-center">
              <Trophy className="mx-auto size-8 text-volt" />
              <p className="mt-2 font-display text-3xl font-extrabold uppercase leading-none">Trening zapisany</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-left">
                {[
                  ['+120 XP', 'poziom 4 coraz bliżej'],
                  ['Seria 4 dni', 'ogień się trzyma'],
                  ['1 rekord', 'przysiad 140 kg × 5'],
                  ['+15 XP', 'dla zwierzaka'],
                ].map(([a, b], n) => (
                  <div key={a} className="land rounded-xl bg-screen p-2.5" style={vars({ animationDelay: `${180 + n * 110}ms` })}>
                    <p className="big text-lg text-volt">{a}</p>
                    <p className="text-[0.625rem] text-ink-2">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card flex items-center gap-3 px-3.5 py-3">
          <Timer className={`size-5 shrink-0 ${resting ? 'text-accent' : 'text-ink-3'}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <p className="text-[0.75rem] font-semibold">{resting ? 'Przerwa' : rewards ? 'Koniec treningu' : 'Przerwa ruszy po serii'}</p>
              <p className={`big text-xl ${resting ? 'text-accent' : 'text-ink-3'}`}>{resting ? '01:30' : '00:00'}</p>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper-3">
              {resting && <div key={step} className="rest-run h-full rounded-full bg-accent" />}
            </div>
          </div>
          <span className="chip !min-h-6 bg-screen text-[0.625rem] text-ink-2">+15 s</span>
        </div>
      </Phone>
    </div>
  );
}

/* ------------------------------------------------------------------ Bieganie */

const ROUTE = 'M22 150 C40 118 30 92 58 84 C92 74 84 124 120 118 C158 112 150 62 186 58 C214 55 226 78 250 44';
const KM = [0, 1.02, 2.07, 3.11, 4.18, 5.24];
const PACE = ['—', '4:58', '4:49', '4:41', '4:44', '4:37'];
const TIME = ['00:00', '05:04', '10:07', '14:59', '19:58', '24:52'];

export function RunDemo() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const step = useLoop(7, [900, 1400, 1400, 1400, 1400, 1400, 3600], on);
  const k = Math.min(5, step);
  const saved = step === 6;

  return (
    <div ref={ref}>
      <Phone title="Bieg" tab="Trening" label="Zapis biegu: trasa rysuje się na mapie, rosną dystans i tempo, na końcu bieg jest zapisany">
        <div className="card relative overflow-hidden">
          <svg viewBox="0 0 272 180" className="block w-full" style={vars({ background: 'var(--color-paper)' })}>
            <g stroke="var(--color-rule)" strokeWidth="1" fill="none">
              <path d="M-10 40 L290 96 M-10 120 L290 150 M60 -10 L96 190 M170 -10 L214 190 M-10 78 C80 60 180 110 290 30" />
            </g>
            <path d="M-10 168 C60 130 120 176 290 120" stroke="color-mix(in oklab, var(--color-run) 22%, transparent)" strokeWidth="14" fill="none" />
            <path d={ROUTE} pathLength={1} fill="none" stroke="color-mix(in oklab, var(--color-run) 25%, transparent)" strokeWidth="4" strokeLinecap="round" />
            <path
              d={ROUTE}
              pathLength={1}
              className="route-line"
              fill="none"
              stroke="var(--color-run)"
              strokeWidth="4"
              strokeLinecap="round"
              style={{ strokeDashoffset: 1 - k / 5 }}
            />
            <circle cx="22" cy="150" r="5" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.5" />
            <circle cx="250" cy="44" r="5" fill="var(--color-paper)" stroke="var(--color-run)" strokeWidth="2.5" opacity={k === 5 ? 1 : 0.3} />
          </svg>
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-screen-2/90 px-2.5 py-1 text-[0.625rem] font-semibold">
            <span className={`size-1.5 rounded-full ${saved ? 'bg-volt' : 'live-dot bg-run'}`} />
            {saved ? 'Zapisano' : 'GPS · ekran może zgasnąć'}
          </span>
          {k >= 1 && !saved && (
            <span key={k} className="land absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-run px-2.5 py-1 text-[0.625rem] font-bold text-on-plate">
              <Volume2 className="size-3" />
              {k} km · tempo {PACE[k]}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ['Dystans', `${nf(KM[k], 2)} km`],
            ['Tempo', `${PACE[k]} /km`],
            ['Czas', TIME[k]],
          ].map(([a, b]) => (
            <div key={a} className="card px-3 py-2.5">
              <p className="text-[0.625rem] font-medium text-ink-2">{a}</p>
              <p className="big mt-1 text-lg">{b}</p>
            </div>
          ))}
        </div>

        <div className="card px-3.5 py-3">
          <div className="flex items-center justify-between text-[0.6875rem]">
            <span className="font-semibold">Międzyczasy</span>
            <span className="text-ink-2">{saved ? 'najszybszy km 5' : 'na żywo'}</span>
          </div>
          <div className="num mt-2 space-y-1.5 text-[0.6875rem]">
            {[46, 62, 78, 72, 88].map((w, n) => (
              <div key={n} className="grid grid-cols-[2.25rem_1fr_2rem] items-center gap-2">
                <span className="text-ink-2">km {n + 1}</span>
                <Bar value={k > n ? w / 100 : 0} tone={n === 4 ? 'var(--color-volt)' : 'var(--color-run)'} className="h-1" />
                <span className="text-right font-semibold">{k > n ? PACE[n + 1] : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </Phone>
    </div>
  );
}

/* ------------------------------------------------------------------ Kalorie */

export function FoodDemo() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const step = useLoop(6, [1900, 1500, 1500, 1500, 1500, 3400], on);
  const eaten = [990, 990, 1130, 1130, 1690, 1690][step];
  const left = useCountUp(2400 - eaten);
  const protein = [64, 64, 86, 86, 132, 132][step];
  const carbs = [124, 124, 133, 133, 195, 195][step];
  const fat = [24, 24, 25, 25, 37, 37][step];

  return (
    <div ref={ref}>
      <Phone title="Kalorie" tab="Dieta" label="Dziennik kalorii: skan kodu kreskowego dodaje produkt, a paski makro rosną">
        <div className="card p-3.5">
          <div className="flex items-end justify-between">
            <p>
              <span className="big text-4xl">{nf(left)}</span>
              <span className="ml-1.5 text-[0.6875rem] text-ink-2">kcal zostało</span>
            </p>
            <span className="num text-[0.6875rem] text-ink-2">
              {nf(eaten)} / 2 400
            </span>
          </div>
          <Bar value={eaten / 2400} tone="var(--color-food)" className="mt-2.5 h-1.5" />
          <div className="mt-3 grid grid-cols-3 gap-3 text-[0.625rem]">
            {[
              ['Białko', protein, 150, 'var(--color-volt)'],
              ['Węgle', carbs, 250, 'var(--color-food)'],
              ['Tłuszcze', fat, 80, 'var(--color-accent)'],
            ].map(([name, v, max, tone]) => (
              <div key={name as string}>
                <p className="text-ink-2">
                  {name} <b className="num text-ink">{v}</b>/{max}
                </p>
                <Bar value={(v as number) / (max as number)} tone={tone as string} className="mt-1 h-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="card relative grid h-[5.5rem] place-items-center overflow-hidden">
          {step === 0 ? (
            <div key="scan" className="land relative">
              <div className="flex h-11 items-stretch gap-[2px] opacity-80">
                {[2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 2, 1, 2, 3].map((w, n) => (
                  <span key={n} className="bg-ink" style={{ width: w }} />
                ))}
              </div>
              <span className="scanline absolute inset-x-[-10px] top-1/2 h-0.5 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)]" />
              <p className="mt-1.5 text-center text-[0.625rem] text-ink-2">Skanuj kod…</p>
            </div>
          ) : step <= 2 ? (
            <div key="found" className="land flex w-full items-center gap-3 px-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-screen">
                <ScanBarcode className="size-5 text-food" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-semibold">Skyr naturalny · 220 g</p>
                <p className="num text-[0.625rem] text-ink-2">140 kcal · B 22 · W 9 · T 1</p>
              </div>
              <span className={`chip ${step === 2 ? 'bg-volt text-on-volt' : 'bg-accent text-on-accent'}`}>
                {step === 2 ? <Check className="size-3" strokeWidth={3} /> : null}
                {step === 2 ? 'Dodano' : 'Dodaj'}
              </span>
            </div>
          ) : (
            <div key="meal" className="land flex w-full items-center gap-3 px-3.5">
              <img src="/app/goal-meals.webp" alt="" width={480} height={240} className="h-10 w-14 shrink-0 rounded-xl object-cover object-right" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-semibold">Kurczak z ryżem · gotowe danie</p>
                <p className="num text-[0.625rem] text-ink-2">560 kcal · B 46 · W 62 · T 12</p>
              </div>
              <span className={`chip ${step >= 4 ? 'bg-volt text-on-volt' : 'bg-accent text-on-accent'}`}>
                {step >= 4 ? <Check className="size-3" strokeWidth={3} /> : null}
                {step >= 4 ? 'Dodano' : 'Dodaj'}
              </span>
            </div>
          )}
        </div>

        <div className="card divide-y divide-rule text-[0.75rem]">
          {[
            ['Śniadanie', 'Owsianka z owocami', 430, true],
            ['Przekąska', 'Skyr naturalny', 140, step >= 2],
            ['Obiad', 'Kurczak z ryżem', 560, step >= 4],
          ].map(([meal, what, kcal, show]) => (
            <div key={meal as string} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-[0.625rem] text-ink-2">{meal}</p>
                {show ? <p className="land truncate font-semibold">{what}</p> : <p className="text-ink-3">+ dodaj</p>}
              </div>
              {show && <span className="big land text-base">{kcal}</span>}
            </div>
          ))}
        </div>
      </Phone>
    </div>
  );
}

/* ------------------------------------------------------------------ Nawyki */

const HABITS: { name: string; when: string; icon: LucideIcon; tone: string; days: number[] }[] = [
  { name: 'Woda 2 l', when: 'Codziennie', icon: Droplet, tone: 'var(--color-run)', days: [0, 2, 3, 5] },
  { name: 'Sen 8 godzin', when: 'Codziennie', icon: Moon, tone: 'var(--color-social)', days: [0, 2, 3, 5] },
  { name: 'Rozciąganie', when: 'Pon, Śr, Pt', icon: StretchHorizontal, tone: 'var(--color-volt)', days: [0, 2, 4] },
];

export function HabitsDemo() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const step = useLoop(5, [1400, 1200, 1200, 1200, 3400], on);
  // each step ticks today's cell (Saturday, index 5) of the next habit
  const todayDone = (h: number) => (h < 2 ? step > h : false);
  const total = 10 + Math.min(2, step);
  const pct = Math.round((total / 15) * 100);

  return (
    <div ref={ref}>
      <Phone title="Nawyki" tab="Dziś" label="Nawyki: tygodniowa siatka, w której odhaczają się kolejne dni, i rosnąca seria">
        <div className="card flex items-center gap-3 p-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-screen">
            <Flame className="size-5 text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.625rem] text-ink-2">Wykonanie w tym tygodniu</p>
            <p className="big text-2xl">{pct}%</p>
            <Bar value={total / 15} className="mt-1.5 h-1" />
          </div>
          <span className="chip bg-screen text-ink">
            <Flame className="size-3 text-accent" />
            {step >= 2 ? 12 : 11} dni
          </span>
        </div>

        {HABITS.map((h, hi) => (
          <div key={h.name} className="card p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-screen">
                <h.icon className="size-4" style={{ color: h.tone }} />
              </span>
              <div>
                <p className="text-[0.8125rem] font-semibold leading-tight">{h.name}</p>
                <p className="text-[0.625rem] text-ink-2">{h.when}</p>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-7 text-center">
              {WEEK.map(([d], di) => {
                const today = di === 5;
                const ok = (h.days.includes(di) && !today) || (today && h.days.includes(5) && todayDone(hi));
                return (
                  <div key={d} className="flex flex-col items-center gap-1">
                    <span className={`text-[0.5625rem] ${today ? 'font-bold text-accent' : 'text-ink-3'}`}>{d}</span>
                    {ok ? (
                      <span key="ok" className={`${today ? 'land' : ''} grid size-5 place-items-center rounded-full text-on-plate`} style={{ background: h.tone }}>
                        <Check className="size-3" strokeWidth={3.5} />
                      </span>
                    ) : (
                      <span className={`size-5 rounded-full border-[1.5px] ${today ? 'border-accent' : 'border-rule-strong'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Phone>
    </div>
  );
}

/* ------------------------------------------------------------------ Postępy */

const CHARTS = [
  { tab: 'Siła', unit: 'kg · szac. 1RM', value: '157', delta: '+12 kg', d: 'M6 96 L44 90 L82 84 L120 70 L158 66 L196 48 L234 40 L266 22' },
  { tab: 'Objętość', unit: 't w tygodniu', value: '32,5', delta: '+4,1 t', d: 'M6 88 L44 70 L82 78 L120 52 L158 60 L196 38 L234 44 L266 26' },
  { tab: 'Waga', unit: 'kg', value: '82,4', delta: '−2,6 kg', d: 'M6 24 L44 30 L82 28 L120 44 L158 52 L196 60 L234 74 L266 82' },
  { tab: 'Obwody', unit: 'cm · talia', value: '81', delta: '−4 cm', d: 'M6 30 L44 34 L82 44 L120 46 L158 58 L196 64 L234 70 L266 80' },
];

export function ProgressDemo() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const step = useLoop(4, 2600, on, 0);
  const c = CHARTS[step];

  return (
    <div ref={ref}>
      <Phone title="Wykresy" tab="Menu" label="Wykresy postępów: zakładki Siła, Objętość, Waga i Obwody z rysującą się linią, pod spodem cel i poziom">
        <div className="relative grid grid-cols-4 rounded-full bg-screen-2 p-1 text-center text-[0.6875rem] font-semibold">
          <span className="tab-indicator absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-full bg-screen" style={{ transform: `translateX(${step * 100}%)` }} />
          {CHARTS.map((x, n) => (
            <span key={x.tab} className={`relative py-1.5 ${n === step ? 'text-ink' : 'text-ink-2'}`}>
              {x.tab}
            </span>
          ))}
        </div>

        <div className="card p-3.5">
          <div className="flex items-end justify-between">
            <p key={c.tab} className="land">
              <span className="big text-4xl">{c.value}</span>
              <span className="ml-1.5 text-[0.6875rem] text-ink-2">{c.unit}</span>
            </p>
            <span key={c.delta} className="land chip bg-volt text-on-volt">
              {c.delta}
            </span>
          </div>
          <svg viewBox="0 0 272 110" className="mt-2 block w-full">
            <g stroke="var(--color-rule)" strokeWidth="1">
              <path d="M0 22 H272 M0 58 H272 M0 94 H272" />
            </g>
            <path key={c.tab} d={c.d} pathLength={1} className="chart-draw" fill="none" stroke="var(--color-volt)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="num flex justify-between text-[0.5625rem] text-ink-3">
            <span>wrz</span>
            <span>paź</span>
            <span>lis</span>
          </div>
        </div>

        <div className="card flex items-center gap-3 p-3.5">
          <Ring value={0.91} size={46} tone="var(--color-accent)">
            <span className="num text-[0.625rem] font-bold">91%</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-[0.625rem] text-ink-2">Cel · liczy się sam z treningów</p>
            <p className="truncate text-[0.8125rem] font-semibold">Wyciskanie 80 kg</p>
            <p className="num text-[0.6875rem] text-volt">72,5 / 80 kg · w tempie</p>
          </div>
        </div>

        <div className="card p-3.5">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-xl font-bold uppercase leading-none">
              Poziom <span className="text-volt">4</span>
            </p>
            <span className="num text-[0.625rem] text-ink-2">640 / 900 XP</span>
          </div>
          <Bar value={0.71} className="mt-2 h-1.5" />
          <div className="mt-2.5 flex gap-1.5">
            <span className="chip bg-screen text-ink">
              <Coins className="size-3 text-food" />
              240 FitCoins
            </span>
            <span className="chip bg-screen text-ink">
              <Trophy className="size-3 text-social" />
              5 / 24 osiągnięć
            </span>
          </div>
        </div>
      </Phone>
    </div>
  );
}

/* ------------------------------------------------------------------ Ekipa */

const FEED: { who: string; what: string; meta: string; icon: LucideIcon; tone: string }[] = [
  { who: 'Ola', what: 'zrobiła trening Push Day', meta: '6 ćwiczeń · 8,4 t', icon: Dumbbell, tone: 'var(--color-accent)' },
  { who: 'Tomek', what: 'przebiegł 10,2 km', meta: 'tempo 5:12 /km', icon: Footprints, tone: 'var(--color-run)' },
  { who: 'Anka', what: 'osiągnęła cel: martwy 100 kg', meta: 'po 9 tygodniach', icon: Trophy, tone: 'var(--color-volt)' },
];

export function CrewDemo() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const step = useLoop(6, [900, 1300, 1300, 1300, 1500, 3400], on);
  const you = [31, 34, 38, 41, 46, 50][step];
  const friend = [33, 35, 37, 40, 43, 44][step];

  return (
    <div ref={ref}>
      <Phone title="Ekipa" tab="Ekipa" label="Ekipa: aktywności znajomych pojawiają się w tablicy, a wyścig biegowy rozstrzyga się na Twoją korzyść">
        <div className="grid grid-cols-3 rounded-full bg-screen-2 p-1 text-center text-[0.6875rem] font-semibold">
          <span className="rounded-full bg-screen py-1.5">Znajomi</span>
          <span className="py-1.5 text-ink-2">Odkrywaj</span>
          <span className="py-1.5 text-ink-2">Ludzie</span>
        </div>

        <div className="rounded-2xl bg-volt p-3.5 text-on-volt">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-xl font-extrabold uppercase leading-none">Wyścig do 50 km</p>
            <span className="text-[0.625rem] font-bold">{step === 5 ? 'Wygrana!' : 'trwa'}</span>
          </div>
          <div className="num mt-2.5 space-y-1.5 text-[0.6875rem] font-semibold">
            {[
              ['Ty', you],
              ['Tomek', friend],
            ].map(([name, km]) => (
              <div key={name as string} className="grid grid-cols-[2.75rem_1fr_2.5rem] items-center gap-2">
                <span>{name}</span>
                <div className="h-2 overflow-hidden rounded-full bg-on-volt/15">
                  <div className="bar-fill h-full rounded-full bg-on-volt" style={{ transform: `scaleX(${(km as number) / 50})`, opacity: name === 'Ty' ? 1 : 0.45 }} />
                </div>
                <span className="text-right">{km} km</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {FEED.map((f, n) =>
            step > n ? (
              <div key={f.who} className="land card flex items-center gap-3 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-screen text-[0.75rem] font-bold">{f.who[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.75rem]">
                    <b>{f.who}</b> {f.what}
                  </p>
                  <p className="flex items-center gap-1 text-[0.625rem] text-ink-2">
                    <f.icon className="size-3" style={{ color: f.tone }} />
                    {f.meta}
                  </p>
                </div>
                <Heart
                  key={String(step > n + 1)}
                  className={`size-4 shrink-0 ${step > n + 1 ? 'land fill-accent text-accent' : 'text-ink-3'}`}
                />
              </div>
            ) : (
              <div key={f.who} className="h-[3.75rem] rounded-2xl border border-dashed border-rule" />
            ),
          )}
        </div>
      </Phone>
    </div>
  );
}

/* ------------------------------------------------------------------ Trener */

export function CoachDemo() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const step = useLoop(6, [1000, 1500, 1300, 1700, 1500, 3600], on);

  return (
    <div ref={ref}>
      <Phone title="Czat" label="Czat z trenerem: wysłany check-in, trener odpisuje i zmienia plan">
        <div className="flex items-center gap-2.5 px-1">
          <span className="grid size-9 place-items-center rounded-full bg-social text-[0.75rem] font-bold text-on-plate">M</span>
          <div>
            <p className="text-[0.8125rem] font-semibold leading-tight">Trener Michał</p>
            <p className="flex items-center gap-1 text-[0.625rem] text-ink-2">
              <span className="size-1.5 rounded-full bg-volt" />
              odpowiada zwykle w 2 godz.
            </p>
          </div>
        </div>

        <div className="flex min-h-[19rem] flex-col justify-end gap-2">
          {step >= 1 && (
            <div className="land ml-auto w-[86%] rounded-2xl rounded-br-md bg-accent p-3 text-on-accent">
              <p className="text-[0.625rem] font-bold uppercase tracking-wide">Check-in · tydzień 12</p>
              <div className="num mt-1.5 grid grid-cols-3 gap-2 text-[0.6875rem]">
                {[
                  ['Waga', '82,4'],
                  ['Talia', '81 cm'],
                  ['Forma', '9/10'],
                ].map(([a, b]) => (
                  <div key={a}>
                    <p className="opacity-70">{a}</p>
                    <p className="font-bold">{b}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 flex items-center justify-end gap-1 text-[0.5625rem] font-semibold">
                {step >= 2 ? 'Przejrzany' : 'Wysłany'}
                {step >= 2 ? <CheckCheck className="size-3" /> : <Check className="size-3" />}
              </p>
            </div>
          )}
          {step === 2 && (
            <div className="land typing flex w-14 items-center justify-center gap-1 rounded-2xl rounded-bl-md bg-screen-2 py-3.5">
              {[0, 1, 2].map((n) => (
                <i key={n} style={vars({ '--i': n })} />
              ))}
            </div>
          )}
          {step >= 3 && (
            <div className="land w-[86%] rounded-2xl rounded-bl-md bg-screen-2 p-3 text-[0.75rem] leading-relaxed">
              Dobry tydzień. Talia spada zgodnie z planem — dorzucam 100 g węgli w dni treningowe.
            </div>
          )}
          {step >= 4 && (
            <div className="land flex w-[86%] items-center gap-2.5 rounded-2xl rounded-bl-md bg-screen-2 p-3">
              <Sparkles className="size-4 shrink-0 text-volt" />
              <div className="min-w-0">
                <p className="truncate text-[0.75rem] font-semibold">Plan diety zaktualizowany</p>
                <p className="num text-[0.625rem] text-ink-2">2 750 → 2 850 kcal w dni treningowe</p>
              </div>
            </div>
          )}
          {step >= 5 && (
            <div className="land ml-auto rounded-2xl rounded-br-md bg-accent px-3 py-2 text-[0.75rem] font-semibold text-on-accent">Biorę. Dzięki!</div>
          )}
        </div>

        <div className="flex gap-1.5">
          {['Zrobione', 'Mam pytanie', 'Przełóżmy'].map((q) => (
            <span key={q} className="chip bg-screen-2 text-ink-2">
              {q}
            </span>
          ))}
        </div>
      </Phone>
    </div>
  );
}

/* ------------------------------------------------------------------ small floating cards (hero) */

export function FloatPR() {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-volt px-3.5 py-2.5 text-on-volt shadow-[var(--shadow-pop)]">
      <Trophy className="size-5" />
      <div>
        <p className="text-[0.625rem] font-bold uppercase tracking-wide">Nowy rekord</p>
        <p className="font-display text-xl font-extrabold uppercase leading-none">Przysiad 140 kg</p>
      </div>
    </div>
  );
}

export function FloatRest() {
  const [s, setS] = useState(84);
  useEffect(() => {
    const id = window.setInterval(() => setS((v) => (v <= 1 ? 90 : v - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="screen !rounded-2xl px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold text-ink-2">
        <Timer className="size-3 text-accent" />
        Przerwa
      </p>
      <p className="big text-3xl text-accent">
        0{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
      </p>
    </div>
  );
}

export function FloatRun() {
  return (
    <div className="screen flex items-center gap-2.5 !rounded-2xl px-3.5 py-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-run text-on-plate">
        <MapPin className="size-4" />
      </span>
      <div>
        <p className="text-[0.625rem] font-semibold text-ink-2">Bieg · na żywo</p>
        <p className="big text-xl">
          5,24 km <span className="text-sm text-ink-2">4:45 /km</span>
        </p>
      </div>
    </div>
  );
}

export function FloatFood() {
  return (
    <div className="screen flex items-center gap-2.5 !rounded-2xl py-2 pl-2 pr-3.5">
      <img src="/app/goal-protein.webp" alt="" width={480} height={240} className="h-11 w-14 rounded-xl object-cover object-right" />
      <div>
        <p className="text-[0.625rem] font-semibold text-ink-2">Białko</p>
        <p className="big text-xl">
          152 <span className="text-sm text-ink-2">/ 150 g</span>
        </p>
      </div>
    </div>
  );
}
