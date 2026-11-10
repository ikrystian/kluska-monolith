import { useReadProgress } from '../lib/motion';

/* What the page believes, set as a poster on a full ember field. The visitor reads it by
   scrolling: each word comes up to full ink as it passes. */
const sentences = [
  'W styczniu siłownia pęka w szwach.',
  'W lutym znów jest gdzie odłożyć sztangę.',
  'Motywacja zawsze się kończy — zostaje to, co zapisane.',
  'Kto widzi, ile podniósł tydzień temu, wraca, żeby to pobić.',
];

const words = sentences.flatMap((s, si) => s.split(' ').map((w, wi) => ({ w, key: `${si}-${wi}` })));

export function Manifesto() {
  const [ref, lit] = useReadProgress<HTMLParagraphElement>(words.length);

  return (
    <section aria-label="Dlaczego postanowienia nie dożywają lutego" className="on-ember grain">
      <div className="shell py-20 sm:py-28 lg:py-36">
        <p ref={ref} className="display text-[clamp(2.125rem,6.6vw,5.75rem)] !leading-[0.98]">
          {words.map(({ w, key }, n) => (
            <span key={key} className={`mw ${n < lit ? 'on' : ''}`}>
              {w}{' '}
            </span>
          ))}
        </p>
        <p className="mt-10 max-w-[34rem] text-lg font-medium leading-relaxed sm:mt-14 sm:text-xl">
          Leniwa Kluska to dziennik, który pamięta za Ciebie: każdą serię, każdy kilometr i każdy posiłek. Ty masz tylko przyjść.
        </p>
      </div>
    </section>
  );
}
