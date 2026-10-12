import { Plus } from 'lucide-react';
import { reveal } from '../lib/reveal';

const faqs = [
  {
    q: 'Ile to kosztuje?',
    a: 'Nic. Dziennik treningowy, bieganie ze Stravą, dieta, kalkulator talerzy i współpraca z trenerem są w pełni darmowe — bez subskrypcji, bez wersji premium i bez podawania karty.',
  },
  {
    q: 'Działa na iPhonie i Androidzie?',
    a: 'Tak. Na iOS otwierasz aplikację w Safari i wybierasz „Dodaj do ekranu początkowego” — działa pełnoekranowo, bez pasków przeglądarki. Na Androidzie tak samo albo jako natywna aplikacja.',
  },
  {
    q: 'Naprawdę działa bez internetu?',
    a: 'Tak. Plany, ćwiczenia, stoper i kalkulator talerzy są zapisane na telefonie. Serie zapisujesz lokalnie, a dane synchronizują się z chmurą, gdy wrócisz do zasięgu albo Wi-Fi.',
  },
  {
    q: 'Jak działa synchronizacja ze Stravą?',
    a: 'Łączysz konto Strava w ustawieniach profilu jednym kliknięciem. Po „Zakończ bieg” aktywność z mapą, tempem, kadencją i przewyższeniami trafia na Twój profil automatycznie.',
  },
  {
    q: 'Mogę korzystać sam, bez trenera?',
    a: 'Jak najbardziej. Tworzysz własne plany (PPL, FBW i inne) albo bierzesz gotowe szablony, śledzisz 1RM i kalorie. Jeśli kiedyś zaczniesz współpracę z trenerem, wystarczy wpisać jego kod.',
  },
  {
    q: 'Jak wygląda check-in z trenerem?',
    a: 'Raz w tygodniu podajesz wagę i obwody, dodajesz zdjęcia sylwetki i oceniasz regenerację. Trener dostaje powiadomienie, przegląda raport i od razu koryguje plan.',
  },
  {
    q: 'Skąd w aplikacji Ronnie Coleman?',
    a: 'To nasz easter egg. Przed ciężką serią dotykasz ikony w stoperze i słyszysz „Lightweight baby!” albo „Ain’t nothin’ but a peanut!”.',
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="section bg-paper-2">
      <div className="shell grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <div {...reveal(0)} className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="faq-title" className="h-section">
            Pytania przed pierwszym treningiem.
          </h2>
          <p className="mt-5 text-ink-2">Czegoś brakuje? Zaloguj się i napisz do nas z poziomu aplikacji.</p>
        </div>

        <div className="space-y-2.5">
          {faqs.map((f, i) => (
            <details
              {...reveal(Math.min(i, 4))}
              key={f.q}
              open={i === 0}
              className="group rounded-[20px] border border-rule bg-card transition-colors open:border-rule-strong"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-[20px] px-5 py-5 sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="text-[1.0625rem] font-semibold">{f.q}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper-2 transition-colors group-open:bg-ink group-open:text-paper">
                  <Plus
                    className="size-4 transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-45"
                    aria-hidden
                  />
                </span>
              </summary>
              <p className="max-w-2xl px-5 pb-6 leading-relaxed text-ink-2 sm:px-6">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
