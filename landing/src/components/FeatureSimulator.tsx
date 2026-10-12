import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { reveal } from '../lib/reveal';

type TabId = 'workout' | 'running' | 'diet' | 'checkin';

const tabs: { id: TabId; name: string; blurb: string }[] = [
  { id: 'workout', name: 'Dziennik treningowy', blurb: 'Serie, RPE, przerwy, tonaż' },
  { id: 'running', name: 'Bieganie i GPS', blurb: 'Trasa, splity, eksport do Stravy' },
  { id: 'diet', name: 'Dieta i makro', blurb: 'Posiłki, kalorie, B / W / T' },
  { id: 'checkin', name: 'Check-in z trenerem', blurb: 'Raport tygodniowy i czat' },
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

/* a quiet data surface — the app's UI, not a fake device */
function Sheet({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-ui)] border border-rule-strong bg-paper-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-5 py-4">
        <h4 className="font-semibold">{title}</h4>
        {meta && <span className="label text-ink-2">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function Points({ items }: { items: [string, string][] }) {
  return (
    <ul className="mt-7 divide-y divide-rule border-y border-rule">
      {items.map(([t, d]) => (
        <li key={t} className="grid gap-1 py-3.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5">
          <span className="font-semibold">{t}</span>
          <span className="text-ink-2">{d}</span>
        </li>
      ))}
    </ul>
  );
}

export function FeatureSimulator() {
  const [active, setActive] = useState<TabId>('workout');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRestTimer();

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="funkcje" aria-labelledby="modules-title" className="py-20 sm:py-28">
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
          <h2 {...reveal(0)} id="modules-title" className="display text-[clamp(2.5rem,6vw,4.75rem)] lg:col-span-7">
            Cztery aplikacje zastąpione jedną.
          </h2>
          <p {...reveal(1)} className="max-w-xl self-end text-lg leading-relaxed text-ink-2 lg:col-span-5">
            Notatnik na siłownię, zegarek do biegania, licznik kalorii i WhatsApp z trenerem. Tutaj to
            jeden dziennik — a dane z każdego modułu widać w pozostałych.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div {...reveal(0)} role="tablist" aria-label="Moduły aplikacji" aria-orientation="vertical" className="grid grid-cols-2 gap-px self-start border border-rule-strong bg-rule-strong lg:col-span-4 lg:grid-cols-1">
            {tabs.map((t, i) => {
              const on = active === t.id;
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
                  className={`group relative flex flex-col items-start gap-1 px-4 py-4 text-left transition-colors sm:px-5 sm:py-5 ${
                    on ? 'bg-paper-3 shadow-[inset_3px_0_0_var(--color-accent)]' : 'bg-paper hover:bg-paper-2'
                  }`}
                >
                  <span className={`label ${on ? 'text-accent' : 'text-ink-2'}`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="display text-[1.375rem] sm:text-[1.75rem]">{t.name}</span>
                  <span className={`hidden text-sm sm:block ${'text-ink-2'}`}>{t.blurb}</span>
                </button>
              );
            })}
          </div>

          <div {...reveal(1)} className="lg:col-span-8">
            {active === 'workout' && (
              <div role="tabpanel" id="panel-workout" aria-labelledby="tab-workout" className="grid gap-10 xl:grid-cols-2">
                <div>
                  <h3 className="display text-4xl sm:text-5xl">Zapisujesz serię, zanim odpoczniesz.</h3>
                  <p className="mt-5 leading-relaxed text-ink-2">
                    Aplikacja pamięta poprzednie ciężary, sugeruje progresję, liczy tonaż i RPE, a po każdej
                    serii sama odpala przerwę.
                  </p>
                  <Points
                    items={[
                      ['Poprzedni wynik', 'Widzisz, ile zrobiłeś tydzień temu — i co trzeba pobić.'],
                      ['Kalkulator talerzy', '112,5 kg? Gryf 20 + 2 × 20 + 5 + 1,25 na stronę.'],
                      ['Ekran nie gaśnie', 'Wake-lock w trakcie ćwiczenia. Bez odblokowywania spoconą ręką.'],
                    ]}
                  />
                </div>

                <div className="space-y-4">
                  <Sheet title="Przysiad ze sztangą (high bar)" meta="Ćwiczenie 1 z 5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="label text-left text-ink-2">
                          <th className="px-5 py-2.5 font-normal">Seria</th>
                          <th className="py-2.5 font-normal">Ciężar</th>
                          <th className="py-2.5 font-normal">Powt.</th>
                          <th className="px-5 py-2.5 text-right font-normal">RPE</th>
                        </tr>
                      </thead>
                      <tbody className="num">
                        {[
                          ['1', '120 kg', '6', '7.5', false],
                          ['2', '130 kg', '5', '8.0', false],
                          ['3', '140 kg', '5', '9.0', true],
                        ].map(([s, w, r, rpe, pr]) => (
                          <tr key={s as string} className="border-t border-rule">
                            <td className="px-5 py-3">
                              {s}
                              {pr && <span className="ml-2 rounded-[2px] bg-accent px-1.5 py-0.5 text-[0.6875rem] font-semibold text-on-accent">PR</span>}
                            </td>
                            <td className={`py-3 font-semibold ${pr ? 'text-accent-ink' : ''}`}>{w}</td>
                            <td className="py-3">{r}</td>
                            <td className="px-5 py-3 text-right text-ink-2">{rpe}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex flex-wrap justify-between gap-2 border-t border-rule px-5 py-3 text-sm">
                      <span className="text-ink-2">
                        Objętość <span className="num font-semibold text-ink">2 070 kg</span>
                      </span>
                      <span className="num text-ink-2">poprz. 135 kg × 5</span>
                    </div>
                  </Sheet>

                  <div className="flex items-center justify-between gap-4 rounded-[var(--radius-ui)] border border-rule-strong bg-paper-3 px-5 py-4">
                    <div>
                      <p className="label text-ink-2">Przerwa — wypróbuj</p>
                      <p className="num text-4xl font-medium tracking-tight" aria-live="polite" aria-atomic>
                        {timer.label}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={timer.toggle}
                        aria-label={timer.running ? 'Zatrzymaj stoper' : 'Uruchom stoper'}
                        className="grid size-12 place-items-center rounded-[var(--radius-ui)] bg-accent text-on-accent transition-colors hover:bg-accent-hover"
                      >
                        {timer.running ? <Pause className="size-5" /> : <Play className="size-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={timer.reset}
                        aria-label="Resetuj stoper"
                        className="grid size-12 place-items-center rounded-[var(--radius-ui)] border border-rule-strong transition-colors hover:border-ink"
                      >
                        <RotateCcw className="size-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {active === 'running' && (
              <div role="tabpanel" id="panel-running" aria-labelledby="tab-running" className="grid gap-10 xl:grid-cols-2">
                <div>
                  <h3 className="display text-4xl sm:text-5xl">Nie tylko siłownia.</h3>
                  <p className="mt-5 leading-relaxed text-ink-2">
                    Wbudowany rejestrator GPS zapisuje trasę, tempo na każdym kilometrze, przewyższenia i tętno.
                    Po zakończeniu biegu aktywność trafia na Twój profil Strava.
                  </p>
                  <Points
                    items={[
                      ['Strava', 'Połączenie jednym kliknięciem, eksport automatyczny.'],
                      ['Komunikaty głosowe', 'Split podawany co kilometr, bez patrzenia w telefon.'],
                    ]}
                  />
                </div>
                <Sheet title="Park Leśny — pętla 10 km" meta="wysłano do Strava">
                  <dl className="grid grid-cols-3 divide-x divide-rule">
                    {[
                      ['Dystans', '10,24 km'],
                      ['Tempo', '4:45 /km'],
                      ['Kalorie', '680 kcal'],
                    ].map(([k, v]) => (
                      <div key={k} className="px-5 py-4">
                        <dt className="label text-ink-2">{k}</dt>
                        <dd className="num mt-1 text-lg font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <table className="w-full border-t border-rule text-sm num">
                    <tbody>
                      {[
                        ['km 1', '4:58', 46],
                        ['km 2', '4:49', 62],
                        ['km 3', '4:41', 78],
                        ['km 4', '4:44', 72],
                        ['km 5', '4:37', 88],
                      ].map(([k, t, w]) => (
                        <tr key={k as string} className="border-t border-rule first:border-t-0">
                          <td className="w-16 px-5 py-2.5 text-ink-2">{k}</td>
                          <td className="py-2.5">
                            <div className="h-1.5 bg-rule">
                              <div className="h-full bg-ink-2" style={{ width: `${w}%` }} />
                            </div>
                          </td>
                          <td className="w-20 px-5 py-2.5 text-right font-semibold">{t}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Sheet>
              </div>
            )}

            {active === 'diet' && (
              <div role="tabpanel" id="panel-diet" aria-labelledby="tab-diet" className="grid gap-10 xl:grid-cols-2">
                <div>
                  <h3 className="display text-4xl sm:text-5xl">Forma zaczyna się w kuchni.</h3>
                  <p className="mt-5 leading-relaxed text-ink-2">
                    Dziennik posiłków z podziałem na białko, węglowodany i tłuszcze. Realizujesz plan od trenera
                    albo prowadzisz własny — z dziennym podsumowaniem i skanerem kodów kreskowych.
                  </p>
                  <div className="mt-7 space-y-4">
                    {[
                      ['Białko', '185 / 190 g', 97],
                      ['Węglowodany', '270 / 300 g', 90],
                      ['Tłuszcze', '58 / 80 g', 72],
                    ].map(([k, v, p]) => (
                      <div key={k as string}>
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold">{k}</span>
                          <span className="num text-ink-2">{v}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 bg-rule">
                          <div className={`h-full ${k === 'Białko' ? 'bg-accent' : 'bg-ink-2'}`} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Sheet title="Plan na dziś — 2 750 kcal" meta="zostało 300 kcal">
                  <ul className="divide-y divide-rule text-sm">
                    {[
                      ['Śniadanie', 'Owsianka proteinowa z borówkami', 'B 42 · W 65 · T 14', '550'],
                      ['Obiad', 'Łosoś, kasza bulgur, warzywa', 'B 52 · W 80 · T 22', '720'],
                      ['Przed treningiem', 'Ryż z bananem i izolatem', 'B 38 · W 70 · T 4', '470'],
                    ].map(([when, what, macro, kcal]) => (
                      <li key={when} className="flex items-start justify-between gap-4 px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="label text-ink-2">{when}</p>
                          <p className="font-semibold">{what}</p>
                          <p className="num text-xs text-ink-2">{macro}</p>
                        </div>
                        <span className="num shrink-0 font-semibold">{kcal} kcal</span>
                      </li>
                    ))}
                  </ul>
                </Sheet>
              </div>
            )}

            {active === 'checkin' && (
              <div role="tabpanel" id="panel-checkin" aria-labelledby="tab-checkin" className="grid gap-10 xl:grid-cols-2">
                <div id="trenerzy">
                  <h3 className="display text-4xl sm:text-5xl">Trener widzi każdy trening.</h3>
                  <p className="mt-5 leading-relaxed text-ink-2">
                    Zamiast wiadomości na Instagramie i zgubionych zdjęć: raz w tygodniu wypełniasz check-in w dwie
                    minuty. Trener widzi wagę, obwody, samopoczucie i zdjęcia sylwetki — i od razu poprawia plan.
                  </p>
                  <Points
                    items={[
                      ['Zdjęcia sylwetki', 'Przód, bok, tył — w prywatnej chmurze.'],
                      ['Regeneracja', 'Sen, stres i zmęczenie w skali 1–10.'],
                      ['Czat', 'Wiadomości z powiadomieniami push.'],
                    ]}
                  />
                </div>
                <Sheet title="Raport tygodniowy #12" meta="odpowiedź 2 h temu">
                  <dl className="grid grid-cols-3 divide-x divide-rule">
                    {[
                      ['Waga', '82,4 kg', '−0,6'],
                      ['Talia', '81 cm', '−1'],
                      ['Regeneracja', '9 / 10', ''],
                    ].map(([k, v, d]) => (
                      <div key={k} className="px-4 py-4 sm:px-5">
                        <dt className="label text-ink-2">{k}</dt>
                        <dd className="num mt-1 font-semibold">
                          {v} {d && <span className="text-xs font-normal text-accent-ink">{d}</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <blockquote className="border-t border-rule px-5 py-4">
                    <p className="label text-ink-2">Trener Michał</p>
                    <p className="mt-1.5 leading-relaxed">
                      Dobry progres na ławce. Talia spada zgodnie z planem — od poniedziałku +100 g węglowodanów w dni
                      treningowe.
                    </p>
                  </blockquote>
                </Sheet>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
