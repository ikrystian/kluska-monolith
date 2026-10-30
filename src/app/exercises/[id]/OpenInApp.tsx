'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const APP_SCHEME = 'leniwakluska.com://app';
const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? 'https://play.google.com/store/apps/details?id=com.athlete.spa';
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '';
/** Po tym czasie bez przejścia do aplikacji zakładamy, że nie jest zainstalowana. */
const FALLBACK_DELAY_MS = 1500;

interface OpenInAppProps {
  exerciseId: string;
}

/** Próbuje otworzyć aplikację na Androidzie (raz na sesję) i pokazuje CTA, gdy się nie udało. */
export function OpenInApp({ exerciseId }: OpenInAppProps) {
  const [appMissing, setAppMissing] = useState(false);
  const deepLink = `${APP_SCHEME}/athlete/exercise/${exerciseId}`;
  const autoOpenKey = `ekl-auto-open-${exerciseId}`;

  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) return;

    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(autoOpenKey) === '1';
      sessionStorage.setItem(autoOpenKey, '1');
    } catch {
      // Tryb prywatny lub zablokowany storage: po prostu próbujemy raz więcej.
    }
    if (alreadyTried) {
      setAppMissing(true);
      return;
    }

    const timer = window.setTimeout(() => setAppMissing(true), FALLBACK_DELAY_MS);
    const onVisibilityChange = () => {
      if (document.hidden) window.clearTimeout(timer);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.location.href = deepLink;

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [deepLink, autoOpenKey]);

  return (
    <div className="space-y-3">
      <Button asChild size="lg" className="w-full gap-2 rounded-full">
        <a href={deepLink}>
          <Smartphone className="h-4 w-4" />
          Otwórz w aplikacji
        </a>
      </Button>
      {appMissing && (
        <p className="text-center text-sm text-muted-foreground">
          Nie masz jeszcze aplikacji? Pobierz ją poniżej, a potem zeskanuj kod ponownie.
        </p>
      )}
    </div>
  );
}

export function AppDownloadSection() {
  return (
    <section className="glass space-y-4 rounded-3xl p-5">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">LeniwaKluska</p>
        <h2 className="title-display text-xl font-extrabold">Trenuj mądrzej z aplikacją</h2>
        <p className="text-sm text-muted-foreground">
          Dodaj to ćwiczenie do treningu jednym tapnięciem, śledź tonaż i postęp oraz zapisuj każdą serię.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="gap-2 rounded-full">
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
            Pobierz na Google Play
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
        {APP_STORE_URL ? (
          <Button asChild size="lg" variant="outline" className="gap-2 rounded-full">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              Pobierz z App Store
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button size="lg" variant="outline" className="rounded-full" disabled>
            App Store - wkrótce
          </Button>
        )}
      </div>
    </section>
  );
}
