'use client';

import { useEffect, useMemo, useState } from 'react';
import MapGL, { Layer, Marker, NavigationControl, Source, type LayerProps } from 'react-map-gl/mapbox';
import type { ExpressionSpecification } from 'mapbox-gl';
import type { FeatureCollection, LineString } from 'geojson';
import * as polyline from 'polyline-encoded';
import { RotateCcw } from 'lucide-react';
import { useTheme } from 'next-themes';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapUnavailable } from '@/components/running/MapUnavailable';
import { MAPBOX_TOKEN, MAP_STYLE, ROUTE_COLOR, prefersReducedMotion } from '@/lib/mapbox';
import { cumulativeDistances, formatPaceSec, paceColor, type KmSegment, type LatLngTuple } from '@/lib/run-pace';
import { cn } from '@/lib/utils';

interface RouteMapProps {
    polyline: string;
    /** Per-kilometre pieces coloured by pace; without them the route is drawn in one colour. */
    segments?: KmSegment[];
    className?: string;
}

type LngLat = [number, number];

/** Pause after the map loads, so the route starts drawing once the tiles are in view. */
const START_DELAY_MS = 400;

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Longer runs take longer to draw, within bounds that keep it from dragging. */
const drawDuration = (totalMeters: number) => Math.min(7000, Math.max(3500, totalMeters * 0.5));

const toLngLat = ([lat, lng]: LatLngTuple): LngLat => [lng, lat];

/** Where `progress` (0–1 of the route's length) lands on the route. */
function pointAt(route: LngLat[], fractions: number[], progress: number): LngLat {
    if (progress <= 0) return route[0];
    if (progress >= 1) return route[route.length - 1];

    let lo = 0;
    let hi = fractions.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (fractions[mid] <= progress) lo = mid;
        else hi = mid;
    }
    const span = fractions[hi] - fractions[lo];
    const f = span > 0 ? (progress - fractions[lo]) / span : 0;
    return [route[lo][0] + (route[hi][0] - route[lo][0]) * f, route[lo][1] + (route[hi][1] - route[lo][1]) * f];
}

/** `line-gradient` that steps through the kilometre colours along the line. */
function paceGradient(segments: KmSegment[], ends: number[]): ExpressionSpecification {
    const expression: (string | number | ExpressionSpecification)[] = ['step', ['line-progress'], segments[0].color];
    let last = 0;
    segments.forEach((segment, i) => {
        if (i === 0) return;
        const start = ends[i - 1];
        // Stops must strictly increase; a zero-length piece has nothing to colour.
        if (start <= last + 1e-6 || start >= 1) return;
        expression.push(start, segment.color);
        last = start;
    });
    return expression as ExpressionSpecification;
}

/**
 * A saved run's route on a Mapbox map. When the map has loaded the route draws
 * itself from start to finish with a marker running ahead of it, then offers a
 * replay. The line is revealed on the GPU via `line-trim-offset`, so a long
 * run costs no more per frame than a short one.
 *
 * The live counterpart while recording is LiveRouteMap.tsx.
 */
