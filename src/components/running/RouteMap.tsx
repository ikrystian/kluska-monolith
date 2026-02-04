'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import * as polyline from 'polyline-encoded';
import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
    polyline: string;
    className?: string;
}

export function RouteMap({ polyline: encodedPolyline, className = '' }: RouteMapProps) {
    useEffect(() => {
        // Decode polyline to lat/lng coordinates
        const decoded = polyline.decode(encodedPolyline);

        if (!decoded || decoded.length === 0) return;

        // Convert to Leaflet LatLng format
        const coordinates = decoded.map(([lat, lng]: [number, number]) => L.latLng(lat, lng));

        // Create map
        const map = L.map('route-map', {
            zoomControl: true,
            scrollWheelZoom: false,
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        // Create polyline
        const route = L.polyline(coordinates, {
            color: '#FC4C02',
            weight: 4,
            opacity: 0.8,
        }).addTo(map);

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
    }, [encodedPolyline]);

    return (
        <div
            id="route-map"
            className={`w-full h-[400px] rounded-lg overflow-hidden ${className}`}
        />
    );
}
