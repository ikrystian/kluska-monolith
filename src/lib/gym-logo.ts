import { createHash } from 'crypto';
import dns from 'dns/promises';
import { mkdir, readdir, writeFile } from 'fs/promises';
import net from 'net';
import path from 'path';

/**
 * Logo siłowni.
 *
 * Serper (Google Maps) nie zwraca żadnego obrazka, więc logo bierzemy ze strony
 * www siłowni: ikona aplikacji (`apple-touch-icon`), a w ostateczności ikona
 * strony. Plik trafia do `upload-data/` (jak media ćwiczeń), a w bazie ląduje
 * ścieżka `/upload-data/...` — bez linkowania do cudzych serwerów.
 *
 * Adresy pochodzą z danych zewnętrznych, więc pobieranie jest ograniczone:
 * tylko publiczne adresy IP (także po przekierowaniach), limity czasu i
 * rozmiaru, a pliki są rozpoznawane po zawartości (nie po nagłówkach). SVG jest
 * pomijany — serwowany z naszej domeny mógłby wykonać skrypt.
 */

const UPLOAD_DIR = path.join(process.cwd(), 'upload-data');
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 4;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
/** Tyle ikon próbujemy na stronę, zanim damy za wygraną. */
const MAX_ICON_ATTEMPTS = 4;
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);
const USER_AGENT = 'Mozilla/5.0 (compatible; LeniwaKluskaBot/1.0)';

/** Profile społecznościowe i agregatory: ich ikona to logo serwisu, nie siłowni. */
const NOT_A_GYM_SITE = [
  'facebook.com', 'fb.com', 'fb.me', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com', 'youtu.be', 'linktr.ee', 'google.com', 'goo.gl', 'booksy.com',
  'olx.pl', 'pinterest.com',
];

type ImageKind = 'png' | 'jpg' | 'gif' | 'webp' | 'ico';

/* ---------- Bezpieczne pobieranie ---------- */

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) {
    const dotted = v6.slice(7);
    return net.isIPv4(dotted) ? isPrivateIPv4(dotted) : true;
  }
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || /^fe[89ab]/.test(v6);
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`unsupported protocol ${url.protocol}`);
  if (!ALLOWED_PORTS.has(url.port)) throw new Error(`blocked port ${url.port}`);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map(a => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new Error(`blocked address for ${host}`);
}

async function readCapped(res: Response, maxBytes: number, truncate: boolean): Promise<Buffer> {
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      if (truncate) break;
      throw new Error('response too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** GET z ręcznym śledzeniem przekierowań: każdy przeskok też musi wskazywać publiczny adres. */
async function fetchLimited(start: URL, accept: string, maxBytes: number, truncate = false): Promise<{ url: URL; body: Buffer }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: accept },
      });
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel();
        url = new URL(location, url);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { url, body: await readCapped(res, maxBytes, truncate) };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('too many redirects');
}

/* ---------- Szukanie ikony na stronie ---------- */

/** Rozpoznaje rastrowy obraz po pierwszych bajtach. */
function sniffImage(b: Buffer): ImageKind | null {
  if (b.length < 16) return null;
  if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'gif';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'ico';
  return null;
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

/** Największy bok z `sizes="32x32 16x16"`; 0, gdy nie podano (albo `any`). */
function largestSize(sizes: string | undefined): number {
  if (!sizes) return 0;
  return Math.max(0, ...[...sizes.matchAll(/(\d+)x(\d+)/gi)].map(m => Math.max(Number(m[1]), Number(m[2]))));
}

/** Adresy ikon z `<head>`, najlepsze pierwsze: ikony aplikacji, potem ikony strony, od największej. */
function iconCandidates(html: string, base: URL): string[] {
  const found: { href: string; rank: number; size: number }[] = [];

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = parseAttributes(tag);
    const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/);
    const isApple = rel.some(r => r.startsWith('apple-touch-icon'));
    const isIcon = rel.includes('icon');
    if (!attrs.href || (!isApple && !isIcon)) continue;
    if (/svg/i.test(attrs.type ?? '') || /\.svg(\?|$)/i.test(attrs.href)) continue;

    try {
      found.push({ href: new URL(attrs.href, base).href, rank: isApple ? 0 : 1, size: largestSize(attrs.sizes) });
    } catch {
      // Nieprawidłowy href — pomijamy.
    }
  }

  found.sort((a, b) => a.rank - b.rank || b.size - a.size);

  // Konwencjonalne ścieżki, gdy strona nic nie deklaruje.
  const fallbacks = [new URL('/apple-touch-icon.png', base).href, new URL('/favicon.ico', base).href];
  return [...new Set([...found.map(f => f.href), ...fallbacks])];
}

/* ---------- Zapis ---------- */

const hostOf = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '');

function parseWebsite(website: string | null | undefined): URL | null {
  const raw = website?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = hostOf(url);
    if (NOT_A_GYM_SITE.some(site => host === site || host.endsWith(`.${site}`))) return null;
    return url;
  } catch {
    return null;
  }
}

/** Plik wspólny dla całej domeny: sieć klubów ma jedno logo, pobierane raz. */
async function existingLogo(stem: string): Promise<string | null> {
  try {
    const file = (await readdir(UPLOAD_DIR)).find(name => name.startsWith(`${stem}.`));
    return file ? `/upload-data/${file}` : null;
  } catch {
    return null;
  }
}

async function downloadLogo(site: URL, stem: string): Promise<string | null> {
  const cached = await existingLogo(stem);
  if (cached) return cached;

  const page = await fetchLimited(site, 'text/html,application/xhtml+xml', MAX_HTML_BYTES, true).catch(() => null);
  const candidates = iconCandidates(page?.body.toString('utf8') ?? '', page?.url ?? site);

  for (const href of candidates.slice(0, MAX_ICON_ATTEMPTS)) {
    try {
      const { body } = await fetchLimited(new URL(href), 'image/*', MAX_LOGO_BYTES);
      const kind = sniffImage(body);
      if (!kind) continue;
      await mkdir(UPLOAD_DIR, { recursive: true });
      const filename = `${stem}.${kind}`;
      await writeFile(path.join(UPLOAD_DIR, filename), body);
      return `/upload-data/${filename}`;
    } catch {
      // Ta ikona się nie udała — próbujemy następną.
    }
  }
  return null;
}

/**
 * Zwraca funkcję szukającą logo po adresie strony. Wywołania dla tej samej
 * domeny w obrębie jednego resolvera dzielą wynik (np. wiele klubów jednej
 * sieci przy imporcie). Nigdy nie odrzuca — gdy logo nie da się ustalić,
 * zwraca `null`.
 */
export function createGymLogoResolver() {
  const byHost = new Map<string, Promise<string | null>>();

  return (website: string | null | undefined): Promise<string | null> => {
    const site = parseWebsite(website);
    if (!site) return Promise.resolve(null);

    const host = hostOf(site);
    let result = byHost.get(host);
    if (!result) {
      const stem = `gym-logo-${createHash('sha1').update(host).digest('hex').slice(0, 12)}`;
      result = downloadLogo(site, stem).catch(error => {
        console.error(`gym logo ${host} -> ${error instanceof Error ? error.message : error}`);
        return null;
      });
      byHost.set(host, result);
    }
    return result;
  };
}

/** Jednorazowe wyszukanie logo (np. dla pojedynczej siłowni w panelu). */
export const resolveGymLogo = (website: string | null | undefined) => createGymLogoResolver()(website);
