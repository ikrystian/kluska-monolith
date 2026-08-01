import { useSyncExternalStore } from 'react';
import { getPendingCount, subscribeToOfflineQueue } from '@/lib/offline-queue';

/** Number of writes waiting to reach the server. See lib/offline-queue. */
export function usePendingMutations(): number {
  return useSyncExternalStore(subscribeToOfflineQueue, getPendingCount, () => 0);
}
