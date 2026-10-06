import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
// Spotify needs a moment to switch tracks, so re-check shortly after a skip
// instead of waiting for the next regular poll.
const SKIP_REFETCH_DELAYS_MS = [400, 1200, 2500];
// Never leave the placeholder up forever if the track never changes
// (e.g. skipping past the end of the queue).
const SKIP_LOADING_TIMEOUT_MS = 6000;

const trackKey = (track: SpotifyTrack | null) => (track ? `${track.name}\u0000${track.artist}` : null);

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

  const [isTrackLoading, setIsTrackLoading] = useState(false);
  // Track shown when a skip was requested; loading ends once a different one arrives.
  const skippedFromRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stopTrackLoading = useCallback(() => {
    skippedFromRef.current = null;
    clearTimeout(loadingTimeoutRef.current);
    setIsTrackLoading(false);
  }, []);

  const fetchState = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const response = await apiFetch('/api/spotify/player');
      if (isCancelled() || !response.ok) return;
      const data: PlaybackState = await response.json();
      if (isCancelled()) return;
      setState(data);
      if (data.track) setNoActiveDevice(false);
      if (skippedFromRef.current !== null && trackKey(data.track) !== skippedFromRef.current) {
        stopTrackLoading();
      }
    } catch {
      // Next poll retries — keep showing the last known state.
    }
  }, [stopTrackLoading]);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    fetchState(isCancelled);
    const interval = setInterval(() => fetchState(isCancelled), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(loadingTimeoutRef.current);
    };
  }, [fetchState]);

  const sendAction = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    if (isActing) return;
    setIsActing(true);
    if (action === 'play' || action === 'pause') {
      setState((prev) => (prev ? { ...prev, isPlaying: action === 'play' } : prev));
    }
    const isSkip = action === 'next' || action === 'previous';
    if (isSkip) {
      skippedFromRef.current = trackKey(state?.track ?? null) ?? '';
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(stopTrackLoading, SKIP_LOADING_TIMEOUT_MS);
      setIsTrackLoading(true);
    }
    try {
      const response = await apiFetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setNoActiveDevice(response.status === 404);
      if (isSkip) {
        if (response.ok) SKIP_REFETCH_DELAYS_MS.forEach((delay) => setTimeout(() => fetchState(), delay));
        else stopTrackLoading();
      }
    } catch {
      if (isSkip) stopTrackLoading();
      // Swallow — next poll resyncs the real state.
    } finally {
      setIsActing(false);
    }
  };

  // Connected but nothing playing (204 from Spotify) — keep the bar visible so it doesn't look broken
  if (noActiveDevice || (state && !state.track)) {
    return (
      <div className={cn('flex items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground', className)}>
        <Music2 className="h-4 w-4 shrink-0" />
        Otwórz Spotify na telefonie, aby sterować odtwarzaniem
      </div>
    );
  }

  if (!state?.track) {
    return null; // first poll still in flight
  }

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border bg-card px-3 py-2 shadow-soft toAnimate', className)}>
      {isTrackLoading ? (
        <Skeleton className="h-9 w-9 shrink-0" />
      ) : state.track.albumArt ? (
        <img src={state.track.albumArt} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary">
          <Music2 className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      {isTrackLoading ? (
        <div className="min-w-0 flex-1 space-y-1.5" aria-busy="true" aria-label="Ładowanie utworu">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{state.track.name}</p>
          <p className="truncate text-xs text-muted-foreground">{state.track.artist}</p>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.8 }}
          whileHover={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          aria-label="Poprzedni utwór"
          onClick={() => sendAction('previous')}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <motion.span
            className="grid place-items-center"
            whileTap={{ x: -3 }}
            transition={{ type: 'spring', stiffness: 600, damping: 14 }}
          >
            <SkipBack className="h-4 w-4" />
          </motion.span>
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          aria-label={state.isPlaying ? 'Pauza' : 'Odtwórz'}
          onClick={() => sendAction(state.isPlaying ? 'pause' : 'play')}
          className="relative grid h-8 w-8 place-items-center rounded-full bg-[#1DB954] text-white"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={state.isPlaying ? 'pause' : 'play'}
              className="grid place-items-center"
              initial={{ scale: 0.4, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.4, rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.8 }}
          whileHover={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          aria-label="Następny utwór"
          onClick={() => sendAction('next')}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <motion.span
            className="grid place-items-center"
            whileTap={{ x: 3 }}
            transition={{ type: 'spring', stiffness: 600, damping: 14 }}
          >
            <SkipForward className="h-4 w-4" />
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}
