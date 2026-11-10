import { ArrowRight } from 'lucide-react';
import { getSeason, plural, useNow } from '../lib/season';

/* The closing poster: the brand's own line on a full ember field, the lifter printed into it. */
export function CtaSection() {
  const season = getSeason(useNow(60_000));

  return (
    <section aria-labelledby="cta-title" className="on-ember grain overflow-clip">
      <img
        src="/images/deadlift-dark.webp"
        alt=""
        width={2400}
        height={1600}
        loading="lazy"
        className="duotone cta-photo absolute inset-y-0 right-0 -z-10 hidden h-full w-[62%] object-cover object-[50%_30%] opacity-60 lg:block"
      />
      <div className="shell pb-14 pt-24 sm:pb-20 sm:pt-36">
        <p className="font-display text-2xl font-bold uppercase leading-none sm:text-3xl">
          {season.pre
            ? `Do stycznia ${season.days} ${plural(season.days, 'dzień', 'dni', 'dni')}. Pierwsza kratka czeka dziś.`
            : `Dzień ${season.dayOfYear} z ${season.daysInYear}. Pierwsza kratka czeka dziś.`}
        </p>
        <h2 id="cta-title" className="display mt-4 max-w-[11ch] text-[clamp(3.5rem,13vw,11.5rem)]">
          Koniec z&nbsp;byciem leniwą kluską.
        </h2>
        <div className="mt-9 grid grid-cols-[minmax(0,1fr)] items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <p className="max-w-xl text-lg font-medium leading-relaxed sm:text-xl">
            Wybierz szablon, zapisz pierwszą serię i za tydzień zobacz, o ile ją pobiłeś. Za darmo, w całości — w przeglądarce od razu, a na
            Androidzie także jako aplikacja.
          </p>
          <div className="flex flex-col gap-2.5 min-[440px]:flex-row">
            <a href="https://app.leniwakluska.pl" className="btn btn-ink btn-lg">
              Zacznij dziś
              <ArrowRight className="nudge size-5" aria-hidden />
            </a>
            <a href="https://app.leniwakluska.pl" className="btn btn-lg btn-on-ember">
              Mam już konto
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
