import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section aria-labelledby="cta-title" className="px-3 pb-3 pt-4 sm:px-4 sm:pb-4">
      <div className="relative isolate mx-auto max-w-[90rem] overflow-hidden rounded-[var(--radius-card)] bg-paper-2">
        <img
          src="/images/barbell-140kg.webp"
          alt=""
          width={2400}
          height={1100}
          loading="lazy"
          className="absolute inset-0 -z-10 size-full object-cover opacity-50 [mask-image:linear-gradient(to_top,black_10%,transparent_85%)]"
        />
        <div className="shell py-24 sm:py-32 lg:py-40">
          <h2 id="cta-title" className="display max-w-[14ch] text-[clamp(2.75rem,7vw,5.5rem)]">
            Koniec z&nbsp;byciem leniwą kluską.
          </h2>
          <p className="lede mt-6 max-w-xl">
            Wybierz szablon, zapisz pierwszą serię i za tydzień zobacz, o ile ją pobiłeś. Za darmo, w całości — w
            przeglądarce od razu, a na Androidzie także jako aplikacja.
          </p>
          <div className="mt-10 flex flex-col gap-3 min-[420px]:flex-row">
            <a href="/athlete/dashboard" className="btn btn-primary btn-lg">
              Zacznij za darmo
              <ArrowRight className="nudge size-4" aria-hidden />
            </a>
            <a href="/athlete/login" className="btn btn-ghost btn-lg">
              Mam już konto
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
