import { MapPinOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Stands in for a run map when no Mapbox token is configured. */
export function MapUnavailable({ className }: { className?: string }) {
  return (
    <div className={cn('grid place-items-center bg-secondary/40 p-6 text-center', className)}>
      <div className="max-w-xs">
        <MapPinOff className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-semibold">Mapa nie jest skonfigurowana</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Dodaj publiczny token Mapbox jako <code className="rounded bg-secondary px-1 py-0.5">VITE_MAPBOX_TOKEN</code> w
          pliku <code className="rounded bg-secondary px-1 py-0.5">athlete-spa/.env</code>.
        </p>
      </div>
    </div>
  );
}
