import { ArrowRight } from 'lucide-react';

/* the dark rounded teaser the reference drops between its feature walk and its stats */
const plates = [
  { cls: 'bg-plate-25', h: 'h-28', w: 'w-3.5' },
  { cls: 'bg-plate-25', h: 'h-28', w: 'w-3.5' },
  { cls: 'bg-plate-10', h: 'h-[4.5rem]', w: 'w-3' },
];

export function CalcTeaser() {
  return (
    <section aria-labelledby="teaser-title" className="px-3 pt-4 sm:px-4 lg:pt-12">
      <div className="mx-auto grid max-w-[60rem] grid-cols-[minmax(0,1fr)] items-center gap-8 rounded-[var(--radius-card)] bg-paper-3 p-7 shadow-pop sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
        <div>
          <h2 id="teaser-title" className="font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
            Czwarta seria to nie czas na matematykę.
          </h2>
          <p className="mt-3 max-w-md text-ink-2">
            Wpisz ciężar, a aplikacja rozpisze talerze na stronę. Ten sam kalkulator masz niżej — wypróbuj go tutaj.
          </p>
          <a href="#kalkulator" className="btn btn-primary mt-7">
            Wypróbuj kalkulator
            <ArrowRight className="nudge size-4" aria-hidden />
          </a>
        </div>

        {/* 140 kg on a 20 kg bar: 2 × 25 + 10 on each side, drawn from the plate tokens */}
        <div className="hidden items-center md:flex" aria-hidden>
          <div className="h-2 w-16 rounded-l-sm bg-steel" />
          <div className="h-8 w-2 bg-steel" />
          <div className="flex items-center gap-[3px] bg-steel/70 py-[0.4rem] pr-1">
            {plates.map((p, i) => (
              <span key={i} className={`${p.cls} ${p.h} ${p.w} rounded-[3px]`} />
            ))}
          </div>
          <div className="h-2 w-10 rounded-r-sm bg-steel/70" />
        </div>
      </div>
    </section>
  );
}
