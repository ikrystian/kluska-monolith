import { ArrowRight } from 'lucide-react';
import { reveal } from '../lib/reveal';

export function CtaSection() {
  return (
    <section aria-labelledby="cta-title" className="px-3 pb-3 pt-4 sm:px-4 sm:pb-4">
      <div className="relative isolate mx-auto max-w-[90rem] overflow-hidden rounded-[var(--radius-card)] bg-shade">
        <img
          src="/images/deadlift-dark.webp"
          alt=""
          width={2400}
          height={1600}
          loading="lazy"
          className="absolute inset-0 -z-10 size-full object-cover object-[50%_30%] opacity-80 [mask-image:linear-gradient(to_top,black_25%,transparent_95%)]"
        />
        <div className="shell pb-12 pt-24 sm:pb-16 sm:pt-36 lg:pt-48">
          <h2 {...reveal(0)} id="cta-title" className="display max-w-[12ch] text-[clamp(3.25rem,10vw,8.5rem)]">
            Koniec z&nbsp;byciem leniwą kluską.
          </h2>
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <p {...reveal(1)} className="lede max-w-xl !text-ink">
              Wybierz szablon, zapisz pierwszą serię i za tydzień zobacz, o ile ją pobiłeś. Za darmo, w całości — w
              przeglądarce od razu, a na Androidzie także jako aplikacja.
            </p>
            <div {...reveal(2)} className="flex flex-col gap-2.5 min-[420px]:flex-row">
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
      </div>
    </section>
  );
}
