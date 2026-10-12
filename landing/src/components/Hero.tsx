import { ArrowRight, Check, CloudOff, Timer, Trophy } from 'lucide-react';
import { reveal } from '../lib/reveal';

const promises = ['Bez opłat i subskrypcji', 'Działa bez zasięgu', 'Synchronizacja ze Stravą', 'Android i iPhone'];

const sets = [
  { n: 1, w: '120', r: '6', rpe: '7,5', state: 'done' },
  { n: 2, w: '130', r: '5', rpe: '8', state: 'done' },
  { n: 3, w: '140', r: '5', rpe: '9', state: 'pr' },
  { n: 4, w: '140', r: '—', rpe: '—', state: 'next' },
] as const;

/* the app's workout screen, rendered as real UI on a dark stage — no device frame */
function ProductStage() {
  return (
    <div className="stage on-night relative isolate overflow-hidden p-4 sm:p-6 lg:p-7">
      <img
        src="/images/barbell-140kg.webp"
        alt=""
        width={2400}
        height={1100}
        fetchPriority="high"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 w-full object-cover opacity-45 [mask-image:linear-gradient(to_top,black,transparent)]"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="chip bg-night-3 text-night-ink-2">
          <CloudOff className="size-3.5" aria-hidden />
          Offline · zapisano na telefonie
        </span>
        <span className="chip bg-accent text-on-accent">
          <Timer className="size-3.5" aria-hidden />
          Przerwa <span className="num">01:24</span>
        </span>
      </div>

      <div className="ui mt-4 overflow-hidden shadow-pop">
        <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 sm:px-5">
          <div className="min-w-0">
            <p className="label text-night-ink-2">Nogi A · ćwiczenie 1 z 5</p>
            <p className="mt-0.5 truncate font-display text-lg font-semibold tracking-[-0.02em]">Przysiad ze sztangą</p>
          </div>
          <p className="shrink-0 text-right">
            <span className="label block text-night-ink-2">Tydzień temu</span>
            <span className="num text-sm font-semibold">135 kg × 5</span>
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="label text-left text-night-ink-2">
              <th className="px-4 py-2 font-medium sm:px-5">Seria</th>
              <th className="py-2 font-medium">kg</th>
              <th className="py-2 font-medium">Powt.</th>
              <th className="px-4 py-2 text-right font-medium sm:px-5">RPE</th>
            </tr>
          </thead>
          <tbody className="num">
            {sets.map((s) => (
              <tr
                key={s.n}
                className={`border-t border-night-rule ${s.state === 'next' ? 'bg-night-3/60 text-night-ink-2' : ''}`}
              >
                <td className="px-4 py-2.5 sm:px-5">
                  <span className="inline-flex items-center gap-2">
                    {s.state === 'next' ? (
                      <span className="size-4 rounded-full border border-night-ink-2" aria-hidden />
                    ) : (
                      <span className="grid size-4 place-items-center rounded-full bg-volt text-on-volt" aria-hidden>
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                    {s.n}
                  </span>
                </td>
                <td className={`py-2.5 font-semibold ${s.state === 'pr' ? 'text-accent' : ''}`}>{s.w}</td>
                <td className="py-2.5">{s.r}</td>
                <td className="px-4 py-2.5 text-right text-night-ink-2 sm:px-5">{s.rpe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="ui flex items-center gap-3 px-4 py-3 shadow-pop">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-volt text-on-volt" aria-hidden>
            <Trophy className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Nowy rekord: 140 kg × 5</p>
            <p className="label text-night-ink-2">+5 kg względem zeszłego tygodnia</p>
          </div>
        </div>
        <div className="ui px-4 py-3 shadow-pop">
          <div className="flex items-baseline justify-between">
            <p className="label text-night-ink-2">Białko dziś</p>
            <p className="num text-sm font-semibold">
              148 <span className="text-night-ink-2">/ 180 g</span>
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night-3">
            <div className="h-full w-[82%] rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pb-16 pt-10 sm:pb-24 sm:pt-16 lg:pt-20">
      <div className="shell grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-14">
        <div>
          <a
            {...reveal(0)}
            href="#korzysci"
            className="group inline-flex max-w-full items-center gap-2 rounded-[var(--radius-pill)] border border-rule bg-card py-1 pl-1 pr-3 text-sm transition-colors hover:border-rule-strong"
          >
            <span className="chip bg-accent-wash text-accent-ink">Nowość</span>
            <span className="truncate text-ink-2 group-hover:text-ink">Trening na ekranie blokady Androida</span>
            <ArrowRight className="size-3.5 shrink-0 text-ink-2" aria-hidden />
          </a>

          <h1 {...reveal(1)} id="hero-title" className="display mt-6 text-[clamp(2.625rem,5.2vw,4.25rem)]">
            Siłownia, bieganie i&nbsp;dieta. <span className="text-ink-2">W&nbsp;jednej aplikacji.</span>
          </h1>

          <p {...reveal(2)} className="lede mt-6 max-w-[34rem]">
            Zapisujesz serie w trakcie treningu, biegasz z GPS i liczysz makro — w jednym dzienniku, który działa
            nawet w piwnicy bez zasięgu. Masz trenera? Widzi wszystko na bieżąco.
          </p>

          <div {...reveal(3)} className="mt-9 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center">
            <a href="/athlete/dashboard" className="btn btn-primary btn-lg">
              Zacznij za darmo
              <ArrowRight className="nudge size-4" aria-hidden />
            </a>
            <a href="#funkcje" className="btn btn-ghost btn-lg">
              Zobacz, jak działa
            </a>
          </div>

          <ul {...reveal(4)} className="mt-9 grid gap-x-6 gap-y-2.5 text-sm text-ink-2 min-[420px]:grid-cols-2 sm:max-w-md">
            {promises.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-accent-ink" strokeWidth={2.5} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div {...reveal(2)}>
          <ProductStage />
        </div>
      </div>
    </section>
  );
}
