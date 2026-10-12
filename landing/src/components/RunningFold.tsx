import { reveal } from '../lib/reveal';

const splits = [
  ['GPS', 'Ślad trasy, przewyższenia, kadencja'],
  ['Splity', 'Tempo na każdym kilometrze, podawane głosem'],
  ['Strava', 'Po „Zakończ bieg” aktywność ląduje na profilu'],
];

export function RunningFold() {
  return (
    <section id="bieganie" aria-labelledby="run-title" className="on-night bg-night text-night-ink">
      <figure {...reveal(0, 'fade')} className="parallax relative">
        <img
          src="/images/route-terrain.webp"
          alt="Biegacz w terenie o zachodzie słońca — dynamiczny krok na górskim grzbiecie"
          width={2400}
          height={1300}
          loading="lazy"
          className="block h-[58vw] max-h-[46rem] min-h-[18rem] w-full object-cover object-center"
        />
        <figcaption className="absolute left-0 top-0 w-full">
          <p className="shell label pt-5 text-night-ink-2 sm:pt-7">
            Trening w terenie · tempo, kadencja i przewyższenia · automatyczna synchronizacja ze Strava
          </p>
        </figcaption>
      </figure>

      <div className="shell grid gap-10 pb-20 pt-4 sm:pb-28 lg:grid-cols-12 lg:gap-12">
        <h2 {...reveal(0)} id="run-title" className="display text-[clamp(2.5rem,6vw,4.75rem)] lg:col-span-6">
          W{'\u00a0'}dzień siłowy sztanga. W{'\u00a0'}pozostałe — trasa.
        </h2>
        <div {...reveal(1)} className="lg:col-span-5 lg:col-start-8 lg:pt-3">
          <p className="text-lg leading-relaxed text-night-ink-2">
            Bieganie nie wymaga osobnej aplikacji. Ten sam dziennik zapisuje trening w lesie i w piwnicy, a tygodniowe
            podsumowanie łączy kilometry z tonażem.
          </p>
          <dl className="mt-8 border-t border-night-rule">
            {splits.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 border-b border-night-rule py-3.5">
                <dt className="label pt-0.5 text-accent">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
