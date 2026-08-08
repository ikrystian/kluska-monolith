import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Polityka Prywatności | Kluska',
  description: 'Polityka prywatności aplikacji Kluska',
};

export default function PrivacyPolicyPage() {
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
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Polityka Prywatności</h1>
        
        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">1. Informacje ogólne</h2>
            <p>
              Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych przekazanych przez Użytkowników w związku z korzystaniem przez nich z serwisu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">2. Administrator Danych</h2>
            <p>
              Administratorem danych osobowych zawartych w serwisie jest operator platformy. W sprawach związanych z danymi osobowymi można kontaktować się poprzez formularz kontaktowy dostępny w serwisie.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">3. Zbieranie danych</h2>
            <p>
              Serwis zbiera informacje dobrowolnie podane przez użytkownika podczas rejestracji, edycji profilu, czy korzystania z funkcji aplikacji. Mogą one obejmować m.in.: imię i nazwisko, adres e-mail, wizerunek (zdjęcie profilowe) oraz inne dane podane w ramach profilu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">4. Cel przetwarzania danych</h2>
            <p>
              Dane osobowe przetwarzane są w celu:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>świadczenia usług drogą elektroniczną,</li>
              <li>zakładania i zarządzania kontem Użytkownika,</li>
              <li>kontaktowania się z Użytkownikiem,</li>
              <li>zapewnienia bezpieczeństwa i prawidłowego funkcjonowania serwisu.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">5. Pliki Cookies (Ciasteczka)</h2>
            <p>
              Serwis korzysta z plików cookies. Są to pliki tekstowe zapisywane na urządzeniu końcowym Użytkownika, używane w celu ułatwienia korzystania z serwisu, utrzymania sesji po zalogowaniu oraz w celach statystycznych.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">6. Prawa Użytkownika</h2>
            <p>
              Użytkownik ma prawo do:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>dostępu do swoich danych,</li>
              <li>ich sprostowania lub usunięcia,</li>
              <li>ograniczenia przetwarzania,</li>
              <li>przenoszenia danych,</li>
              <li>wniesienia sprzeciwu wobec przetwarzania.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">7. Zmiany w Polityce Prywatności</h2>
            <p>
              Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności. O wszelkich zmianach Użytkownicy zostaną poinformowani.
            </p>
          </section>
          
          <p className="text-sm text-gray-500 mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
          </p>
        </div>
      </div>
    </div>
  );
}
