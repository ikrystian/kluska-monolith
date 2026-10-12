import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CardRail, RailCard } from './CardRail';
import { CheckinScreen, RunScreen, ScanScreen, SyncScreen, TimerScreen, WorkoutScreen } from './AppScreens';

type Step = { label: string; title: string; body: string; screen: ReactNode };

const steps: Step[] = [
  {
    label: 'Trening',
    title: 'Zapisz serię. Zobacz, co pobić.',
    body: 'Dziennik pamięta poprzednie ciężary i podpowiada progresję.',
    screen: <WorkoutScreen />,
  },
  {
    label: 'Przerwy',
    title: 'Przerwa startuje sama.',
    body: 'Po każdej serii rusza stoper, a ekran nie gaśnie w trakcie ćwiczenia.',
    screen: <TimerScreen />,
  },
  {
    label: 'Bieganie',
    title: 'Biegnij z GPS. Strava dostaje resztę.',
    body: 'Trasa, tempo na kilometrze i przewyższenia trafiają na Twój profil.',
    screen: <RunScreen />,
  },
  {
    label: 'Dieta',
    title: 'Skanuj kod zamiast przepisywać makro.',
    body: 'Produkty z bazy Open Food Facts w kilka sekund.',
    screen: <ScanScreen />,
  },
  {
    label: 'Trener',
    title: 'Trener widzi każdy trening.',
    body: 'Plan, wyniki i cotygodniowy check-in w jednym miejscu.',
    screen: <CheckinScreen />,
  },
  {
    label: 'Offline',
    title: 'Bez zasięgu nic nie ginie.',
    body: 'Serie zapisują się na telefonie i synchronizują po powrocie sieci.',
    screen: <SyncScreen />,
  },
];

/* scroll distance per step, in dvh — the pinned stage stays put while the active step advances */
const PER_STEP = 60;

function PinnedStage({ active }: { active: number }) {
  return (
    <div className="pin-stage">
      <div className="shell grid h-full grid-cols-[minmax(0,1fr)_minmax(0,22rem)_minmax(0,1fr)] grid-rows-3 gap-x-12 pb-8 xl:gap-x-20">
        {steps.map((s, i) => {
          const on = active === i;
          return (
            <article
              key={s.title}
              aria-current={on ? 'step' : undefined}
              style={{ gridColumn: i % 2 === 0 ? 1 : 3, gridRow: Math.floor(i / 2) + 1 }}
              className={`self-center transition-colors duration-200 ${on ? 'text-ink' : 'text-ink-3'}`}
            >
              <p className={`label ${on ? 'text-accent-ink' : 'text-ink-3'}`}>{s.label}</p>
              <h3 className="mt-2 font-display text-[clamp(1.375rem,2.1vw,1.875rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
                {s.title}
              </h3>
              <p className={`mt-3 max-w-[22rem] text-[0.9375rem] leading-relaxed ${on ? 'text-ink-2' : 'text-ink-3'}`}>{s.body}</p>
            </article>
          );
        })}

        {/* the screens duplicate the statements, so they are hidden from assistive tech and from the tab order */}
        <div aria-hidden inert style={{ gridColumn: 2, gridRow: '1 / span 3' }} className="grid place-items-center">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={`col-start-1 row-start-1 w-full transition-[opacity,transform] duration-[420ms] ease-[var(--ease-out)] ${
                active === i ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
              }`}
            >
              {s.screen}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StickyFeatures() {
  const [active, setActive] = useState(0);
  const triggers = useRef<(HTMLDivElement | null)[]>([]);

  /* advance when a trigger band crosses the middle of the viewport */
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );
    triggers.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="funkcje" aria-labelledby="features-title" className="pt-16 sm:pt-24">
      <div className="shell">
        <h2 id="features-title" className="h-section max-w-[16ch]">
          Zajrzyj do środka.
        </h2>
        <p className="lede mt-5 max-w-xl">Sześć ekranów, na które patrzysz najczęściej — w trakcie treningu, biegu i tygodnia z trenerem.</p>
      </div>

      {/* desktop: the stage pins while the statements light up one after another */}
      <div className="relative mt-4 hidden lg:block" style={{ height: `${(steps.length - 1) * PER_STEP + 100}dvh` }}>
        <PinnedStage active={active} />
        <div className="pointer-events-none absolute inset-x-0 top-0" aria-hidden>
          {steps.map((_, i) => (
            <div
              key={i}
              ref={(el) => {
                triggers.current[i] = el;
              }}
              data-step={i}
              style={{ height: i === steps.length - 1 ? '100dvh' : `${PER_STEP}dvh` }}
            />
          ))}
        </div>
      </div>

      {/* phones and tablets: pinning is rough on small screens, so the same six steps become a swipeable rail */}
      <div className="mt-10 lg:hidden">
        <CardRail label="Sześć ekranów aplikacji">
          {steps.map((s) => (
            <RailCard key={s.title} label={s.label} title={s.title} body={s.body}>
              {s.screen}
            </RailCard>
          ))}
        </CardRail>
      </div>
    </section>
  );
}
