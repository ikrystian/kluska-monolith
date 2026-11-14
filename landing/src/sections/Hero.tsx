import { ArrowRight } from 'lucide-react';
import { getSeason, useNow } from '../lib/season';
import { usePointerVars, useScrub } from '../lib/motion';
import { Countdown } from '../components/Countdown';
import { FloatPR, FloatRest } from './demos';
import { Device, vars } from './ui';

const APP = 'https://app.leniwakluska.pl';

/* The sentence on the left, the app itself on the right: the "Dziś" screen closes its four daily
   goals in a loop while cards from other screens drift around it with the pointer and the scroll. */
export function Hero() {
  const season = getSeason(useNow());
  const pointer = usePointerVars<HTMLElement>();
  const scrub = useScrub<HTMLDivElement>();

  return (
    <section id="top" ref={pointer} aria-labelledby="hero-title" className="relative isolate overflow-clip pb-16 pt-10 sm:pt-14 lg:pb-24">
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-shade">
        <img
          src="/images/hero-press.webp"
          alt=""
          width={2400}
          height={1602}
          fetchPriority="high"
          className="hero-photo size-full object-cover object-[30%_22%] opacity-70 lg:object-[18%_28%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-paper via-paper/70 to-paper/25" />
        <div className="absolute inset-0 hidden bg-linear-to-l from-paper/85 via-paper/30 to-transparent lg:block" />
      </div>

      <div className="shell grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-8">
        <div>
          <Countdown season={season} className="hero-late" />

          <h1 id="hero-title" className="display mt-5 text-[clamp(3.25rem,14.5vw,6rem)] lg:text-[clamp(4.5rem,8.2vw,8.75rem)]">
            <span className="rise" style={vars({ '--i': 0 })}>
              <span>Nie czekaj</span>
            </span>
            <span className="rise text-accent" style={vars({ '--i': 1 })}>
              <span>{season.pre ? 'do stycznia.' : 'do poniedziałku.'}</span>
            </span>
          </h1>

          <p className="hero-late lede mt-6 max-w-[34rem] !text-ink" style={vars({ '--i': 2 })}>
            Trening, bieganie, jedzenie i nawyki w jednym dzienniku. Do tego ekipa, trener i zwierzak, który rośnie razem z Twoją formą.
            Zamknij dziś cztery cele dnia — jutro będzie co pobić.
          </p>

          <div className="hero-late mt-8" style={vars({ '--i': 3 })}>
            <div className="flex flex-col gap-2.5 min-[440px]:flex-row">
              <a href={APP} className="btn btn-primary btn-lg">
                Zacznij dziś
                <ArrowRight className="nudge size-5" aria-hidden />
              </a>
              <a href="#trening" className="btn btn-ghost btn-lg">
                Zobacz aplikację
              </a>
            </div>
            <p className="mt-3 text-sm text-ink-2">Za darmo i w całości. Bez karty, bez konta też się da — w trybie gościa.</p>
          </div>
        </div>

        <div ref={scrub} className="hero-late fan relative mx-auto w-full max-w-[26rem] lg:max-w-[29rem]" style={vars({ '--i': 4 })}>
          <div className="relative mx-auto w-[58%]">
            <div className="fan-l absolute -left-[62%] top-[9%] w-[88%]">
              <Device shot="log" alt="Ekran treningu z mapą regeneracji mięśni" eager />
            </div>
            <div className="fan-r absolute -right-[62%] top-[9%] w-[88%]">
              <Device shot="running" alt="Ekran biegania z kilometrami w tygodniu" eager />
            </div>
            <div className="fan-c relative">
              <Device shot="dashboard" alt="Ekran Dziś z paskiem tygodnia i celami dnia" eager />
            </div>
          </div>

          <div className="drift absolute -top-6 left-0 z-10 lg:top-[14%] xl:-left-8" style={vars({ '--dx': '22px', '--dy': '16px', '--sy': '140px' })}>
            <div className="bob" style={vars({ '--i': 0 })}>
              <FloatPR />
            </div>
          </div>
          <div className="drift absolute bottom-[12%] right-0 z-10 xl:-right-6" style={vars({ '--dx': '30px', '--dy': '22px', '--sy': '200px' })}>
            <div className="bob" style={vars({ '--i': 1 })}>
              <FloatRest />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const ROW_A = ['Dziennik serii', 'Stoper przerw', 'Kalkulator talerzy', 'Regeneracja mięśni', 'Bieg z GPS', 'Komunikaty głosowe', 'Wyzwania biegowe', 'Skaner kodów'];
const ROW_B = ['Cele dnia', 'Nawyki', 'Wykresy', 'Pomiary', 'Trofea', 'FitCoins', 'Zwierzak', 'Ekipa', 'Czat z trenerem', 'Check-in', 'Tryb offline', 'Widżety'];

/* Two lines of feature names sliding against each other as the page scrolls. */
export function Ticker() {
  const ref = useScrub<HTMLDivElement>();

  return (
    <div ref={ref} aria-hidden className="overflow-clip border-y border-rule py-5 sm:py-7">
      {[ROW_A, ROW_B].map((row, r) => (
        <div
          key={r}
          className={`scrub-row flex w-max items-center gap-x-6 whitespace-nowrap font-display text-[clamp(2rem,6vw,4.5rem)] font-extrabold uppercase leading-[1.05] sm:gap-x-9 ${r ? 'ml-[-30%]' : 'ml-[-4%]'}`}
          style={vars({ '--shift': r ? '26%' : '-26%' })}
        >
          {[...row, ...row].map((w, n) => (
            <span key={n} className="flex items-center gap-x-6 sm:gap-x-9">
              <span className={(n + r) % 3 === 0 ? 'text-ink' : 'outline-type'}>{w}</span>
              <span className={`size-2.5 rounded-full ${(n + r) % 2 ? 'bg-accent' : 'bg-volt'}`} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
