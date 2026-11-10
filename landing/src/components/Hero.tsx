import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { getSeason, useNow } from '../lib/season';
import { Countdown } from './Countdown';

const i = (n: number) => ({ '--i': n }) as CSSProperties;

/* One photograph, one sentence, one clock. From October the clock counts down to 1 January;
   the rest of the year the sentence turns on the other classic excuse — Monday. */
export function Hero() {
  const season = getSeason(useNow());

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-2.5rem)] flex-col justify-end overflow-clip pb-10 pt-[calc(var(--header-h)+2.5rem)] sm:pb-14"
    >
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-shade">
        <img
          src="/images/hero-press.webp"
          alt=""
          width={2400}
          height={1602}
          fetchPriority="high"
          className="hero-photo size-full object-cover object-[66%_22%] lg:object-[50%_30%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-paper via-paper/60 to-paper/5" />
        <div className="absolute inset-0 hidden bg-linear-to-r from-paper/75 via-paper/20 to-transparent lg:block" />
      </div>

      <div className="shell">
        <Countdown season={season} className="hero-late" />

        <h1 id="hero-title" className={`display mt-5 ${season.pre ? 'text-[clamp(3.25rem,14.5vw,12rem)]' : 'text-[clamp(2.5rem,11vw,9.5rem)]'}`}>
          <span className="rise" style={i(0)}>
            <span>Nie czekaj</span>
          </span>
          <span className="rise text-accent" style={i(1)}>
            <span>{season.pre ? 'do stycznia.' : 'do poniedziałku.'}</span>
          </span>
        </h1>

        <div className="mt-7 grid grid-cols-[minmax(0,1fr)] items-end gap-7 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
          <p className="hero-late lede max-w-[37rem] !text-ink" style={i(2)}>
            {season.pre
              ? 'Postanowienie noworoczne rzadko dożywa lutego. Zapisana seria zostaje. Zacznij dziś dziennik treningu, biegania i jedzenia — 1\u00a0stycznia będziesz już w rytmie, kiedy inni dopiero szukają karnetu.'
              : 'Najlepszy dzień na pierwszy trening był wczoraj. Drugi najlepszy jest dziś. Zapisz pierwszą serię w dzienniku treningu, biegania i jedzenia — za tydzień będziesz mieć co pobić.'}
          </p>

          <div className="hero-late" style={i(3)}>
            <div className="flex flex-col gap-2.5 min-[440px]:flex-row">
              <a href="https://app.leniwakluska.pl" className="btn btn-primary btn-lg">
                Zacznij dziś
                <ArrowRight className="nudge size-5" aria-hidden />
              </a>
              <a href="https://app.leniwakluska.pl" className="btn btn-ghost btn-lg">
                Mam już konto
              </a>
            </div>
            <p className="mt-3 text-sm text-ink-2">Za darmo i w całości. Bez karty, bez wersji premium.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
