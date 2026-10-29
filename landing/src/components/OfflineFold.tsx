import { useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { reveal } from '../lib/reveal';

const extras = [
  {
    name: 'Grywalizacja',
    body: 'Punkty XP za ukończone treningi, odznaki za rekordy i licznik dni z rzędu.',
  },
  {
    name: 'Nawyki',
    body: 'Woda, sen, kreatyna, białko — codzienne cele odhaczane jednym dotknięciem.',
  },
  {
    name: 'Atlas ćwiczeń',
    body: 'Ponad 250 ruchów z opisem techniki i zaangażowanych mięśni.',
  },
  {
    name: 'Widżet na ekranie blokady',
    body: 'Trwający trening i przerwa widoczne bez odblokowywania telefonu.',
  },
];

function RonnieButton() {
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audio.current) {
      audio.current = new Audio('/ronnie_lightweight-baby.mp3');
      audio.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audio.current.pause();
      audio.current.currentTime = 0;
      setPlaying(false);
      return;
    }
    audio.current
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  return (
    <button type="button" onClick={toggle} aria-pressed={playing} className="btn btn-ghost">
      {playing ? <Square className="size-4 text-accent" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      {playing ? 'Zatrzymaj' : 'Odtwórz „Lightweight baby!”'}
    </button>
  );
}

export function OfflineFold() {
  return (
    <section id="offline" aria-labelledby="offline-title" className="on-night bg-night text-night-ink">
      <div className="grid lg:grid-cols-2">
        <figure {...reveal(0, 'image')} className="relative overflow-hidden lg:order-2">
          <img
            src="/images/kettlebells.webp"
            alt="Trzy odważniki kettlebell — 16, 24 i 32 kg — na gumowej podłodze w ciemnej siłowni"
            width={1800}
            height={1260}
            loading="lazy"
            className="block h-full min-h-[18rem] w-full object-cover lg:min-h-[40rem]"
          />
          <figcaption className="label absolute bottom-0 left-0 p-4 text-night-ink-2 sm:p-6">16 · 24 · 32 kg</figcaption>
        </figure>

        <div className="flex flex-col justify-center px-4 py-16 sm:px-8 sm:py-20 lg:px-12 xl:pl-[max(3rem,calc((100vw-84rem)/2+3rem))]">
          <h2 {...reveal(0)} id="offline-title" className="display text-[clamp(2.5rem,5.5vw,4.5rem)]">
            Działa w{'\u00a0'}piwnicy. Bez zasięgu.
          </h2>
          <p {...reveal(1)} className="mt-6 max-w-lg text-lg leading-relaxed text-night-ink-2">
            Najlepsze siłownie mają grube ściany i zero sieci. Każda seria zapisuje się lokalnie na telefonie i
            synchronizuje w tle, gdy tylko wrócisz do zasięgu.
          </p>
        </div>
      </div>

      <div className="shell py-20 sm:py-24">
        <h3 {...reveal(0)} className="display text-3xl sm:text-4xl">Do tego drobiazgi, które robią różnicę.</h3>
        <dl className="mt-10 grid gap-x-12 sm:grid-cols-2">
          {extras.map((e, i) => (
            <div {...reveal(i % 2)} key={e.name} className="border-t border-night-rule py-5">
              <dt className="font-semibold">{e.name}</dt>
              <dd className="mt-1.5 text-night-ink-2">{e.body}</dd>
            </div>
          ))}
          <div {...reveal(0)} className="border-t border-night-rule py-5 sm:col-span-2">
            <dt className="font-semibold">Ronnie Coleman na ciężką serię</dt>
            <dd className="mt-1.5 flex flex-col gap-4 text-night-ink-2 sm:flex-row sm:items-center sm:justify-between">
              <span>Przed rekordowym podejściem jeden przycisk w stoperze odpala kultowy okrzyk.</span>
              <RonnieButton />
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
