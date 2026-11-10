import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { useInView } from '../lib/motion';
import { useCountUp } from '../lib/stages';
import { daysInYear, getSeason, plural, useNow } from '../lib/season';

/* The resolution as a wall planner: every day of the year is a cell, training days get inked.
   The visitor sets how often they train and whether they start today or on 1 January —
   the counts are plain calendar arithmetic for the real year, nothing estimated. */

const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

/* weekday indexes (Monday = 0) that get a session at each weekly frequency */
const PATTERN: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
};

type Cell = {
  day: number;
  weekday: number;
  order: number;
  gone: boolean;
  today: boolean;
};
type Month = { key: string; label: string; offset: number; cells: Cell[] };

const mondayFirst = (d: Date) => (d.getDay() + 6) % 7;

function buildMonths(year: number, fromMonth: number, today: Date, startOrder: number) {
  const months: Month[] = [];
  let order = startOrder;

  for (let m = fromMonth; m < 12; m++) {
    const count = new Date(year, m + 1, 0).getDate();
    const cells: Cell[] = [];
    for (let day = 1; day <= count; day++) {
      const date = new Date(year, m, day);
      const sameYear = today.getFullYear() === year;
      const gone = sameYear && (m < today.getMonth() || (m === today.getMonth() && day < today.getDate()));
      const isToday = sameYear && m === today.getMonth() && day === today.getDate();
      cells.push({
        day,
        weekday: mondayFirst(date),
        order: order++,
        gone,
        today: isToday,
      });
    }
    months.push({
      key: `${year}-${m}`,
      label: MONTHS[m],
      offset: mondayFirst(new Date(year, m, 1)),
      cells,
    });
  }

  return { months, nextOrder: order };
}

