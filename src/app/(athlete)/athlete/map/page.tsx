'use client';

import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import type { Gym } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, MapPin } from 'lucide-react';

type GymWithCoords = Gym & {
  lat: number;
  lng: number;
};

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const center = {
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
}

export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
  });

  const gyms: Gym[] = [];
  const gymsLoading = false;

  const [geocodedGyms, setGeocodedGyms] = useState<GymWithCoords[]>([]);
  const [geocodingLoading, setGeocodingLoading] = useState(false); // Set to false initially since we have no gyms
  const [selectedGym, setSelectedGym] = useState<GymWithCoords | null>(null);

  useEffect(() => {
    if (gyms && isLoaded) {
      setGeocodingLoading(true);
      const geocoder = new window.google.maps.Geocoder();
      const promises = gyms.map((gym) =>
        new Promise<GymWithCoords | null>((resolve) => {
          geocoder.geocode({ address: gym.address }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve({
                ...gym,
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng(),
              });
            } else {
              console.error(`Geocode was not successful for the following reason: ${status}`);
              resolve(null);
            }
          });
        })
      );

      Promise.all(promises).then((results) => {
        setGeocodedGyms(results.filter((g): g is GymWithCoords => g !== null));
        setGeocodingLoading(false);
      });
    }
  }, [gyms, isLoaded]);

  const isLoading = gymsLoading || geocodingLoading;

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
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Mapa Siłowni</CardTitle>
          <CardDescription>
            Znajdź siłownie w swojej okolicy. Kliknij na znacznik, aby zobaczyć szczegóły.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[600px] w-full">
          {!isLoaded || isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
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
                  position={{ lat: selectedGym.lat, lng: selectedGym.lng }}
                  onCloseClick={() => setSelectedGym(null)}
                >
                  <div className="p-2 max-w-xs">
                    <h3 className="font-bold text-lg">{selectedGym.name}</h3>
                    <p className="text-sm flex items-start gap-1"><MapPin className="h-4 w-4 mt-0.5 shrink-0" />{selectedGym.address}</p>
                  </div>
                </InfoWindowF>
              )}
            </GoogleMap>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
