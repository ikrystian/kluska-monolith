import { ArrowRight } from 'lucide-react';
import { reveal } from '../lib/reveal';

export function CtaSection() {
  return (
    <section aria-labelledby="cta-title" className="px-3 py-3 sm:px-4 sm:py-4">
      <div className="stage on-night relative isolate mx-auto max-w-[90rem] overflow-hidden">
        <img
          src="/images/barbell-140kg.webp"
          alt=""
          width={2400}
          height={1100}
          loading="lazy"
          className="absolute inset-0 -z-10 size-full object-cover opacity-55 [mask-image:linear-gradient(to_top,black_10%,transparent_80%)]"
        />
        <div className="shell flex flex-col items-center py-24 text-center sm:py-32">
          <h2 {...reveal(0)} id="cta-title" className="display max-w-[16ch] text-[clamp(2.75rem,7vw,5.5rem)]">
            Koniec z&nbsp;byciem leniwą kluską.
          </h2>
          <p {...reveal(1)} className="lede mt-6 max-w-xl !text-night-ink-2">
            Za darmo, w całości. Działa w przeglądarce od razu — bez pobierania, a na Androidzie także jako aplikacja.
          </p>
          <div {...reveal(2)} className="mt-10 flex flex-col gap-3 min-[420px]:flex-row">
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
