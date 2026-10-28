'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import * as polyline from 'polyline-encoded';
import 'leaflet/dist/leaflet.css';
import { formatPaceSec, paceColor, type KmSegment } from '@/lib/run-pace';

interface RouteMapProps {
    polyline: string;
    /** Per-kilometre pieces coloured by pace; without them the route is drawn in one colour. */
    segments?: KmSegment[];
    className?: string;
}

export function RouteMap({ polyline: encodedPolyline, segments, className = '' }: RouteMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Decode polyline to lat/lng coordinates
        const decoded = polyline.decode(encodedPolyline);

        if (!decoded || decoded.length === 0) return;

        // Convert to Leaflet LatLng format
        const coordinates = decoded.map(([lat, lng]: [number, number]) => L.latLng(lat, lng));

        // Create map
        const map = L.map(containerRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        const hasSegments = !!segments && segments.length > 0;

        // Create polyline — a white casing under the pace colours keeps them readable on any tiles
        const route = L.polyline(coordinates, hasSegments
            ? { color: '#ffffff', weight: 8, opacity: 0.9 }
            : { color: '#FC4C02', weight: 4, opacity: 0.8 }
        ).addTo(map);

        if (hasSegments) {
            segments.forEach((segment) => {
                L.polyline(segment.coords, {
                    color: segment.color,
                    weight: 5,
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                })
                    .bindTooltip(`Km ${segment.km} · ${formatPaceSec(segment.paceSecPerKm)}/km`, { sticky: true })
                    .addTo(map);
            });

            // Kilometre markers at the end of every full kilometre
            segments.slice(0, -1).forEach((segment) => {
                L.marker(segment.coords[segment.coords.length - 1], {
                    interactive: false,
                    icon: L.divIcon({
                        className: 'km-marker',
                        html: `<div style="display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid ${segment.color};color:#111;font:700 10px/1 system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.35)">${segment.km}</div>`,
                        iconSize: [20, 20],
                    }),
                }).addTo(map);
            });
        }

        // Add start marker
        if (coordinates[0]) {
            L.marker(coordinates[0], {
                icon: L.divIcon({
                    className: 'start-marker',
                    html: '<div style="background: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [12, 12],
                }),
            }).addTo(map);
        }

        // Add end marker
        if (coordinates[coordinates.length - 1]) {
            L.marker(coordinates[coordinates.length - 1], {
                icon: L.divIcon({
                    className: 'end-marker',
                    html: '<div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [12, 12],
                }),
            }).addTo(map);
        }

        // Fit bounds to show entire route
        map.fitBounds(route.getBounds(), { padding: [20, 20] });

        // Cleanup
        return () => {
            map.remove();
        };
    }, [encodedPolyline, segments]);

    const paces = segments?.map((s) => s.paceSecPerKm).filter((p) => p > 0) ?? [];

    return (
        <div>
            <div
                ref={containerRef}
                className={`w-full h-[400px] overflow-hidden ${className}`}
            />
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
