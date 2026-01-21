import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';

export default function MapPage() {
  return (
    <div className="container mx-auto p-4 md:p-8 h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
          <MapPin className="h-8 w-8 text-primary" />
          Mapa Siłowni
        </h1>
        <p className="text-muted-foreground">Znajdź najlepsze miejsca do treningu w Twojej okolicy.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 relative bg-muted/30 flex items-center justify-center flex-col text-center">
          {/* Placeholder for actual map integration (Google Maps / Leaflet) */}
          <div className="bg-muted absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          </div>

          <div className="z-10 bg-background/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border max-w-md mx-4">
            <Navigation className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Mapa w budowie</h3>
            <p className="text-muted-foreground mb-4">
              Integrujemy system map, abyś mógł łatwo znaleźć partnerskie siłownie, trenerów i parki do kalisteniki w Twojej okolicy.
            </p>
            <div className="text-xs text-muted-foreground border-t pt-4">
              W przyszłych aktualizacjach:
              <ul className="mt-2 space-y-1">
                <li>• Lokalizacja GPS</li>
                <li>• Filtrowanie po wyposażeniu</li>
                <li>• Opinie i oceny</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
