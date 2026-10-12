/* Paragraph on the left, three big numbers on the right — the reference's stats block.
   Only facts the product already states about itself; no user counts or usage totals. */
const facts = [
  { value: '250+', caption: 'ćwiczeń z opisem techniki i zaangażowanymi mięśniami' },
  { value: '4 → 1', caption: 'dziennik, bieganie, dieta i kontakt z trenerem w jednej aplikacji' },
  { value: '0 zł', caption: 'za całość — bez subskrypcji, wersji premium i podawania karty' },
];

export function Facts() {
  return (
    <section aria-labelledby="facts-title" className="section">
      <div className="shell grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-24">
        <div>
          <h2 id="facts-title" className="h-section max-w-[14ch]">
            Zbudowana na prawdziwą siłownię.
          </h2>
          <p className="lede mt-6 max-w-lg">
            Grube ściany, spocone ręce i ciężka seria za minutę. Dziennik, bieganie, dieta i kontakt z trenerem działają w
            jednym miejscu — także wtedy, gdy telefon nie łapie zasięgu.
          </p>
        </div>

        <dl className="divide-y divide-rule border-y border-rule">
          {facts.map((f) => (
            <div key={f.value} className="flex flex-col-reverse gap-1 py-6 sm:py-7">
              <dt className="max-w-xs text-[0.9375rem] leading-snug text-ink-2">{f.caption}</dt>
              <dd className="display num text-[clamp(2.75rem,5.4vw,4.5rem)]">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
