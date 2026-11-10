import { Fragment } from 'react';
import { Wordmark } from './Wordmark';

const links = [
  ['Trening', '#trening'],
  ['Kalkulator talerzy', '#kalkulator'],
  ['Bieganie', '#bieganie'],
  ['Jedzenie', '#dieta'],
  ['Nawyki', '#nawyki'],
  ['Panel trenera', '/login'],
  ['Mam kod od trenera', '/athlete/login'],
  ['Cennik', '#cennik'],
  ['FAQ', '#faq'],
  ['Zaloguj się', '/athlete/login'],
  ['Zacznij za darmo', '/athlete/dashboard'],
];

/* A colophon instead of link columns: one dense line of everything on the page. */
export function Footer() {
  return (
    <footer className="pb-8 pt-14 sm:pt-20">
      <div className="shell">
        <a href="#" aria-label="Leniwa Kluska — do góry" className="inline-block">
          <Wordmark size="lg" />
        </a>

        <p className="mt-6 max-w-[62rem] text-[0.9375rem] leading-[2.1] text-ink-2">
          Trening, bieganie i dieta w jednym dzienniku. Zrobione w Polsce.{' '}
          <span className="max-sm:block max-sm:pt-3">
            {links.map(([label, href], i) => (
              <Fragment key={label}>
                <span className="whitespace-nowrap">
                  <a href={href} className="font-semibold text-ink transition-colors hover:text-accent-ink">
                    {label}
                  </a>
                  {i < links.length - 1 && (
                    <span aria-hidden className="mx-2.5 text-rule-strong">
                      /
                    </span>
                  )}
                </span>{' '}
              </Fragment>
            ))}
          </span>
        </p>

        <div className="mt-10 flex flex-col gap-3 border-t border-rule pt-6 text-sm text-ink-2 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Leniwa Kluska · liczby na ekranach aplikacji to dane przykładowe</p>
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
