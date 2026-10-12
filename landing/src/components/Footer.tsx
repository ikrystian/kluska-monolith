import { Wordmark } from './Wordmark';

const links = [
  ['Korzyści', '#korzysci'],
  ['Jak to działa', '#funkcje'],
  ['Kalkulator talerzy', '#kalkulator'],
  ['Dla trenerów', '#trenerzy'],
  ['FAQ', '#faq'],
  ['Zaloguj się', '/athlete/login'],
];

export function Footer() {
  return (
    <footer className="pb-8 pt-16 sm:pt-20">
      <div className="shell">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <a href="#" aria-label="Leniwa Kluska — do góry">
              <Wordmark size="lg" />
            </a>
            <p className="mt-5 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink-2">
              Trening, bieganie i dieta w jednym dzienniku. Zrobione w Polsce.
            </p>
          </div>
          <nav aria-label="Stopka">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-[0.9375rem]">
              {links.map(([l, href]) => (
                <li key={href}>
                  <a href={href} className="whitespace-nowrap text-ink-2 transition-colors hover:text-ink">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-rule pt-6 text-sm text-ink-2 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Leniwa Kluska</p>
          <p className="flex gap-6">
            <a href="#" className="transition-colors hover:text-ink">
              Prywatność
            </a>
            <a href="#" className="transition-colors hover:text-ink">
              Regulamin
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
