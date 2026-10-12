import type { ReactNode } from 'react';
import { ArrowRight, Check, CloudOff, Flame, MessageCircle, ScanBarcode, Timer, Trophy } from 'lucide-react';
import { reveal } from '../lib/reveal';

/* Fragments of the app, scattered around the headline — the reference scatters user quotes here;
   we have no real quotes to show, so the scatter is product UI instead. Decorative, hence aria-hidden.
   Below xl they fall back to a wrapped row under the CTA. */
const frags: { pos: string; body: ReactNode }[] = [
  {
    pos: 'xl:left-[2%] xl:top-[7%] xl:-rotate-2',
    body: (
      <>
        <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-volt text-on-volt">
          <Trophy className="size-4" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="label block text-ink-2">Przysiad</span>
          <span className="num text-sm font-semibold">140 kg × 5 · rekord</span>
        </span>
      </>
    ),
  },
  {
    pos: 'xl:right-[3%] xl:top-[10%] xl:rotate-1',
    body: (
      <>
        <Timer className="size-4 shrink-0 text-accent" />
        <span className="leading-tight">
          <span className="label block text-ink-2">Przerwa</span>
          <span className="num text-lg font-semibold">01:24</span>
        </span>
      </>
    ),
  },
  {
    pos: 'xl:left-[1%] xl:top-[31%] xl:rotate-1',
    body: (
      <span className="block leading-tight">
        <span className="label block text-ink-2">Bieg · Park Leśny</span>
        <span className="num block whitespace-nowrap text-sm font-semibold">10,24 km · 4:45 /km</span>
        <span className="mt-1.5 flex">
          <span className="chip bg-volt text-on-volt">
            <Check className="size-3" strokeWidth={3} aria-hidden />
            wysłano do Strava
          </span>
        </span>
      </span>
    ),
  },
  {
    pos: 'xl:right-[0%] xl:top-[34%] xl:-rotate-1',
    body: (
      <>
        <MessageCircle className="mt-0.5 size-4 shrink-0 self-start text-ink-2" />
        <span className="leading-snug">
          <span className="label block text-ink-2">Trener Michał</span>
          <span className="text-sm">Dobry progres na ławce.</span>
        </span>
      </>
    ),
  },
  {
    pos: 'xl:left-[4%] xl:top-[54%] xl:-rotate-1',
    body: (
      <span className="block w-44 leading-tight">
        <span className="flex items-baseline justify-between">
          <span className="label text-ink-2">Białko dziś</span>
          <span className="num text-sm font-semibold">148 / 180 g</span>
        </span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-screen-2">
          <span className="block h-full w-[82%] rounded-full bg-accent" />
        </span>
      </span>
    ),
  },
  {
    pos: 'xl:right-[4%] xl:top-[57%] xl:rotate-2',
    body: (
      <span className="leading-tight">
        <span className="label block text-ink-2">140 kg na stronę</span>
        <span className="num text-sm font-semibold">2 × 25 + 10 kg</span>
      </span>
    ),
  },
  {
    pos: 'xl:left-[1%] xl:top-[77%] xl:rotate-2',
    body: (
      <>
        <ScanBarcode className="size-4 shrink-0 text-ink-2" />
        <span className="leading-tight">
          <span className="text-sm font-medium">Znaleziono</span>
          <span className="label block text-ink-2">makro na 100 g</span>
        </span>
      </>
    ),
  },
  {
    pos: 'xl:right-[2%] xl:top-[79%] xl:-rotate-2',
    body: (
      <>
        <Flame className="size-4 shrink-0 text-accent" />
        <span className="leading-tight">
          <span className="num text-sm font-semibold">5 dni z rzędu</span>
          <span className="label block text-ink-2">seria trwa</span>
        </span>
      </>
    ),
  },
  {
    pos: 'xl:left-[19%] xl:top-[91%] xl:-rotate-1',
    body: (
      <>
        <CloudOff className="size-4 shrink-0 text-ink-2" />
        <span className="text-sm font-medium">Zapisano na telefonie</span>
      </>
    ),
  },
];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-x-clip">
      <div className="shell">
        <div className="relative z-10 mx-auto max-w-[46rem] pb-10 pt-14 sm:pt-20 lg:pt-24 xl:pb-48 xl:pt-28">
          <a
            {...reveal(0)}
            href="#trening"
            className="group inline-flex max-w-full items-center gap-2 rounded-[var(--radius-pill)] border border-rule bg-paper-2 py-1 pl-1 pr-3 text-sm transition-colors hover:border-rule-strong"
          >
            <span className="chip bg-accent-wash text-accent-ink">Nowość</span>
            <span className="truncate text-ink-2 group-hover:text-ink">Trening na ekranie blokady Androida</span>
            <ArrowRight className="size-3.5 shrink-0 text-ink-2" aria-hidden />
          </a>

          <h1 {...reveal(1)} id="hero-title" className="display mt-6 text-[clamp(2.5rem,5.6vw,4.75rem)]">
            Siłownia, bieganie i&nbsp;dieta. <span className="text-ink-2">W&nbsp;jednej aplikacji.</span>
          </h1>

          <p {...reveal(2)} className="lede mt-6 max-w-[36rem]">
            Zapisujesz serie w trakcie treningu, biegasz z GPS i liczysz makro — w jednym dzienniku, który działa nawet
            w piwnicy bez zasięgu. Masz trenera? Widzi wszystko na bieżąco.
          </p>

          <div {...reveal(3)} className="mt-9">
            <a href="/athlete/dashboard" className="btn btn-primary btn-lg">
              Zacznij za darmo
              <ArrowRight className="nudge size-4" aria-hidden />
            </a>
            <p className="mt-4 text-sm text-ink-2">Bez karty i subskrypcji. Działa też bez zasięgu.</p>
          </div>
        </div>

        <ul
          aria-hidden
          className="mx-auto mt-4 flex max-w-[46rem] flex-wrap gap-2 pb-14 xl:absolute xl:inset-0 xl:m-0 xl:block xl:max-w-none xl:pb-0"
        >
          {frags.map((f, i) => (
            <li
              {...reveal(i + 3)}
              key={i}
              className={`screen flex w-fit items-center gap-2.5 !rounded-[var(--radius-ui)] px-3 py-2.5 !shadow-none xl:absolute ${f.pos}`}
            >
              {f.body}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
