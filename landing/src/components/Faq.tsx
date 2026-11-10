import { Plus } from 'lucide-react';

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
    <section id="faq" aria-labelledby="faq-title" className="section">
      <div className="shell grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
          <h2 id="faq-title" className="h-section">
            Pytania przed pierwszym treningiem.
          </h2>
          <p className="mt-5 text-ink-2">Czegoś brakuje? Zaloguj się i napisz do nas z poziomu aplikacji.</p>
        </div>

        <div className="border-t border-rule-strong">
          {faqs.map((f, i) => (
            <details key={f.q} open={i === 0} className="group border-b border-rule">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 transition-colors hover:text-accent-ink [&::-webkit-details-marker]:hidden">
                <span className="font-display text-[1.625rem] font-bold uppercase leading-[1.05] sm:text-[2rem]">{f.q}</span>
                <Plus
                  className="size-6 shrink-0 text-ink-2 transition-transform duration-300 ease-[var(--ease-out)] group-open:rotate-45 group-open:text-accent"
                  strokeWidth={2.5}
                  aria-hidden
                />
              </summary>
              <p className="max-w-2xl pb-7 leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
