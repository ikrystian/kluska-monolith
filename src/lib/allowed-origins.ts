/**
 * Origins the athlete SPA may be served from. Shared by the CORS proxy and by
 * the OAuth callbacks, which only send the browser back to one of these.
 */
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (origin === 'capacitor://localhost' || origin.startsWith('capacitor://')) return true;
  if (origin.startsWith('http://localhost') || origin.startsWith('https://localhost')) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipPattern);
    if (match) {
      const [, p1, p2] = match;
      const o1 = parseInt(p1, 10);
      const o2 = parseInt(p2, 10);
      if (o1 === 127 || o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168)) {
        return true;
      }
    }
  } catch {
    // If URL parsing fails, ignore
  }

  return false;
}