export function RouteMap({ polyline: encodedPolyline, segments, className = '' }: RouteMapProps) {
    const { resolvedTheme } = useTheme();
    const theme = resolvedTheme === 'light' ? 'light' : 'dark';

    const [loads, setLoads] = useState(0);
    const [plays, setPlays] = useState(0);
    // 0–1 share of the route drawn so far.
    const [progress, setProgress] = useState(0);

    const route = useMemo(() => {
        let decoded: LatLngTuple[] = [];
        try {
            decoded = polyline.decode(encodedPolyline);
        } catch {
            // Malformed polyline — treated like a run without a route.
        }
        const cumulative = cumulativeDistances(decoded);
        const total = cumulative[cumulative.length - 1] ?? 0;
        return {
            coords: decoded.map(toLngLat),
            fractions: cumulative.map(d => (total > 0 ? d / total : 0)),
            totalMeters: total,
        };
    }, [encodedPolyline]);

    // Where each kilometre piece ends along the route, as a share of its length.
    const pace = useMemo(() => {
        if (!segments || segments.length === 0) return null;
        const lengths = segments.map(s => cumulativeDistances(s.coords).at(-1) ?? 0);
        const sum = lengths.reduce((a, b) => a + b, 0);
        if (sum <= 0) return null;
        let acc = 0;
        const ends = lengths.map(l => (acc += l) / sum);
        return { ends, gradient: paceGradient(segments, ends) };
    }, [segments]);

    const bounds = useMemo(() => {
        const lngs = route.coords.map(c => c[0]);
        const lats = route.coords.map(c => c[1]);
        return [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
        ] as [LngLat, LngLat];
    }, [route]);

    const canDraw = route.coords.length >= 2;

    useEffect(() => {
        if (loads === 0 || !canDraw) return;
        if (prefersReducedMotion()) {
            setProgress(1);
            return;
        }

        setProgress(0);
        const duration = drawDuration(route.totalMeters);
        let start: number | null = null;
        let frame = 0;
        const tick = (now: number) => {
            start ??= now;
            const t = Math.min(1, Math.max(0, (now - start - START_DELAY_MS) / duration));
            setProgress(easeInOutQuad(t));
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [loads, plays, canDraw, route.totalMeters]);

    const layers = useMemo(() => {
        // Trims the not-yet-drawn tail; an empty range at the end shows the whole line.
        const trim: [number, number] = progress >= 1 ? [0, 0] : [progress, 1];
        const color = ROUTE_COLOR[theme];
        const casing: LayerProps = {
            id: 'route-casing',
            type: 'line',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': '#ffffff',
                'line-width': 9,
                'line-opacity': theme === 'dark' ? 0.55 : 0.9,
                'line-trim-offset': trim,
            },
        };
        const line: LayerProps = {
            id: 'route-line',
            type: 'line',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                ...(pace ? { 'line-gradient': pace.gradient } : { 'line-color': color }),
                'line-width': 5,
                'line-trim-offset': trim,
            },
        };
        return { casing, line };
    }, [progress, pace, theme]);

    const geojson = useMemo<FeatureCollection<LineString>>(
        () => ({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.coords } }],
        }),
        [route]
    );

    const paces = segments?.map(s => s.paceSecPerKm).filter(p => p > 0) ?? [];

    if (!MAPBOX_TOKEN) return <MapUnavailable className={cn('h-[400px] w-full', className)} />;
    if (route.coords.length === 0) return null;

    const head = pointAt(route.coords, route.fractions, progress);
    const drawing = progress > 0 && progress < 1;

    return (
        <div>
            <div className={cn('relative h-[400px] w-full overflow-hidden', className)}>
                <MapGL
                    // A different route needs its own framing, not a camera move.
                    key={encodedPolyline}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle={MAP_STYLE[theme]}
                    initialViewState={{ bounds, fitBoundsOptions: { padding: 40, maxZoom: 17 } }}
                    style={{ position: 'absolute', inset: 0 }}
                    // The page scrolls past the map; the wheel shouldn't get trapped in it.
                    scrollZoom={false}
                    onLoad={() => setLoads(n => n + 1)}
                >
                    <NavigationControl showCompass={false} position="top-right" />

                    {canDraw && (
                        <Source id="route" type="geojson" data={geojson} lineMetrics>
                            {/* The white casing keeps the pace colours readable on any map. */}
                            {pace && <Layer {...layers.casing} />}
                            <Layer {...layers.line} />
                        </Source>
                    )}

                    {/* Kilometre markers appear as the line reaches them. */}
                    {segments && pace &&
                        segments.slice(0, -1).map((segment, i) => {
                            if (progress < pace.ends[i]) return null;
                            const [lng, lat] = toLngLat(segment.coords[segment.coords.length - 1]);
                            return (
                                <Marker key={segment.km} longitude={lng} latitude={lat} anchor="center">
                                    <div
                                        title={`Km ${segment.km} · ${formatPaceSec(segment.paceSecPerKm)}/km`}
                                        className="grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-bold leading-none text-neutral-900 shadow"
                                        style={{ border: `2px solid ${segment.color}` }}
                                    >
                                        {segment.km}
                                    </div>
                                </Marker>
                            );
                        })}

                    <Marker longitude={route.coords[0][0]} latitude={route.coords[0][1]} anchor="center">
                        <div className="h-3 w-3 rounded-full border-2 border-white bg-green-500 shadow" />
                    </Marker>

                    {progress >= 1 && (
                        <Marker
                            longitude={route.coords[route.coords.length - 1][0]}
                            latitude={route.coords[route.coords.length - 1][1]}
                            anchor="center"
                        >
                            <div className="h-3 w-3 rounded-full border-2 border-white bg-red-500 shadow" />
                        </Marker>
                    )}

                    {/* The runner, out in front of the line while it draws. */}
                    {drawing && (
                        <Marker longitude={head[0]} latitude={head[1]} anchor="center">
                            <span className="relative flex h-4 w-4">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                                <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-primary shadow" />
                            </span>
                        </Marker>
                    )}
                </MapGL>

                {canDraw && progress >= 1 && (
                    <button
                        type="button"
                        onClick={() => setPlays(n => n + 1)}
                        className="absolute left-3 top-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-background/90 px-3 text-xs font-semibold shadow-lifted backdrop-blur transition-transform active:scale-95"
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Odtwórz trasę
                    </button>
                )}
            </div>
            {paces.length > 1 && (
                <div className="flex items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatPaceSec(Math.max(...paces))}/km</span>
                    <div
                        className="h-2 flex-1 rounded-full"
                        style={{ background: `linear-gradient(90deg, ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(paceColor).join(', ')})` }}
                    />
                    <span className="tabular-nums">{formatPaceSec(Math.min(...paces))}/km</span>
                </div>
            )}
        </div>
    );
}
