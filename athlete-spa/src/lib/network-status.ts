/**
 * Connectivity state for the app.
 *
 * `navigator.onLine` alone is not enough: it reports true for a phone attached
 * to a gym's captive-portal wifi that routes nowhere, which is exactly the
 * situation this needs to catch. So the browser's flag is combined with
 * evidence from actual API calls — a request that fails to reach the network
 * marks the app offline, and the next success clears it.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

let browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
let reachable = true;

function snapshot(): boolean {
  return browserOnline && reachable;
}

let lastSnapshot = snapshot();

function emit() {
  const next = snapshot();
  if (next === lastSnapshot) return;
  lastSnapshot = next;
  for (const listener of listeners) listener();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    browserOnline = true;
    // The radio is back, but whether requests actually land is unproven until
    // one succeeds; assume reachable and let a failure correct it.
    reachable = true;
    emit();
  });
  window.addEventListener('offline', () => {
    browserOnline = false;
    emit();
  });
}

/** Called by apiFetch when a request never reached the server. */
export function reportNetworkFailure(): void {
  reachable = false;
  emit();
}

/** Called by apiFetch when a request completed, whatever the status code. */
export function reportNetworkSuccess(): void {
  reachable = true;
  emit();
}

export function subscribeToNetworkStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNetworkStatusSnapshot(): boolean {
  return lastSnapshot;
}

/** Server rendering has no network state to speak of; assume online. */
export function getNetworkStatusServerSnapshot(): boolean {
  return true;
}
