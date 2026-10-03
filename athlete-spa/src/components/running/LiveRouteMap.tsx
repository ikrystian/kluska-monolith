import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TrackPoint } from '@/hooks/useRunTracker';

interface LiveRouteMapProps {
  points: TrackPoint[];
  className?: string;
}

/**
 * Draws the run in progress on an OpenStreetMap tile layer, extending the
 * route and re-centering as new GPS fixes arrive.
 *
 * The after-the-fact counterpart (for a saved run's polyline) is RouteMap.tsx;
 * this one is fed the raw, growing point list directly instead of an encoded
 * polyline, since re-encoding on every tick would be wasted work.
 */
export function LiveRouteMap({ points, className = '' }: LiveRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false });
    map.setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      routeRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    const latLngs = points.map(p => L.latLng(p.lat, p.lng));
    const last = latLngs[latLngs.length - 1];

    if (!routeRef.current) {
      routeRef.current = L.polyline(latLngs, { color: '#FC4C02', weight: 4, opacity: 0.85 }).addTo(map);
    } else {
      routeRef.current.setLatLngs(latLngs);
    }

    if (!markerRef.current) {
      markerRef.current = L.marker(last, {
        icon: L.divIcon({
          className: '',
          html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.25)"></div>',
          iconSize: [14, 14],
        }),
      }).addTo(map);
    } else {
      markerRef.current.setLatLng(last);
    }

    map.setView(last, Math.max(map.getZoom(), 16), { animate: true });
  }, [points]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}
