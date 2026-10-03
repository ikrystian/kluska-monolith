import { useEffect, useState } from 'react';
import { Music2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface SpotifyTrack {
  name: string;
  artist: string;
  albumArt: string | null;
}

interface PlaybackState {
  isPlaying: boolean;
  device: string | null;
  track: SpotifyTrack | null;
}

const POLL_INTERVAL_MS = 7000;

/**
 * Floating now-playing bar shown while an athlete tracks a workout. Remote
 * controls whatever is already active on the athlete's Spotify account
 * (usually their phone's Spotify app) via the backend proxy — it never
 * streams audio itself, so it works the same in the web app and the
 * Capacitor WebView.
 */
export function SpotifyWidget({ className }: { className?: string }) {
  const [state, setState] = useState<PlaybackState | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [noActiveDevice, setNoActiveDevice] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await apiFetch('/api/spotify/player');
        if (cancelled || !response.ok) return;
        const data: PlaybackState = await response.json();
        setState(data);
        if (data.track) setNoActiveDevice(false);
      } catch {
        // Next poll retries — keep showing the last known state.
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const sendAction = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    if (isActing) return;
    setIsActing(true);
    if (action === 'play' || action === 'pause') {
      setState((prev) => (prev ? { ...prev, isPlaying: action === 'play' } : prev));
    }
    try {
      const response = await apiFetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setNoActiveDevice(response.status === 404);
    } catch {
      // Swallow — next poll resyncs the real state.
    } finally {
      setIsActing(false);
    }
  };

  if (noActiveDevice) {
    return (
      <div className={cn('flex items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground', className)}>
        <Music2 className="h-4 w-4 shrink-0" />
        Otwórz Spotify na telefonie, aby sterować odtwarzaniem
      </div>
    );
  }

  if (!state?.track) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border bg-card px-3 py-2 shadow-soft', className)}>
      {state.track.albumArt ? (
        <img src={state.track.albumArt} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary">
          <Music2 className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{state.track.name}</p>
        <p className="truncate text-xs text-muted-foreground">{state.track.artist}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Poprzedni utwór"
          onClick={() => sendAction('previous')}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-90"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={state.isPlaying ? 'Pauza' : 'Odtwórz'}
          onClick={() => sendAction(state.isPlaying ? 'pause' : 'play')}
          className="grid h-8 w-8 place-items-center rounded-full bg-[#1DB954] text-white transition-transform active:scale-90"
        >
          {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          aria-label="Następny utwór"
          onClick={() => sendAction('next')}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-90"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
