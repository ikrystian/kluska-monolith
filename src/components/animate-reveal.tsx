'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * When the URL contains `?de=true`, hides every `.toAnimate` element (via CSS
 * in globals.css) and shows a fixed button that reveals them with an animation.
 */
export function AnimateReveal() {
  const [enabled, setEnabled] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const active = new URLSearchParams(window.location.search).get('de') === 'true';
    setEnabled(active);
    document.documentElement.classList.toggle('de-active', active);
    return () => {
      document.documentElement.classList.remove('de-active', 'de-revealed');
    };
  }, []);

  if (!enabled || revealed) return null;

  return (
    <button
      type="button"
      aria-label="Odtwórz animację"
      onClick={() => {
        setRevealed(true);
        document.documentElement.classList.add('de-revealed');
      }}
      className="fixed bottom-4 right-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
    >
      <Sparkles className="h-6 w-6" />
    </button>
  );
}
