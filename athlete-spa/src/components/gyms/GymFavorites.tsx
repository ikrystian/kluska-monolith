import useSWR from 'swr';
import { resolveMediaUrl } from '@/lib/api-client';
import { jsonFetcher } from '@/lib/db-hooks';

/** Avatars of athletes who listed this gym among their favourites. */
export function GymFavorites({ gymId }: { gymId: string }) {
  const { data, isLoading } = useSWR<{ _id: string; name: string; avatarUrl?: string }[]>(
    gymId ? `/api/gyms/${gymId}/favorites` : null,
    jsonFetcher
  );
  const favorites = data ?? [];

  if (isLoading) return <div className="h-6 w-20 animate-pulse rounded bg-muted" />;
  if (favorites.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Trenują tutaj</p>
      <div className="flex -space-x-2 overflow-hidden">
        {favorites.slice(0, 8).map(user => (
          <div key={user._id} className="inline-block h-7 w-7 rounded-full ring-2 ring-card" title={user.name}>
            {user.avatarUrl ? (
              <img src={resolveMediaUrl(user.avatarUrl)} alt={user.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {favorites.length > 8 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[10px] font-bold ring-2 ring-card">
            +{favorites.length - 8}
          </div>
        )}
      </div>
    </div>
  );
}
