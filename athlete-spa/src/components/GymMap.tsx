import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, Marker, Source, type LayerProps, type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox';
import type { GeoJSONSource } from 'mapbox-gl';
import type { FeatureCollection, Point } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTheme } from 'next-themes';
import { Geolocation } from '@capacitor/geolocation';
import { Globe, Loader2, LocateFixed, MapPin, MapPinOff, Navigation, Phone, Search, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { GymFavorites } from '@/components/gyms/GymFavorites';
import { useGymPoints, type GymPoint } from '@/hooks/useGymPoints';
import { useDoc, useUser } from '@/lib/db-hooks';
import { gymId, type Coords } from '@/lib/gym-geo';
import { haversine } from '@/lib/geo';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const STYLE = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
};

// Mapbox paint properties can't read CSS variables, so the brand colours are
// mirrored here: --primary (ember) and --volt (lime) for each theme.
const COLORS = {
  dark: { primary: '#ff6929', favorite: '#c5f23a' },
  light: { primary: '#e64c0a', favorite: '#65a30d' },
};

const POLAND = { longitude: 19.4, latitude: 52.1, zoom: 5.2 };
const SOURCE_ID = 'gyms';
const INTERACTIVE_LAYERS = ['clusters', 'gym-points'];

interface GymProperties {
  id: string;
  fav: number;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

const distanceBetween = (a: Coords, b: Coords) => haversine({ ...a, at: 0 }, { ...b, at: 0 });

function NoToken() {
  return (
    <div className="grid h-full place-items-center rounded-[2rem] border border-dashed border-border/80 p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
          <MapPinOff className="h-6 w-6 text-muted-foreground" />
        </span>
        <h2 className="mt-4 font-headline text-xl font-bold">Mapa nie jest skonfigurowana</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dodaj publiczny token Mapbox jako <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">VITE_MAPBOX_TOKEN</code> w
          pliku <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">athlete-spa/.env</code> i uruchom aplikację ponownie.
        </p>
      </div>
    </div>
  );
}

function GymCard({ gym, distance, onClose }: { gym: GymPoint; distance?: number; onClose: () => void }) {
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${gym.lat},${gym.lng}`;

  return (
    <div className="max-h-[55%] space-y-3 overflow-y-auto rounded-[1.75rem] border border-border/60 bg-card/95 p-4 shadow-lifted backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-headline text-xl font-bold leading-tight">{gym.name}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{gym.address}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition-transform active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {gym.rating ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-semibold">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {gym.rating}
            {gym.ratingCount ? <span className="font-normal text-muted-foreground">({gym.ratingCount})</span> : null}
          </span>
        ) : null}
        {distance !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
            <Navigation className="h-3.5 w-3.5" /> {formatDistance(distance)} stąd
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Button asChild className="h-11 flex-1 rounded-full">
          <a href={directions} target="_blank" rel="noopener noreferrer">
            <Navigation className="mr-2 h-4 w-4" /> Nawiguj
          </a>
        </Button>
        {gym.phoneNumber && (
          <Button asChild variant="outline" size="icon" className="h-11 w-11 rounded-full" aria-label="Zadzwoń">
            <a href={`tel:${gym.phoneNumber.replace(/\s+/g, '')}`}>
              <Phone className="h-4 w-4" />
            </a>
          </Button>
        )}
        {gym.website && (
          <Button asChild variant="outline" size="icon" className="h-11 w-11 rounded-full" aria-label="Strona www">
            <a href={gym.website} target="_blank" rel="noopener noreferrer">
              <Globe className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      <GymFavorites gymId={gymId(gym)} />
    </div>
  );
}

function NearbyList({ items, onPick, onClose }: { items: { gym: GymPoint; distance: number }[]; onPick: (g: GymPoint) => void; onClose: () => void }) {
  return (
    <div className="max-h-[55%] overflow-y-auto rounded-[1.75rem] border border-border/60 bg-card/95 p-4 shadow-lifted backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-headline text-lg font-bold">Najbliższe siłownie</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground transition-transform active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="divide-y divide-border/60">
        {items.map(({ gym, distance }) => (
          <li key={gymId(gym)}>
            <button type="button" onClick={() => onPick(gym)} className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-70">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{gym.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{gym.address}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{formatDistance(distance)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GymMap() {
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useUser();
  const { data: me } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);
  const { points, isLoading } = useGymPoints();

  const mapRef = useRef<MapRef>(null);
  const fitted = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNearby, setShowNearby] = useState(false);
  const [query, setQuery] = useState('');
  const [userPos, setUserPos] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [hovering, setHovering] = useState(false);

  const theme = resolvedTheme === 'light' ? 'light' : 'dark';
  const colors = COLORS[theme];
  const favoriteIds = useMemo(() => new Set(me?.favoriteGymIds ?? []), [me?.favoriteGymIds]);
  const selected = useMemo(() => points.find(p => gymId(p) === selectedId) ?? null, [points, selectedId]);

  const geojson = useMemo<FeatureCollection<Point, GymProperties>>(
    () => ({
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: gymId(p), fav: favoriteIds.has(gymId(p)) ? 1 : 0 },
      })),
    }),
    [points, favoriteIds]
  );

  // Frame all gyms once, as soon as both the map and the data are there.
  useEffect(() => {
    if (fitted.current || !mapReady || points.length === 0) return;
    fitted.current = true;
    const lngs = points.map(p => p.lng);
    const lats = points.map(p => p.lat);
    mapRef.current?.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 60, maxZoom: 11, duration: 0 }
    );
  }, [mapReady, points]);

  const select = useCallback((gym: GymPoint) => {
    setSelectedId(gymId(gym));
    setShowNearby(false);
    setQuery('');
    mapRef.current?.flyTo({ center: [gym.lng, gym.lat], zoom: Math.max(mapRef.current.getZoom(), 14), padding: { bottom: 220, top: 0, left: 0, right: 0 } });
  }, []);

  const onMapClick = (e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) {
      setSelectedId(null);
      return;
    }
    const props = feature.properties ?? {};
    if (props.cluster) {
      const source = mapRef.current?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      source?.getClusterExpansionZoom(props.cluster_id, (error, zoom) => {
        if (error || zoom == null) return;
        mapRef.current?.easeTo({ center: (feature.geometry as Point).coordinates as [number, number], zoom: zoom + 0.5 });
      });
      return;
    }
    const gym = points.find(p => gymId(p) === props.id);
    if (gym) select(gym);
  };

  const locate = async () => {
    setLocating(true);
    try {
      const { coords } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 });
      const here = { lat: coords.latitude, lng: coords.longitude };
      setUserPos(here);
      setSelectedId(null);
      setShowNearby(true);
      mapRef.current?.flyTo({ center: [here.lng, here.lat], zoom: 13, padding: { bottom: 220, top: 0, left: 0, right: 0 } });
    } catch {
      toast({
        title: 'Nie udało się ustalić lokalizacji',
        description: 'Sprawdź, czy aplikacja ma zgodę na dostęp do lokalizacji.',
        variant: 'destructive',
      });
    } finally {
      setLocating(false);
    }
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return points.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)).slice(0, 6);
  }, [points, query]);

  const nearby = useMemo(() => {
    if (!userPos) return [];
    return points
      .map(gym => ({ gym, distance: distanceBetween(userPos, gym) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [points, userPos]);

  const layers = useMemo(() => {
    const clusters: LayerProps = {
      id: 'clusters',
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': colors.primary,
        'circle-radius': ['step', ['get', 'point_count'], 18, 10, 23, 50, 29],
        'circle-stroke-width': 4,
        'circle-stroke-color': 'rgba(255,255,255,0.3)',
      },
    };
    const count: LayerProps = {
      id: 'cluster-count',
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': 13,
      },
      paint: { 'text-color': '#ffffff' },
    };
    const halo: LayerProps = {
      id: 'gym-selected',
      type: 'circle',
      source: SOURCE_ID,
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedId ?? '']],
      paint: {
        'circle-radius': 17,
        'circle-color': colors.primary,
        'circle-opacity': 0.25,
        'circle-stroke-width': 2,
        'circle-stroke-color': colors.primary,
      },
    };
    const dots: LayerProps = {
      id: 'gym-points',
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['case', ['==', ['get', 'fav'], 1], colors.favorite, colors.primary],
        'circle-radius': 8,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
      },
    };
    return { clusters, count, halo, dots };
  }, [colors, selectedId]);

  if (!TOKEN) return <NoToken />;

  const selectedDistance = selected && userPos ? distanceBetween(userPos, selected) : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-soft">
      <MapGL
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle={STYLE[theme]}
        initialViewState={POLAND}
        style={{ position: 'absolute', inset: 0 }}
        interactiveLayerIds={INTERACTIVE_LAYERS}
        cursor={hovering ? 'pointer' : undefined}
        onLoad={() => setMapReady(true)}
        onClick={onMapClick}
        onMouseMove={e => setHovering(!!e.features?.length)}
        attributionControl
      >
        <Source id={SOURCE_ID} type="geojson" data={geojson} cluster clusterMaxZoom={13} clusterRadius={50}>
          <Layer {...layers.clusters} />
          <Layer {...layers.count} />
          <Layer {...layers.halo} />
          <Layer {...layers.dots} />
        </Source>

        {userPos && (
          <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center">
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
              <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-sky-500 shadow" />
            </span>
          </Marker>
        )}
      </MapGL>

      {/* Search */}
      <div className="absolute inset-x-3 top-3 z-10">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isLoading ? 'Wczytuję siłownie…' : `Szukaj wśród ${points.length} siłowni`}
            aria-label="Szukaj siłowni"
            className="h-11 rounded-full border-border/60 bg-card/95 pl-10 shadow-lifted backdrop-blur-xl"
          />
        </div>
        {matches.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-lifted backdrop-blur-xl">
            {matches.map(gym => (
              <li key={gymId(gym)} className="border-b border-border/60 last:border-0">
                <button type="button" onClick={() => select(gym)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-secondary/60">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{gym.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{gym.address}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim() && matches.length === 0 && !isLoading && (
          <p className="mt-2 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 text-sm text-muted-foreground shadow-lifted backdrop-blur-xl">
            Nie znaleziono siłowni.
          </p>
        )}
      </div>

      {/* Locate */}
      <Button
        type="button"
        size="icon"
        onClick={locate}
        disabled={locating}
        aria-label="Pokaż siłownie blisko mnie"
        className={cn('absolute right-3 z-10 h-12 w-12 rounded-full shadow-glow transition-[bottom]', selected || showNearby ? 'bottom-[calc(55%+0.75rem)]' : 'bottom-10')}
      >
        {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
      </Button>

      {/* Details */}
      <div className="absolute inset-x-3 bottom-9 z-10">
        {selected ? (
          <GymCard gym={selected} distance={selectedDistance} onClose={() => setSelectedId(null)} />
        ) : showNearby && nearby.length > 0 ? (
          <NearbyList items={nearby} onPick={select} onClose={() => setShowNearby(false)} />
        ) : null}
      </div>

      {isLoading && <Skeleton className="absolute inset-0 z-20 rounded-none" />}
    </div>
  );
}
