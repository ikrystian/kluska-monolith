import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
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

const PROVIDER_LABEL: Record<Provider, string> = { strava: 'Strava', spotify: 'Spotify' };

function isProvider(value: string | null): value is Provider {
  return value === 'strava' || value === 'spotify';
}

/**
 * Starts the OAuth flow on the backend. In the Capacitor app it runs in an
 * in-app browser tab and comes back through the `leniwakluska.com://app/...`
 * deep link (NativeDeepLinks navigates to the settings tab); in a browser the
 * backend sends this page back to `returnTo`. Either way the result arrives as
 * `?integration=…&result=connected|error&reason=…` on this route.
 */
async function openConnect(provider: Provider) {
  const params = new URLSearchParams({ token: getStoredToken() ?? '' });
  if (Capacitor.isNativePlatform()) {
    params.set('platform', 'capacitor');
    await Browser.open({ url: `${getApiBaseUrl()}/api/${provider}/connect?${params}` });
  } else {
    params.set('returnTo', `${window.location.origin}${window.location.pathname}`);
    window.location.assign(`${getApiBaseUrl()}/api/${provider}/connect?${params}`);
  }
}

async function closeBrowserSheet() {
  try {
    await Browser.close();
  } catch {
    // Browser sheet might already be closed (or, on Android, closes itself)
  }
}

function failureMessage(label: string, reason: string | null): string {
  switch (reason) {
    case 'access_denied':
      return `Anulowano łączenie z ${label}.`;
    case 'unauthorized':
      return 'Sesja wygasła — zaloguj się ponownie i spróbuj jeszcze raz.';
    case 'expired':
    case 'invalid_state':
      return 'Łączenie trwało zbyt długo. Spróbuj ponownie.';
    default:
      return `Nie udało się połączyć z ${label}.`;
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

  const onStravaChangedRef = useRef(onStravaChanged);
  onStravaChangedRef.current = onStravaChanged;

  // OAuth result: the deep link (native) or the backend redirect (web) lands
  // on this route with the outcome in the query. Report it once and drop it
  // from the URL so a refresh or back navigation doesn't repeat the toast.
  const [searchParams, setSearchParams] = useSearchParams();
  const integration = searchParams.get('integration');
  const result = searchParams.get('result');
  const reason = searchParams.get('reason');

  useEffect(() => {
    if (!isProvider(integration) || !result) return;
    const label = PROVIDER_LABEL[integration];

    void closeBrowserSheet();
    if (result === 'connected') {
      if (integration === 'strava') void onStravaChangedRef.current();
      else void refetchSpotifyStatus();
      toast({ title: 'Sukces!', description: `Połączono z kontem ${label}.` });
    } else {
      toast({ title: 'Błąd!', description: failureMessage(label, reason), variant: 'destructive' });
    }

    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        ['integration', 'result', 'reason'].forEach(key => next.delete(key));
        return next;
      },
      { replace: true }
    );
  }, [integration, result, reason, refetchSpotifyStatus, setSearchParams, toast]);

  // Closing the browser tab by hand (back button / "Done") gives no result —
  // re-read both statuses in case the connection went through anyway.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = Browser.addListener('browserFinished', () => {
      void onStravaChangedRef.current();
      void refetchSpotifyStatus();
    });
    return () => {
      void listener.then(l => l.remove());
    };
  }, [refetchSpotifyStatus]);

  const handleDisconnect = async (provider: Provider) => {
    const label = PROVIDER_LABEL[provider];
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
