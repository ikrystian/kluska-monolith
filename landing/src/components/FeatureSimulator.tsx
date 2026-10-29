import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, Dumbbell, MessageCircle, Pause, Play, RotateCcw, Route, UtensilsCrossed } from 'lucide-react';
import { reveal } from '../lib/reveal';

type TabId = 'workout' | 'running' | 'diet' | 'checkin';

const tabs: { id: TabId; name: string; icon: typeof Dumbbell }[] = [
  { id: 'workout', name: 'Trening', icon: Dumbbell },
  { id: 'running', name: 'Bieganie', icon: Route },
  { id: 'diet', name: 'Dieta', icon: UtensilsCrossed },
  { id: 'checkin', name: 'Trener', icon: MessageCircle },
];

const REST = 90;

function useRestTimer() {
  const [seconds, setSeconds] = useState(REST);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const toggle = () => {
    if (seconds === 0) setSeconds(REST);
    setRunning((r) => !r);
  };
  const reset = () => {
    setRunning(false);
    setSeconds(REST);
  };
  const label = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return { seconds, running, toggle, reset, label };
}

/* a screen of the app, on the dark stage — real UI, not a device frame */
function Sheet({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <div className="ui overflow-hidden shadow-pop">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-night-rule px-5 py-4">
        <h4 className="font-display font-semibold tracking-[-0.02em]">{title}</h4>
        {meta && <span className="label text-night-ink-2">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function Panel({ id, title, body, points, children }: { id: TabId; title: string; body: string; points: string[]; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12"
    >
      <div className="px-1 lg:pl-4">
        <h3 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.03em]">{title}</h3>
        <p className="mt-4 leading-relaxed text-ink-2">{body}</p>
        <ul className="mt-6 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-ink" aria-hidden>
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span className="leading-snug">{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="stage on-night space-y-3 p-3 sm:p-5">{children}</div>
    </div>
  );
}

export function FeatureSimulator() {
  const [active, setActive] = useState<TabId>('workout');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRestTimer();

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="funkcje" aria-labelledby="modules-title" className="section bg-paper-2">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <h2 {...reveal(0)} id="modules-title" className="h-section">
            Zajrzyj do środka.
          </h2>
          <p {...reveal(1)} className="lede mx-auto mt-5 max-w-2xl">
            Tak wygląda aplikacja w trakcie treningu, biegu i tygodnia z trenerem. Stoper przerwy działa — wypróbuj.
          </p>
        </div>

        <div {...reveal(0)} className="mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label="Moduły aplikacji"
            className="inline-grid grid-cols-4 gap-1 rounded-[var(--radius-pill)] border border-rule bg-card p-1"
          >
            {tabs.map((t, i) => {
              const on = active === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={on}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(t.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-pill)] px-3 text-sm font-semibold transition-colors sm:px-5 ${
                    on ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                  }`}
                >
                  <Icon className="hidden size-4 min-[480px]:block" aria-hidden />
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        <div {...reveal(1)} className="card mt-6 p-3 sm:p-5">
          {active === 'workout' && (
            <Panel
              id="workout"
              title="Zapisujesz serię, zanim odpoczniesz."
              body="Aplikacja pamięta poprzednie ciężary, sugeruje progresję, liczy tonaż i RPE, a po każdej serii sama odpala przerwę."
              points={[
                'Wynik sprzed tygodnia przy każdym ćwiczeniu',
                'Kalkulator talerzy wbudowany w dziennik',
                'Ekran nie gaśnie w trakcie ćwiczenia',
              ]}
            >
              <Sheet title="Przysiad ze sztangą" meta="Ćwiczenie 1 z 5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="label text-left text-night-ink-2">
                      <th className="px-5 py-2.5 font-medium">Seria</th>
                      <th className="py-2.5 font-medium">Ciężar</th>
                      <th className="py-2.5 font-medium">Powt.</th>
                      <th className="px-5 py-2.5 text-right font-medium">RPE</th>
                    </tr>
                  </thead>
                  <tbody className="num">
                    {[
                      ['1', '120 kg', '6', '7,5', false],
                      ['2', '130 kg', '5', '8', false],
                      ['3', '140 kg', '5', '9', true],
                    ].map(([s, w, r, rpe, pr]) => (
                      <tr key={s as string} className="border-t border-night-rule">
                        <td className="px-5 py-3">
                          {s}
                          {pr && <span className="chip ml-2 !min-h-5 bg-volt !px-1.5 text-[0.6875rem] text-on-volt">PR</span>}
                        </td>
                        <td className={`py-3 font-semibold ${pr ? 'text-accent' : ''}`}>{w}</td>
                        <td className="py-3">{r}</td>
                        <td className="px-5 py-3 text-right text-night-ink-2">{rpe}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap justify-between gap-2 border-t border-night-rule px-5 py-3 text-sm">
                  <span className="text-night-ink-2">
                    Objętość <span className="num font-semibold text-night-ink">2 070 kg</span>
                  </span>
                  <span className="num text-night-ink-2">poprz. 135 kg × 5</span>
                </div>
              </Sheet>

              <div className="ui flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="label text-night-ink-2">Przerwa — kliknij play</p>
                  <p className={`num text-4xl font-semibold ${timer.running ? 'text-accent' : ''}`} aria-live="polite" aria-atomic>
                    {timer.label}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={timer.toggle}
                    aria-label={timer.running ? 'Zatrzymaj stoper' : 'Uruchom stoper'}
                    className="grid size-12 place-items-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover"
                  >
                    {timer.running ? <Pause className="size-5" /> : <Play className="size-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={timer.reset}
                    aria-label="Resetuj stoper"
                    className="grid size-12 place-items-center rounded-full border border-night-rule transition-colors hover:border-night-ink-2"
                  >
                    <RotateCcw className="size-5" />
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {active === 'running' && (
            <Panel
              id="running"
              title="W dzień siłowy sztanga. W pozostałe — trasa."
              body="Wbudowany rejestrator GPS zapisuje trasę, tempo na każdym kilometrze i przewyższenia. Po zakończeniu biegu aktywność trafia na Twój profil Strava."
              points={['Połączenie ze Stravą jednym kliknięciem', 'Split podawany głosem co kilometr', 'Bieg i siłownia w jednym podsumowaniu tygodnia']}
            >
              <Sheet title="Park Leśny — pętla 10 km" meta="wysłano do Strava">
                <dl className="grid grid-cols-3 divide-x divide-night-rule">
                  {[
                    ['Dystans', '10,24 km'],
                    ['Tempo', '4:45 /km'],
                    ['Kalorie', '680 kcal'],
                  ].map(([k, v]) => (
                    <div key={k} className="px-4 py-4 sm:px-5">
                      <dt className="label text-night-ink-2">{k}</dt>
                      <dd className="num mt-1 font-semibold sm:text-lg">{v}</dd>
                    </div>
                  ))}
                </dl>
                <table className="num w-full border-t border-night-rule text-sm">
                  <tbody>
                    {[
                      ['km 1', '4:58', 46],
                      ['km 2', '4:49', 62],
                      ['km 3', '4:41', 78],
                      ['km 4', '4:44', 72],
                      ['km 5', '4:37', 88],
                    ].map(([k, t, w]) => (
                      <tr key={k as string} className="border-t border-night-rule first:border-t-0">
                        <td className="w-16 px-5 py-2.5 text-night-ink-2">{k}</td>
                        <td className="py-2.5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-night-3">
                            <div className={`h-full rounded-full ${k === 'km 5' ? 'bg-volt' : 'bg-night-ink-2'}`} style={{ width: `${w}%` }} />
                          </div>
                        </td>
                        <td className="w-20 px-5 py-2.5 text-right font-semibold">{t}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Sheet>
            </Panel>
          )}

          {active === 'diet' && (
            <Panel
              id="diet"
              title="Forma zaczyna się w kuchni."
              body="Dziennik posiłków z podziałem na białko, węglowodany i tłuszcze. Realizujesz plan od trenera albo prowadzisz własny."
              points={['Skaner kodów kreskowych', 'Dzienne podsumowanie kalorii i makro', 'Plan diety od trenera w tym samym miejscu']}
            >
              <Sheet title="Plan na dziś — 2 750 kcal" meta="zostało 300 kcal">
                <div className="space-y-3 border-b border-night-rule px-5 py-4">
                  {[
                    ['Białko', '185 / 190 g', 97],
                    ['Węglowodany', '270 / 300 g', 90],
                    ['Tłuszcze', '58 / 80 g', 72],
                  ].map(([k, v, p]) => (
                    <div key={k as string}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{k}</span>
                        <span className="num text-night-ink-2">{v}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-night-3">
                        <div className={`h-full rounded-full ${k === 'Białko' ? 'bg-accent' : 'bg-night-ink-2'}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <ul className="divide-y divide-night-rule text-sm">
                  {[
                    ['Śniadanie', 'Owsianka proteinowa z borówkami', '550'],
                    ['Obiad', 'Łosoś, kasza bulgur, warzywa', '720'],
                    ['Przed treningiem', 'Ryż z bananem i izolatem', '470'],
                  ].map(([when, what, kcal]) => (
                    <li key={when} className="flex items-start justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="label text-night-ink-2">{when}</p>
                        <p className="truncate font-medium">{what}</p>
                      </div>
                      <span className="num shrink-0 font-semibold">{kcal} kcal</span>
                    </li>
                  ))}
                </ul>
              </Sheet>
            </Panel>
          )}

          {active === 'checkin' && (
            <Panel
              id="checkin"
              title="Trener widzi każdy trening."
              body="Zamiast wiadomości na Instagramie i zgubionych zdjęć: raz w tygodniu wypełniasz check-in w dwie minuty. Trener widzi wagę, obwody, samopoczucie i zdjęcia — i od razu poprawia plan."
              points={['Zdjęcia sylwetki w prywatnej chmurze', 'Sen, stres i zmęczenie w skali 1–10', 'Czat z powiadomieniami push']}
            >
              <Sheet title="Raport tygodniowy #12" meta="odpowiedź 2 h temu">
                <dl className="grid grid-cols-3 divide-x divide-night-rule">
                  {[
                    ['Waga', '82,4 kg', '−0,6'],
                    ['Talia', '81 cm', '−1'],
                    ['Regeneracja', '9 / 10', ''],
                  ].map(([k, v, d]) => (
                    <div key={k} className="px-4 py-4 sm:px-5">
                      <dt className="label text-night-ink-2">{k}</dt>
                      <dd className="num mt-1 font-semibold">
                        {v} {d && <span className="text-xs font-medium text-volt">{d}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                <blockquote className="border-t border-night-rule px-5 py-4">
                  <p className="label text-night-ink-2">Trener Michał</p>
                  <p className="mt-1.5 leading-relaxed">
                    Dobry progres na ławce. Talia spada zgodnie z planem — od poniedziałku +100 g węglowodanów w dni
                    treningowe.
                  </p>
                </blockquote>
              </Sheet>
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}
