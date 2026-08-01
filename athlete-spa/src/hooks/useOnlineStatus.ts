import { useSyncExternalStore } from 'react';
import {
  getNetworkStatusServerSnapshot,
  getNetworkStatusSnapshot,
  subscribeToNetworkStatus,
} from '@/lib/network-status';

/** True while the app can reach the backend. See lib/network-status. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToNetworkStatus,
    getNetworkStatusSnapshot,
    getNetworkStatusServerSnapshot
  );
}
