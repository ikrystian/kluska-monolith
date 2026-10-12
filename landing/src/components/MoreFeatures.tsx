const features = [
  { name: 'Grywalizacja', detail: 'Punkty XP, odznaki za rekordy i seria dni treningowych.' },
  { name: 'Wyzwania', detail: 'Rywalizacja ze znajomymi w wyzwaniach na czas.' },
  { name: 'Nawyki', detail: 'Woda, sen, kreatyna — codzienne cele z licznikiem passy.' },
  { name: 'Atlas ćwiczeń', detail: 'Technika wykonania i angażowane partie mięśniowe.' },
  { name: 'Postępy i pomiary', detail: 'Wykresy szacowanego 1RM, waga i obwody w czasie.' },
  { name: 'Kalendarz', detail: 'Zaplanowane treningi i biegi w jednym widoku.' },
  { name: 'Społeczność', detail: 'Tablica z postami, profile i treningi znajomych.' },
  { name: 'Mapa siłowni', detail: 'Siłownie w okolicy, z miejscem na Twoją ulubioną.' },
  { name: 'Strefa wiedzy', detail: 'Artykuły o treningu, regeneracji i odżywianiu.' },
  { name: 'Hype audio', detail: 'Ronnie Coleman jednym dotknięciem przed rekordową serią.' },
];

export function MoreFeatures() {
  return (
    <section aria-labelledby="more-heading" className="py-24 sm:py-32">
      <div className="shell grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div>
          <h2 id="more-heading" className="text-headline font-semibold text-ink">
            I cała reszta, która trzyma Cię w&nbsp;rytmie.
          </h2>
          <p className="mt-5 max-w-[28rem] text-lg leading-relaxed text-ink-2">
            Regularność buduje formę. Te funkcje pilnują, żebyś nie wypadł z planu po dwóch tygodniach.
          </p>
        </div>

        <dl className="grid border-t border-rule sm:grid-cols-2 sm:gap-x-10">
          {features.map((f) => (
            <div key={f.name} className="border-b border-rule py-5">
              <dt className="font-medium text-ink">{f.name}</dt>
              <dd className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{f.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
