import { useEffect, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';

interface CoachTestButtonProps {
  onTest: () => void;
  testing: boolean;
  /** Epoch ms until which the backend would throttle another request. */
  cooldownUntil: number;
}

/**
 * Test-only: sends a made-up kilometre to the AI coach so the whole path —
 * backend, model, ElevenLabs, playback — can be heard without running.
 * Sits in the run screen's top bar.
 */
export function CoachTestButton({ onTest, testing, cooldownUntil }: CoachTestButtonProps) {
  const [now, setNow] = useState(() => Date.now());
  const remainingS = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  return (
    <button
      type="button"
      onClick={onTest}
      disabled={testing || remainingS > 0}
      aria-label="Test trenera głosowego"
      className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full bg-black/40 px-3 text-xs font-semibold text-white backdrop-blur-md active:scale-95 disabled:opacity-60"
    >
      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
      {testing ? 'Test…' : remainingS > 0 ? `${remainingS} s` : 'Test'}
    </button>
  );
}
