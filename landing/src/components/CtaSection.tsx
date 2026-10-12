import { ArrowRight } from 'lucide-react';
import { reveal } from '../lib/reveal';

export function CtaSection() {
  return (
    <section aria-labelledby="cta-title" className="on-night bg-night text-night-ink">
      <div className="shell py-20 sm:py-28">
        <h2 {...reveal(0)} id="cta-title" className="display max-w-[14ch] text-[clamp(3rem,9vw,7.5rem)]">
          Zamień wymówki na powtórzenia.
        </h2>
        <div {...reveal(1)} className="mt-10 flex flex-col gap-6 border-t border-night-rule pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-lg text-night-ink-2">
            Za darmo, w całości. Działa w przeglądarce od razu — bez pobierania, a na Androidzie także jako aplikacja.
          </p>
          <a href="/athlete/dashboard" className="btn btn-primary self-start sm:self-auto">
            Otwórz aplikację
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