function MonthGrid({ month, active, lit, bonus = false }: { month: Month; active: Set<number>; lit: boolean; bonus?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 font-display text-base font-bold uppercase leading-none tracking-[0.04em] text-sheet-ink-2">{month.label}</p>
      <div className="yp-month">
        {Array.from({ length: month.offset }, (_, k) => (
          <span key={`o${k}`} />
        ))}
        {month.cells.map((c) => {
          const on = lit && !c.gone && active.has(c.weekday);
          return (
            <span
              key={c.day}
              style={{ '--d': c.order } as CSSProperties}
              className={`yp-cell ${bonus ? 'bonus' : ''} ${on ? 'on' : ''} ${c.gone ? 'gone' : ''} ${c.today ? 'today' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function YearPlan() {
  // the calendar only changes at midnight; a minute tick is plenty
  const now = useNow(60_000);
  const season = getSeason(now);
  const { pre, planYear } = season;

  const [perWeek, setPerWeek] = useState(3);
  const [startToday, setStartToday] = useState(true);
  const [ref, inView] = useInView<HTMLDivElement>(0.15);

  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const { head, year } = useMemo(() => {
    const today = new Date();
    // from October the months left in this year come first: the head start
    const lead = pre ? buildMonths(planYear - 1, today.getMonth(), today, 0) : { months: [], nextOrder: 0 };
    const main = buildMonths(planYear, 0, today, lead.nextOrder);
    return { head: lead.months, year: main.months };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pre, planYear, todayKey]);

  const active = useMemo(() => new Set(PATTERN[perWeek]), [perWeek]);
  const count = (months: Month[]) => months.reduce((sum, m) => sum + m.cells.filter((c) => !c.gone && active.has(c.weekday)).length, 0);

  const inYear = count(year);
  const headStart = count(head);
  const total = inYear + (pre && startToday ? headStart : 0);
  const shown = useCountUp(inView ? total : 0);

  return (
    <section id="rok" aria-labelledby="rok-title" className="sheet grain">
      <div className="shell py-20 sm:py-28">
        {/* phones read it top to bottom: controls, calendar, result. From lg the calendar takes the right column. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-20">
          <div>
            <h2 id="rok-title" className="display text-[clamp(2.75rem,5.4vw,5.25rem)]">
              {daysInYear(planYear)} kratek. Ile zamalujesz?
            </h2>
            <p className="muted mt-6 max-w-[30rem] text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]">
              Postanowienie to nie data w kalendarzu, tylko kratki, które po drodze zamalujesz. Ustaw swój tydzień i zobacz cały {planYear}.
            </p>

            <div className="mt-9 space-y-6">
              <fieldset>
                <legend className="label muted">Ile razy w tygodniu trenujesz?</legend>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {[2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-pressed={perWeek === n} onClick={() => setPerWeek(n)} className="seg num">
                      {n}×
                    </button>
                  ))}
                </div>
              </fieldset>

              {pre && (
                <fieldset>
                  <legend className="label muted">Kiedy zaczynasz?</legend>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button type="button" aria-pressed={startToday} onClick={() => setStartToday(true)} className="seg">
                      Dziś
                    </button>
                    <button type="button" aria-pressed={!startToday} onClick={() => setStartToday(false)} className="seg">
                      1 stycznia
                    </button>
                  </div>
                </fieldset>
              )}
            </div>
          </div>

          <div
            ref={ref}
            className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
            role="img"
            aria-label={`Kalendarz do końca ${planYear}: ${total} dni treningowych przy ${perWeek} treningach w tygodniu`}
          >
            {head.length > 0 && (
              <div className={`mb-8 border-b border-sheet-rule pb-8 transition-opacity duration-300 ${startToday ? '' : 'opacity-45'}`}>
                <p className="mb-4 flex items-baseline justify-between gap-4">
                  <span className="big text-4xl">{planYear - 1}</span>
                  <span className="label muted text-right">
                    przewaga: {season.days + 1} {plural(season.days + 1, 'dzień', 'dni', 'dni')} do końca roku
                  </span>
                </p>
                <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:gap-x-6">
                  {head.map((m) => (
                    <MonthGrid key={m.key} month={m} active={active} lit={inView && startToday} bonus />
                  ))}
                </div>
              </div>
            )}

            <p className="mb-4 flex items-baseline justify-between gap-4">
              <span className="big text-4xl">{planYear}</span>
              <span className="label muted text-right">
                {inYear} {plural(inYear, 'dzień treningowy', 'dni treningowe', 'dni treningowych')}
              </span>
            </p>
            <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:gap-x-6">
              {year.map((m) => (
                <MonthGrid key={m.key} month={m} active={active} lit={inView} />
              ))}
            </div>
            <p className="muted mt-6 text-sm">
              Kalendarz {planYear}, tydzień od poniedziałku. Dni treningowe rozłożone równo — w aplikacji ustawiasz własne.
            </p>
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <div className="border-t border-sheet-rule pt-7">
              {/* the rolling figure is decoration; screen readers get the settled sentence */}
              <p className="sr-only" aria-live="polite">
                {total} {plural(total, 'trening', 'treningi', 'treningów')} do końca {planYear}
              </p>
              <p className="flex flex-wrap items-end gap-x-4 gap-y-1" aria-hidden>
                <span className="big text-[clamp(6.5rem,24vw,12rem)] !leading-[0.82] text-sheet-accent">{shown}</span>
                <span className="max-w-[12rem] pb-2 font-display text-2xl font-bold uppercase leading-[1.05]">
                  {plural(total, 'trening', 'treningi', 'treningów')} do końca {planYear}
                </span>
              </p>
              {pre && (
                <p className="muted mt-4 max-w-[28rem] leading-relaxed">
                  {startToday ? (
                    <>
                      W tym <strong className="font-semibold text-sheet-ink">{headStart} jeszcze przed sylwestrem</strong> — to Twoja przewaga nad
                      wszystkimi, którzy ruszą 1 stycznia.
                    </>
                  ) : (
                    <>
                      Czekając do stycznia, oddajesz{' '}
                      <strong className="font-semibold text-sheet-ink">
                        {headStart} {plural(headStart, 'trening', 'treningi', 'treningów')}
                      </strong>
                      , które możesz mieć za sobą, zanim inni zaczną.
                    </>
                  )}
                </p>
              )}
            </div>

            <a href="https://app.leniwakluska.pl" className="btn btn-ink btn-lg mt-8">
              Zamaluj pierwszą kratkę
              <ArrowRight className="nudge size-5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
