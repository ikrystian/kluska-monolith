'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Gym } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Phone, Globe, Star } from 'lucide-react';

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

function GymFavorites({ gymId }: { gymId: string }) {
    const [favorites, setFavorites] = useState<{ _id: string; name: string; avatarUrl?: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                const response = await fetch(`/api/gyms/${gymId}/favorites`);
                if (response.ok) {
                    const data = await response.json();
                    setFavorites(data);
                }
            } catch (error) {
                console.error('Error fetching favorites:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [gymId]);

    if (loading) return <div className="h-6 w-20 animate-pulse bg-muted rounded" />;
    if (favorites.length === 0) return null;

    return (
        <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Trenują tutaj:</p>
            <div className="flex -space-x-2 overflow-hidden">
                {favorites.map((user) => (
                    <div key={user._id} className="inline-block h-6 w-6 rounded-full ring-2 ring-white" title={user.name}>
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="h-full w-full rounded-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

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
                                    <div className="p-1 max-w-xs space-y-2">
                                        <div>
                                            <h3 className="font-bold text-base mb-0.5 leading-tight">{gym.name}</h3>
                                            <p className="text-sm flex items-start gap-1 text-muted-foreground">
                                                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                                <span>{gym.address}</span>
                                            </p>
                                        </div>

                                        {gym.rating ? (
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                <span className="font-semibold">{gym.rating}</span>
                                                {gym.ratingCount && (
                                                    <span className="text-muted-foreground">({gym.ratingCount})</span>
                                                )}
                                            </div>
                                        ) : null}

                                        {(gym.phoneNumber || gym.website) && (
                                            <div className="space-y-1 pt-1 border-t">
                                                {gym.phoneNumber && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span>{gym.phoneNumber}</span>
                                                    </div>
                                                )}
                                                {gym.website && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <a
                                                            href={gym.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline truncate"
                                                        >
                                                            Strona www
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <GymFavorites gymId={gym._id || gym.id} />
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
