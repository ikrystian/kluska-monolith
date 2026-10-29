const facts = [
  { title: 'Działa offline', detail: 'Serie zapisują się lokalnie i synchronizują po powrocie zasięgu.' },
  { title: 'Synchronizacja ze Stravą', detail: 'Bieg z GPS trafia na Twój profil po kliknięciu „Zakończ”.' },
  { title: 'Android i PWA', detail: 'Natywna aplikacja na Androida, na iPhonie z ekranu początkowego.' },
  { title: 'Skaner kodów kreskowych', detail: 'Produkty i makro z bazy Open Food Facts w kilka sekund.' },
];

export function StatsStrip() {
  return (
    <section aria-label="Najważniejsze cechy" className="border-y border-rule bg-paper-2">
      <div className="shell">
        <ul className="grid gap-px bg-rule min-[480px]:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <li
              key={fact.title}
              className="bg-paper-2 py-7 min-[480px]:px-6 min-[480px]:odd:pl-0 lg:py-9 lg:odd:pl-6 lg:first:pl-0"
            >
              <p className="font-medium text-ink">{fact.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{fact.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
