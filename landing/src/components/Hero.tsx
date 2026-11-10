import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { reveal } from '../lib/reveal';
import { LoadBar } from './LoadBar';

/* Only facts the product states about itself — no user counts or usage totals. */
const facts = [
  { value: '250+', caption: 'ćwiczeń z opisem techniki i zaangażowanymi mięśniami' },
  { value: '4 → 1', caption: 'dziennik, bieganie, dieta i kontakt z trenerem w jednej aplikacji' },
  { value: '0 zł', caption: 'za całość — bez subskrypcji, wersji premium i podawania karty' },
];

const ticker = ['Zapisz', 'Pobij', 'Powtórz'];

export function Hero() {
  return (
    <>
      <section aria-labelledby="hero-title" className="relative isolate overflow-x-clip pb-20 pt-[calc(var(--header-h)+2rem)] sm:pb-28 sm:pt-[calc(var(--header-h)+3.5rem)]">
        <div aria-hidden className="knurl absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
        <div aria-hidden className="bloom absolute -right-[20%] -top-[10%] -z-10 aspect-square w-[70%] max-w-[60rem]" />
        {/* a real lift behind the headline: full-bleed on phones, the right half from lg; both fade into the page */}
        <figure aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden sm:h-[40rem] lg:inset-x-auto lg:right-0 lg:h-[46rem] lg:w-[60%]">
          <img
            src="/images/hero-press.webp"
            alt=""
            width={2400}
            height={1602}
            fetchPriority="high"
            className="size-full object-cover object-[62%_35%] opacity-55 lg:opacity-75"
          />
          <div className="absolute inset-0 bg-linear-to-b from-paper/55 via-paper/35 to-paper" />
          <div className="absolute inset-0 hidden bg-linear-to-r from-paper via-paper/35 to-transparent lg:block" />
        </figure>

        <div className="shell">
          <a
            {...reveal(0)}
            href="#trening"
            className="group inline-flex max-w-full items-center gap-2 rounded-[var(--radius-pill)] bg-paper-2 py-1 pl-1 pr-3 text-sm transition-colors hover:bg-paper-3"
          >
            <span className="chip bg-accent-wash text-accent-ink">Nowość</span>
            <span className="truncate text-ink-2 group-hover:text-ink">Trening na ekranie blokady Androida</span>
            <ArrowRight className="size-3.5 shrink-0 text-ink-2" aria-hidden />
          </a>

          <h1 {...reveal(0, 'fade')} id="hero-title" className="display mt-6 text-[clamp(3.25rem,11vw,9rem)]">
            <span className="line-mask" style={{ '--i': 0 } as CSSProperties}>
              <span>Siłownia, bieganie i&nbsp;dieta.</span>
            </span>
            <span className="line-mask text-accent" style={{ '--i': 1 } as CSSProperties}>
              <span>Na jednej sztandze.</span>
            </span>
          </h1>

          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
            <p {...reveal(3)} className="lede max-w-[38rem]">
              Zapisujesz serie w trakcie treningu, biegasz z GPS i liczysz makro — w jednym dzienniku, który działa nawet
              w piwnicy bez zasięgu. Masz trenera? Widzi wszystko na bieżąco.
            </p>
            <div {...reveal(4)}>
              <div className="flex flex-col gap-2.5 min-[420px]:flex-row">
                <a href="/athlete/dashboard" className="btn btn-primary btn-lg">
                  Zacznij za darmo
                  <ArrowRight className="nudge size-4" aria-hidden />
                </a>
                <a href="/athlete/login" className="btn btn-ghost btn-lg">
                  Mam już konto
                </a>
              </div>
              <p className="mt-3 text-sm text-ink-2">Bez karty i subskrypcji. Działa też bez zasięgu.</p>
            </div>
          </div>

          <div {...reveal(5)} id="funkcje" className="mt-14 sm:mt-20">
            <LoadBar />
          </div>

          <dl className="mt-14 grid grid-cols-[minmax(0,1fr)] border-t border-rule sm:mt-20 sm:grid-cols-3 sm:divide-x sm:divide-rule">
            {facts.map((f, i) => (
              <div
                {...reveal(i)}
                key={f.value}
                className="flex flex-col-reverse gap-2 border-b border-rule py-6 sm:border-b-0 sm:px-8 sm:first:pl-0 sm:last:pr-0"
              >
                <dt className="max-w-[18rem] text-[0.9375rem] leading-snug text-ink-2">{f.caption}</dt>
                <dd className="big text-[clamp(3rem,5vw,4.5rem)]">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* the training loop as a ticker — decorative, pauses on hover */}
      <div aria-hidden className="marquee overflow-hidden border-y border-rule py-5 sm:py-7">
        <div className="marquee-track display text-[clamp(3rem,8vw,6.5rem)]">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 items-center">
              {[0, 1, 2].flatMap((rep) =>
                ticker.map((word, i) => (
                  <span key={`${rep}-${word}`} className="flex items-center">
                    <span className={i === 1 ? 'text-ink' : 'outline-type'}>{word}.</span>
                    <span className="plate mx-6 h-[0.62em] w-[0.14em] sm:mx-9" style={{ '--tone': 'var(--color-accent)' } as CSSProperties} />
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
