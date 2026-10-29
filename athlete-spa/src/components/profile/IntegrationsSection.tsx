import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Activity, LayoutPanelTop, Loader2, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { apiFetch, getApiBaseUrl, getStoredToken } from '@/lib/api-client';
import { isSpotifyWidgetEnabled, setSpotifyWidgetEnabled } from '@/lib/app-permissions';
import { useToast } from '@/hooks/use-toast';
import { SettingsGroup, SettingsRow } from './profile-ui';

const STRAVA_COLOR = '#FC4C02';
const SPOTIFY_COLOR = '#1DB954';

type Provider = 'strava' | 'spotify';

async function openConnect(provider: Provider) {
  const token = encodeURIComponent(getStoredToken() ?? '');
  const url = `${getApiBaseUrl()}/api/${provider}/connect?token=${token}`;
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: `${url}&platform=capacitor` });
  } else {
    window.location.href = url;
  }
}

async function closeBrowserSheet() {
  try {
    await Browser.close();
  } catch {
    // Browser sheet might already be closed
  }
}

function ConnectionStatus({ connected, text }: { connected: boolean; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={connected ? 'h-1.5 w-1.5 rounded-full bg-volt' : 'h-1.5 w-1.5 rounded-full bg-muted-foreground/50'} />
      {text}
    </span>
  );
}

export function IntegrationsSection({
  isStravaConnected,
  isProfileLoading,
  onStravaChanged,
}: {
  isStravaConnected: boolean;
  isProfileLoading: boolean;
  onStravaChanged: () => unknown;
}) {
  const { toast } = useToast();
  const [disconnecting, setDisconnecting] = useState<Provider | null>(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isSpotifyStatusLoading, setIsSpotifyStatusLoading] = useState(true);
  const [spotifyWidgetOn, setSpotifyWidgetOn] = useState(() => isSpotifyWidgetEnabled());

  const refetchSpotifyStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/api/spotify/status');
      if (!response.ok) return;
      const data = await response.json();
      setIsSpotifyConnected(!!data.connected);
    } catch {
      // Network hiccup — leave the last known connected state as-is.
    } finally {
      setIsSpotifyStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetchSpotifyStatus();
  }, [refetchSpotifyStatus]);

  // Native OAuth returns through a deep link into the app; the web flow reloads the page instead.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrlOpen = async ({ url }: { url: string }) => {
      const result =
        url.includes('strava-callback') || url.includes('strava_connected')
          ? { ok: true, label: 'Strava' }
          : url.includes('strava_error')
            ? { ok: false, label: 'Strava' }
            : url.includes('spotify-callback') || url.includes('spotify_connected')
              ? { ok: true, label: 'Spotify' }
              : url.includes('spotify_error')
                ? { ok: false, label: 'Spotify' }
                : null;
      if (!result) return;

      await closeBrowserSheet();
      if (result.ok) {
        if (result.label === 'Strava') onStravaChanged();
        else void refetchSpotifyStatus();
        toast({ title: 'Sukces!', description: `Połączono z kontem ${result.label}.` });
      } else {
        toast({ title: 'Błąd!', description: `Nie udało się połączyć z ${result.label}.`, variant: 'destructive' });
      }
    };

    const appListener = App.addListener('appUrlOpen', handleUrlOpen);
    const browserListener = Browser.addListener('browserFinished', () => {
      onStravaChanged();
      void refetchSpotifyStatus();
    });

    return () => {
      appListener.then(l => l.remove());
      browserListener.then(l => l.remove());
    };
  }, [onStravaChanged, refetchSpotifyStatus, toast]);

  const handleDisconnect = async (provider: Provider) => {
    const label = provider === 'strava' ? 'Strava' : 'Spotify';
    setDisconnecting(provider);
    try {
      const response = await apiFetch(`/api/${provider}/disconnect`, { method: 'POST' });
      if (!response.ok) throw new Error(`Failed to disconnect ${label}`);
      if (provider === 'strava') {
        await onStravaChanged();
      } else {
        await refetchSpotifyStatus();
        setSpotifyWidgetOn(false);
        setSpotifyWidgetEnabled(false);
      }
      toast({ title: 'Sukces!', description: `${label} — konto odłączone.` });
    } catch {
      toast({ title: 'Błąd!', description: `Nie udało się odłączyć ${label}.`, variant: 'destructive' });
    } finally {
      setDisconnecting(null);
    }
  };

  const renderControl = (provider: Provider, connected: boolean, loading: boolean, color: string) => {
    if (loading) return <Skeleton className="h-8 w-20 rounded-full" />;
    if (connected) {
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-full"
          disabled={disconnecting === provider}
          onClick={() => handleDisconnect(provider)}
        >
          {disconnecting === provider && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Odłącz
        </Button>
      );
    }
    return (
      <Button
        type="button"
        size="sm"
        className="h-8 rounded-full text-white hover:opacity-90"
        style={{ backgroundColor: color }}
        onClick={() => openConnect(provider)}
      >
        Połącz
      </Button>
    );
  };

  return (
    <SettingsGroup title="Integracje" footer="Strava importuje Twoje biegi automatycznie, a Spotify pozwala sterować muzyką podczas treningu.">
      <SettingsRow
        icon={Activity}
        color={STRAVA_COLOR}
        title="Strava"
        description={
          <ConnectionStatus
            connected={isStravaConnected}
            text={isStravaConnected ? 'Połączono · biegi są synchronizowane' : 'Nie połączono'}
          />
        }
        control={renderControl('strava', isStravaConnected, isProfileLoading, STRAVA_COLOR)}
      />
      <SettingsRow
        icon={Music2}
        color={SPOTIFY_COLOR}
        title="Spotify"
        description={
          <ConnectionStatus
            connected={isSpotifyConnected}
            text={isSpotifyConnected ? 'Połączono · sterowanie muzyką' : 'Nie połączono'}
          />
        }
        control={renderControl('spotify', isSpotifyConnected, isSpotifyStatusLoading, SPOTIFY_COLOR)}
      />
      {isSpotifyConnected && (
        <SettingsRow
          icon={LayoutPanelTop}
          color={SPOTIFY_COLOR}
          htmlFor="spotify-widget"
          title="Widget podczas treningu"
          description="Kontrolki odtwarzania na ekranie treningu."
          control={
            <Switch
              id="spotify-widget"
              checked={spotifyWidgetOn}
              onCheckedChange={checked => {
                setSpotifyWidgetOn(checked);
                setSpotifyWidgetEnabled(checked);
              }}
            />
          }
        />
      )}
    </SettingsGroup>
  );
}
