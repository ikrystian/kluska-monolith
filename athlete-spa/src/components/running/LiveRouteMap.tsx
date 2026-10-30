import { useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { AttributionControl, Layer, Marker, Source, type LayerProps, type MapRef } from 'react-map-gl/mapbox';
import type { FeatureCollection, LineString } from 'geojson';
import { useTheme } from 'next-themes';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapUnavailable } from '@/components/running/MapUnavailable';
import { MAPBOX_TOKEN, MAP_STYLE, ROUTE_COLOR, prefersReducedMotion } from '@/lib/mapbox';
import type { TrackPoint } from '@/hooks/useRunTracker';
import { cn } from '@/lib/utils';

interface LiveRouteMapProps {
  points: TrackPoint[];
  className?: string;
}

// Same country-wide framing the gym map opens on: wide enough that the first
// fix has somewhere to zoom in from.
const START_VIEW = { longitude: 19.4, latitude: 52.1, zoom: 5.2 };
const FOLLOW_ZOOM = 16;
const ZOOM_IN_MS = 3500;

// The recorder's top bar sits over the map; the attribution goes just below it.
const BELOW_TOP_BAR = '[&_.mapboxgl-ctrl-top-left]:mt-[calc(3.75rem+env(safe-area-inset-top))] [&_.mapboxgl-ctrl-top-right]:mt-[calc(3.75rem+env(safe-area-inset-top))]';

/**
 * Draws the run in progress on a Mapbox map. The map opens zoomed out and,
 * once the first GPS fix arrives, flies in to the athlete; after that it
 * extends the route and keeps the camera on the latest fix.
 *
 * The after-the-fact counterpart (for a saved run's polyline) is RouteMap.tsx;
 * this one is fed the raw, growing point list directly instead of an encoded
 * polyline, since re-encoding on every tick would be wasted work.
 */
export function LiveRouteMap({ points, className = '' }: LiveRouteMapProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'light' ? 'light' : 'dark';

  const mapRef = useRef<MapRef>(null);
  const [mapReady, setMapReady] = useState(false);
  // 'pending' until the first fix, 'flying' during the zoom-in, 'done' after.
  const intro = useRef<'pending' | 'flying' | 'done'>('pending');

  const last = points[points.length - 1];
  const lastLng = last?.lng;
  const lastLat = last?.lat;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || lastLng === undefined || lastLat === undefined) return;
    const center: [number, number] = [lastLng, lastLat];

    if (intro.current === 'pending') {
      if (prefersReducedMotion()) {
        map.jumpTo({ center, zoom: FOLLOW_ZOOM });
        intro.current = 'done';
        return;
      }
      intro.current = 'flying';
      map.flyTo({ center, zoom: FOLLOW_ZOOM, duration: ZOOM_IN_MS, essential: true });
      map.once('moveend', () => {
        intro.current = 'done';
      });
      return;
    }

    // New fixes arriving mid-flight must not cut the zoom-in short.
    if (intro.current === 'flying') return;

    map.easeTo({ center, zoom: Math.max(map.getZoom(), FOLLOW_ZOOM), duration: 800 });
  }, [lastLng, lastLat, mapReady]);

  const route = useMemo<FeatureCollection<LineString>>(
    () => ({
      type: 'FeatureCollection',
      // A line needs two fixes; before that only the position marker shows.
      features:
        points.length > 1
          ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map(p => [p.lng, p.lat]) } }]
          : [],
    }),
    [points]
  );

  const layers = useMemo(() => {
    const casing: LayerProps = {
      id: 'live-route-casing',
      type: 'line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': theme === 'dark' ? 0.4 : 0.9 },
    };
    const line: LayerProps = {
      id: 'live-route-line',
      type: 'line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ROUTE_COLOR[theme], 'line-width': 5 },
    };
    return { casing, line };
  }, [theme]);

  if (!MAPBOX_TOKEN) return <MapUnavailable className={cn('h-full w-full', className)} />;

  return (
    <div className={cn('h-full w-full', BELOW_TOP_BAR, className)}>
      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE[theme]}
        initialViewState={START_VIEW}
        style={{ width: '100%', height: '100%' }}
        // The attribution has to stay visible, and the stats sheet covers the bottom corners.
        attributionControl={false}
        logoPosition="top-left"
        onLoad={() => setMapReady(true)}
      >
        <AttributionControl compact position="top-right" />

        <Source id="live-route" type="geojson" data={route}>
          <Layer {...layers.casing} />
          <Layer {...layers.line} />
        </Source>

        {last && (
          <Marker longitude={last.lng} latitude={last.lat} anchor="center">
            <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.25)]" />
          </Marker>
        )}
      </MapGL>
    </div>
  );
}
