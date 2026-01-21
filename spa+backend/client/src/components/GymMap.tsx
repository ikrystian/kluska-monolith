'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import type { Gym } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, MapPin } from 'lucide-react';

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem',
};

const defaultCenter = {
    lat: 52.237049,
    lng: 21.017532, // Center of Warsaw
};

const mapOptions = {
    styles: [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
        },
        {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
        },
        {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }],
        },
        {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }],
        },
        {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }],
        },
        {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }],
        },
        {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }],
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }],
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1f2835' }],
        },
        {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f3d19c' }],
        },
        {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2f3948' }],
        },
        {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
        },
        {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }],
        },
        {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#515c6d' }],
        },
        {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#17263c' }],
        },
    ],
    disableDefaultUI: true,
    zoomControl: true,
};

export default function GymMap() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey || '',
    });

    const [gyms, setGyms] = useState<Gym[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGym, setSelectedGym] = useState<Gym | null>(null);

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

    // Helper to get coordinates. 
    // If gym has location, use it. 
    // If not, we might need to geocode, but for now let's filter out those without location or handle them gracefully.
    // Ideally, the backend/admin should ensure location is present.
    // For this component, we will only show markers for gyms with valid location.
    // Or we could implement client-side geocoding like the original file did, but that consumes API quota.
    // Let's stick to using stored location for now, as per the "gyms added by administrator" requirement which implies a controlled dataset.
    // However, to be safe and robust, if we really want to support address-only gyms, we can add geocoding back.
    // Given the previous code had geocoding, I will re-implement it to be safe, but only for gyms missing location.

    const [geocodedGyms, setGeocodedGyms] = useState<(Gym & { lat: number; lng: number })[]>([]);

    useEffect(() => {
        if (isLoaded && gyms.length > 0) {
            const processGyms = async () => {
                const processed: (Gym & { lat: number; lng: number })[] = [];
                const geocoder = new window.google.maps.Geocoder();

                for (const gym of gyms) {
                    if (gym.location && gym.location.lat && gym.location.lng) {
                        processed.push({ ...gym, lat: gym.location.lat, lng: gym.location.lng });
                    } else {
                        // Geocode if location is missing
                        try {
                            const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
                                geocoder.geocode({ address: gym.address }, (results, status) => {
                                    if (status === 'OK' && results && results[0]) {
                                        resolve(results[0]);
                                    } else {
                                        resolve(null);
                                    }
                                });
                            });

                            if (result) {
                                processed.push({
                                    ...gym,
                                    lat: result.geometry.location.lat(),
                                    lng: result.geometry.location.lng(),
                                });
                            }
                        } catch (e) {
                            console.error(`Geocoding failed for ${gym.name}`, e);
                        }
                    }
                }
                setGeocodedGyms(processed);
            };

            processGyms();
        }
    }, [gyms, isLoaded]);


    if (!apiKey) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Błąd Konfiguracji Mapy</AlertTitle>
                    <AlertDescription>
                        Klucz API Google Maps nie został skonfigurowany. Proszę dodać go do pliku .env jako NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Błąd Ładowania Mapy</AlertTitle>
                    <AlertDescription>
                        Nie udało się załadować skryptów Google Maps. Sprawdź swój klucz API i upewnij się, że jest poprawny oraz że masz włączone odpowiednie API w Google Cloud Console.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <Card className="h-full w-full border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="font-headline">Mapa Siłowni</CardTitle>
                <CardDescription>
                    Znajdź siłownie w swojej okolicy. Kliknij na znacznik, aby zobaczyć szczegóły.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[600px] w-full px-0 pb-0">
                {!isLoaded || loading ? (
                    <Skeleton className="h-full w-full rounded-lg" />
                ) : (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={defaultCenter}
                        zoom={6}
                        options={mapOptions}
                    >
                        {geocodedGyms.map((gym) => (
                            <MarkerF
                                key={gym.id}
                                position={{ lat: gym.lat, lng: gym.lng }}
                                onClick={() => setSelectedGym(gym)}
                            />
                        ))}

                        {selectedGym && (
                            <InfoWindowF
                                position={{ lat: (selectedGym as any).lat, lng: (selectedGym as any).lng }}
                                onCloseClick={() => setSelectedGym(null)}
                            >
                                <div className="p-2 max-w-xs">
                                    <h3 className="font-bold text-lg">{selectedGym.name}</h3>
                                    <p className="text-sm flex items-start gap-1">
                                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                        {selectedGym.address}
                                    </p>
                                    {selectedGym.rating && (
                                        <p className="text-xs text-yellow-600 mt-1">Ocena: {selectedGym.rating}/5</p>
                                    )}
                                </div>
                            </InfoWindowF>
                        )}
                    </GoogleMap>
                )}
            </CardContent>
        </Card>
    );
}
