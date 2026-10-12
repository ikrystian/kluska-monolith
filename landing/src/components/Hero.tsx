import { ArrowDown, ArrowRight } from 'lucide-react';
import { reveal } from '../lib/reveal';

const facts = [
  { k: 'Bez zasięgu', v: 'Działa offline, synchronizuje po powrocie do sieci' },
  { k: 'Strava', v: 'Każdy bieg z GPS trafia na Twój profil' },
  { k: 'Platformy', v: 'PWA na iOS, aplikacja na Androida' },
  { k: 'Cena', v: 'Za darmo — wszystkie funkcje, bez subskrypcji' },
];

export function Hero() {
  return (
    <section aria-labelledby="hero-title">
      <div className="shell pt-12 pb-10 sm:pt-16 lg:pt-20 lg:pb-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-8">
            <h1 {...reveal(0)} id="hero-title" className="display text-[clamp(3.25rem,10.5vw,8.75rem)]">
              Koniec z{'\u00a0'}byciem leniwą kluską.
            </h1>
            <p {...reveal(1)} className="mt-7 max-w-[38rem] text-lg leading-relaxed text-ink-2 sm:text-xl">
              Jeden dziennik na siłownię, bieganie i dietę. Zapisujesz serie w trakcie treningu,
              biegasz z GPS, liczysz makro — a jeśli masz trenera, widzi to wszystko w swoim panelu.
            </p>
            <div {...reveal(2)} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="/athlete/dashboard" className="btn btn-primary">
                Zacznij trening za darmo
                <ArrowRight className="size-4" aria-hidden />
              </a>
              <a href="#funkcje" className="btn btn-ghost">
                Zobacz, jak to działa
              </a>
            </div>
          </div>

          <dl {...reveal(3)} className="self-end border-t-2 border-ink lg:col-span-4">
            {facts.map((f) => (
              <div key={f.k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 border-b border-rule py-3.5">
                <dt className="label pt-0.5 text-ink-2">{f.k}</dt>
                <dd className="text-[0.9375rem] leading-snug">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Plate I — full-bleed */}
      <figure {...reveal(0, 'fade')} className="parallax relative bg-night">
        <img
          src="/images/barbell-140kg.webp"
          alt="Sztanga olimpijska obciążona do 140 kg — kolorowe talerze 25, 20 i 15 kg na gumowej podłodze siłowni"
          width={2400}
          height={1100}
          fetchPriority="high"
          className="block h-[62vw] max-h-[44rem] min-h-[20rem] w-full object-cover object-center"
        />
        <figcaption className="on-night bg-night sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-transparent">
          <div className="shell flex flex-col gap-3 py-5 sm:flex-row sm:pt-0 sm:items-end sm:justify-between sm:pb-7">
            <p className="label max-w-md text-night-ink">
              <span className="text-accent">140 kg</span> — gryf 20 kg, na stronę 25 + 20 + 15.
              <span className="text-night-ink-2"> Ten sam ciężar rozpisze Ci kalkulator talerzy.</span>
            </p>
            <a href="#kalkulator" className="link label text-night-ink">
              Policz swój ciężar
              <ArrowDown className="size-3.5" aria-hidden />
            </a>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}
