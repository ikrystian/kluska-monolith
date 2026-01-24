'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Gym } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

// Fix for default marker icon in Leaflet with Next.js/React
// See: https://github.com/PaulLeCam/react-leaflet/issues/453
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const center: [number, number] = [52.237049, 21.017532]; // Center of Warsaw

export default function GymMap() {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [loading, setLoading] = useState(true);
    const [geocodedGyms, setGeocodedGyms] = useState<(Gym & { lat: number; lng: number })[]>([]);

    const fetchGyms = useCallback(async () => {
        try {
            const response = await fetch('/api/gyms');
            if (response.ok) {
                const data = await response.json();
                setGyms(data);
            } else {
                console.error('Failed to fetch gyms');
            }
        } catch (error) {
            console.error('Error fetching gyms:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGyms();
    }, [fetchGyms]);

    useEffect(() => {
        if (gyms.length > 0) {
            const processGyms = async () => {
                const processed: (Gym & { lat: number; lng: number })[] = [];

                // Use Promise.all to fetch concurrently but be mindful of rate limits if many gyms
                // Nominatim has a usage policy of 1 request per second.
                // We should process sequentially to respect this.
                for (const gym of gyms) {
                    if (gym.location && gym.location.lat && gym.location.lng) {
                        processed.push({ ...gym, lat: gym.location.lat, lng: gym.location.lng });
                    } else if (gym.address) {
                        // Geocode using Nominatim
                        try {
                            const response = await fetch(
                                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                                    gym.address
                                )}&format=json&limit=1`
                            );
                            const data = await response.json();
                            if (data && data[0]) {
                                processed.push({
                                    ...gym,
                                    lat: parseFloat(data[0].lat),
                                    lng: parseFloat(data[0].lon),
                                });
                            }
                            // Respect Nominatim rate limit (1s delay)
                            await new Promise((resolve) => setTimeout(resolve, 1000));
                        } catch (e) {
                            console.error(`Geocoding failed for ${gym.address}`, e);
                        }
                    }
                }
                setGeocodedGyms(processed);
            };

            processGyms();
        }
    }, [gyms]);

    return (
        <Card className="h-full w-full border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="font-headline">Mapa Siłowni</CardTitle>
                <CardDescription>
                    Znajdź siłownie w swojej okolicy. Kliknij na znacznik, aby zobaczyć szczegóły.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[600px] w-full px-0 pb-0 z-0">
                {loading ? (
                    <Skeleton className="h-full w-full rounded-lg" />
                ) : (
                    <MapContainer
                        center={center}
                        zoom={6}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', borderRadius: '0.5rem', zIndex: 0 }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {geocodedGyms.map((gym) => (
                            <Marker key={gym._id || gym.id} position={[gym.lat, gym.lng]}>
                                <Popup>
                                    <div className="p-1 max-w-xs">
                                        <h3 className="font-bold text-base mb-1">{gym.name}</h3>
                                        <p className="text-sm flex items-start gap-1">
                                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                            {gym.address}
                                        </p>
                                        {gym.rating && (
                                            <p className="text-xs text-yellow-600 mt-1 font-medium">
                                                Ocena: {gym.rating}/5
                                            </p>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                )}
            </CardContent>
        </Card>
    );
}
