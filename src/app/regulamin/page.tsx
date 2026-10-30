import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BASE_OPEN_GRAPH } from '@/lib/site-metadata';

export const metadata = {
  title: 'Regulamin | Kluska',
  description: 'Regulamin korzystania z aplikacji Kluska',
  openGraph: { ...BASE_OPEN_GRAPH, url: '/regulamin', title: 'Regulamin | Kluska', description: 'Regulamin korzystania z aplikacji Kluska' },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 sm:p-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-primary hover:text-primary/80 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Powrót do strony głównej
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Regulamin</h1>

        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">1. Postanowienia ogólne</h2>
            <p>
              Niniejszy Regulamin określa zasady korzystania z aplikacji #leniwakluska (dalej: „Serwis”), dostępnej w przeglądarce oraz jako aplikacja mobilna.
            </p>
            <p className="mt-2">
              Usługodawcą świadczącym usługi drogą elektroniczną w ramach Serwisu jest operator platformy (dalej: „Usługodawca”).
            </p>
            <p className="mt-2">
              Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu oraz Polityki Prywatności.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">2. Definicje</h2>
            <p>
              W Regulaminie użyto następujących pojęć:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Użytkownik — osoba fizyczna korzystająca z Serwisu, w szczególności Sportowiec lub Trener,</li>
              <li>Konto — zbiór zasobów i ustawień przypisanych do Użytkownika, chroniony adresem e-mail i hasłem,</li>
              <li>Tryb gościa — korzystanie z Serwisu bez rejestracji, z danymi powiązanymi z urządzeniem.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">3. Rejestracja i aktywacja Konta</h2>
            <p>
              Założenie Konta jest bezpłatne i wymaga podania imienia, adresu e-mail, hasła oraz akceptacji Regulaminu.
            </p>
            <p className="mt-2">
              Po rejestracji na podany adres e-mail wysyłany jest link aktywacyjny. Zalogowanie się do Konta jest możliwe dopiero po jego aktywacji.
            </p>
            <p className="mt-2">
              Użytkownik zobowiązuje się podawać prawdziwe dane oraz nie udostępniać hasła osobom trzecim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">4. Zasady korzystania z Serwisu</h2>
            <p>
              Użytkownik zobowiązuje się korzystać z Serwisu zgodnie z prawem, dobrymi obyczajami i niniejszym Regulaminem. Zabronione jest w szczególności:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>zamieszczanie treści bezprawnych, obraźliwych lub naruszających prawa osób trzecich,</li>
              <li>podejmowanie działań zakłócających działanie Serwisu,</li>
              <li>korzystanie z Kont innych Użytkowników bez ich zgody.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">5. Charakter treści treningowych i dietetycznych</h2>
            <p>
              Plany treningowe, dietetyczne oraz inne treści dostępne w Serwisie mają charakter informacyjny i nie stanowią porady medycznej. Przed rozpoczęciem intensywnej aktywności fizycznej lub zmianą diety zalecana jest konsultacja z lekarzem.
            </p>
            <p className="mt-2">
              Użytkownik korzysta z planów i wskazówek na własną odpowiedzialność, dostosowując je do swojego stanu zdrowia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">6. Odpowiedzialność</h2>
            <p>
              Usługodawca dokłada starań, aby Serwis działał nieprzerwanie i prawidłowo, jednak nie gwarantuje jego ciągłej dostępności. Usługodawca nie odpowiada za treści zamieszczane przez Użytkowników, w tym przez Trenerów.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">7. Reklamacje</h2>
            <p>
              Reklamacje dotyczące działania Serwisu można zgłaszać drogą elektroniczną. Reklamacja zostanie rozpatrzona w terminie 14 dni od jej otrzymania.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">8. Usunięcie Konta</h2>
            <p>
              Użytkownik może w każdej chwili zrezygnować z korzystania z Serwisu i zażądać usunięcia Konta. Usługodawca może zablokować lub usunąć Konto Użytkownika rażąco naruszającego Regulamin.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">9. Dane osobowe</h2>
            <p>
              Zasady przetwarzania danych osobowych określa{' '}
              <Link href="/polityka-prywatnosci" className="text-primary underline-offset-4 hover:underline">
                Polityka Prywatności
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">10. Postanowienia końcowe</h2>
            <p>
              Usługodawca zastrzega sobie prawo do zmiany Regulaminu. O istotnych zmianach Użytkownicy zostaną poinformowani z wyprzedzeniem. W sprawach nieuregulowanych zastosowanie mają przepisy prawa polskiego.
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            Wersja regulaminu: 30.10.2026
          </p>
        </div>
      </div>
    </div>
  );
}
