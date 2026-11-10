import { Wordmark } from './Wordmark';

const links = [
  ['Panel trenera', 'https://app.leniwakluska.pl'],
  ['Kalkulator talerzy', '#kalkulator'],
  ['Cennik', '#cennik'],
  ['FAQ', '#faq'],
  ['Prywatność', '#'],
  ['Regulamin', '#'],
];

/* One line and a note. Everything else on the page is already one scroll away. */
export function Footer() {
  return (
    <footer className="py-10">
      <div className="shell">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <a href="#" aria-label="Leniwa Kluska — do góry" className="inline-block shrink-0">
            <Wordmark />
          </a>
          <nav aria-label="Stopka" className="flex flex-wrap gap-x-7 gap-y-3 text-[0.9375rem] font-semibold">
            {links.map(([label, href]) => (
              <a key={label} href={href} className="whitespace-nowrap text-ink/85 transition-colors hover:text-accent-ink">
                {label}
              </a>
            ))}
          </nav>
        </div>
        <p className="mt-8 border-t border-rule pt-6 text-sm leading-relaxed text-ink-2">
          © {new Date().getFullYear()} Leniwa Kluska. Trening, bieganie i dieta w jednym dzienniku — zrobione w Polsce. Liczby na ekranach aplikacji
          to dane przykładowe.
        </p>
      </div>
    </footer>
  );
}
