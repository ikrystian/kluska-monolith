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
    <section id="faq" aria-labelledby="faq-title" className="border-t border-rule py-20 sm:py-28">
      <div className="shell grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div {...reveal(0)} className="lg:col-span-4">
          <h2 id="faq-title" className="display text-[clamp(2.5rem,5vw,4rem)]">
            Pytania przed pierwszym treningiem.
          </h2>
          <p className="mt-5 text-ink-2">
            Czegoś brakuje? Zaloguj się i napisz do nas z poziomu aplikacji.
          </p>
        </div>

        <div className="border-t-2 border-ink lg:col-span-8">
          {faqs.map((f, i) => (
            <details {...reveal(Math.min(i, 4))} key={f.q} open={i === 0} className="group border-b border-rule">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                <span className="text-lg font-semibold sm:text-xl">{f.q}</span>
                <Plus
                  className="mt-1 size-5 shrink-0 text-ink-2 transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-45 group-open:text-accent-ink"
                  aria-hidden
                />
              </summary>
              <p className="max-w-2xl pb-6 leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
