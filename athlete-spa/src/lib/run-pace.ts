import { haversine, type GeoPoint } from '@/lib/geo';

/* ---------- Formatting ---------- */

/** Formats seconds-per-km as `m:ss`. */
export function formatPaceSec(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '–';
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Parses `m:ss` (or plain minutes) into seconds-per-km; `null` when invalid. */
export function parsePaceSec(input: string): number | null {
  const match = input.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = match[2] ? Number(match[2]) : 0;
  if (seconds >= 60) return null;
  const total = minutes * 60 + seconds;
  return total > 0 ? total : null;
}

/* ---------- Colour scale ---------- */

/** Slow → fast: blue, cyan, green, amber, orange, red. Readable on light map tiles. */
const PACE_STOPS = ['#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#ea580c', '#dc2626'];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Colour for `t` in [0, 1], where 0 is the slowest and 1 the fastest pace. */
export function paceColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0.5));
  const scaled = clamped * (PACE_STOPS.length - 1);
  const i = Math.min(Math.floor(scaled), PACE_STOPS.length - 2);
  const f = scaled - i;
  const a = hexToRgb(PACE_STOPS[i]);
  const b = hexToRgb(PACE_STOPS[i + 1]);
  const mix = a.map((c, k) => Math.round(c + (b[k] - c) * f));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

/* ---------- Per-kilometre route segments ---------- */

export type LatLngTuple = [number, number];

export interface KmSegment {
  /** 1-based kilometre number. */
  km: number;
  coords: LatLngTuple[];
  paceSecPerKm: number;
  color: string;
}

/** Cumulative along-track distance in metres for each coordinate. */
export function cumulativeDistances(coords: LatLngTuple[]): number[] {
  const out = [0];
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lng1] = coords[i - 1];
    const [lat2, lng2] = coords[i];
    out.push(out[i - 1] + haversine({ lat: lat1, lng: lng1, at: 0 }, { lat: lat2, lng: lng2, at: 0 }));
  }
  return out;
}

/**
 * Cuts a route into per-kilometre pieces and colours each one by its pace
 * relative to the rest of the run (Strava-style: slowest blue, fastest red).
 *
 * `cumDistM` must be aligned 1:1 with `coords`. `splitPaces` holds one pace
 * (s/km) per split, in order; the last split absorbs whatever route is left.
 */
export function buildKmSegments(coords: LatLngTuple[], cumDistM: number[], splitPaces: number[]): KmSegment[] {
  if (coords.length < 2 || splitPaces.length === 0) return [];

  const valid = splitPaces.filter(p => Number.isFinite(p) && p > 0);
  const fastest = Math.min(...valid);
  const slowest = Math.max(...valid);
  const spread = slowest - fastest;

  const segments: KmSegment[] = [];
  let i = 0;
  splitPaces.forEach((pace, idx) => {
    const isLast = idx === splitPaces.length - 1;
    const endM = (idx + 1) * 1000;
    // Start from the previous segment's last point so the line stays continuous.
    const piece: LatLngTuple[] = i > 0 ? [coords[i - 1]] : [];
    while (i < coords.length && (isLast || cumDistM[i] <= endM)) {
      piece.push(coords[i]);
      i++;
    }
    if (piece.length < 2) return;
    segments.push({
      km: idx + 1,
      coords: piece,
      paceSecPerKm: pace,
      color: paceColor(spread > 0 ? (slowest - pace) / spread : 0.5),
    });
  });
  return segments;
}

/* ---------- Pace zones ---------- */

export interface PaceZone {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Zone covers paces in [minFactor·T, maxFactor·T) s/km, T = threshold pace; `null` is open-ended. */
  minFactor: number | null;
  maxFactor: number | null;
}

/** Zones as multiples of threshold pace, slowest first. */
export const PACE_ZONES: PaceZone[] = [
  {
    id: 'recovery',
    name: 'Regeneracja',
    description:
      'Bardzo lekki bieg. Zwykle przed lub po ciężkim treningu. W tym tempie truchta się też w przerwach między mocniejszymi odcinkami.',
    color: paceColor(0),
    minFactor: 1.29,
    maxFactor: null,
  },
  {
    id: 'endurance',
    name: 'Wytrzymałość',
    description:
      'Komfortowy bieg, tzw. tempo konwersacyjne. Zwykle stanowi większość kilometrów biegacza.',
    color: paceColor(0.2),
    minFactor: 1.14,
    maxFactor: 1.29,
  },
  {
    id: 'tempo',
    name: 'Tempo',
    description: 'Intensywność zbliżona do tempa maratońskiego lub żwawego biegu.',
    color: paceColor(0.4),
    minFactor: 1.06,
    maxFactor: 1.14,
  },
  {
    id: 'threshold',
    name: 'Próg',
    description:
      'Tempo do utrzymania przez ok. 60 minut z pewnym trudem. Biegane ciągle lub w dłuższych interwałach.',
    color: paceColor(0.6),
    minFactor: 0.99,
    maxFactor: 1.06,
  },
  {
    id: 'vo2max',
    name: 'VO2 Max',
    description:
      'Tempo, przy którym osiągasz maksymalny pobór tlenu. Ze względu na intensywność zwykle biegane w interwałach.',
    color: paceColor(0.8),
    minFactor: 0.9,
    maxFactor: 0.99,
  },
  {
    id: 'anaerobic',
    name: 'Beztlenowa',
    description: 'Ekstremalnie mocne tempo — krótkie interwały lub dłuższe próby na czas.',
    color: paceColor(1),
    minFactor: null,
    maxFactor: 0.9,
  },
];

export function zoneIndexForPace(paceSecPerKm: number, thresholdSecPerKm: number): number {
  const factor = paceSecPerKm / thresholdSecPerKm;
  const idx = PACE_ZONES.findIndex(z => z.minFactor === null || factor >= z.minFactor);
  return idx === -1 ? PACE_ZONES.length - 1 : idx;
}

/** Human-readable pace range of a zone, e.g. `5:18–5:42`. */
export function zoneRangeLabel(zone: PaceZone, thresholdSecPerKm: number): string {
  const slow = zone.maxFactor !== null ? formatPaceSec(zone.maxFactor * thresholdSecPerKm) : null;
  const fast = zone.minFactor !== null ? formatPaceSec(zone.minFactor * thresholdSecPerKm) : null;
  if (slow && fast) return `${fast}–${slow}`;
  if (fast) return `> ${fast}`;
  return `< ${slow}`;
}

/* ---------- Pace samples & distribution ---------- */

export interface PaceSample {
  durationS: number;
  speedMs: number;
}

/** Below this speed (≈ 20:50/km) the runner is treated as stopped. */
const MIN_MOVING_SPEED = 0.8;
/** GPS fixes are merged into chunks of at least this long to tame jitter. */
const SAMPLE_WINDOW_S = 10;

/** Moving-time pace samples from our own recorded GPS points. */
export function samplesFromPoints(points: GeoPoint[]): PaceSample[] {
  const samples: PaceSample[] = [];
  let dist = 0;
  let time = 0;
  for (let i = 1; i < points.length; i++) {
    const dt = (points[i].at - points[i - 1].at) / 1000;
    if (dt <= 0) continue;
    dist += haversine(points[i - 1], points[i]);
    time += dt;
    if (time >= SAMPLE_WINDOW_S) {
      const speed = dist / time;
      if (speed >= MIN_MOVING_SPEED) samples.push({ durationS: time, speedMs: speed });
      dist = 0;
      time = 0;
    }
  }
  return samples;
}

/** Moving-time pace samples from Strava `time` / `velocity_smooth` / `moving` streams. */
export function samplesFromStreams(time: number[], velocity: number[], moving?: boolean[]): PaceSample[] {
  const samples: PaceSample[] = [];
  for (let i = 1; i < time.length && i < velocity.length; i++) {
    const dt = time[i] - time[i - 1];
    if (dt <= 0 || moving?.[i] === false || velocity[i] < MIN_MOVING_SPEED) continue;
    samples.push({ durationS: dt, speedMs: velocity[i] });
  }
  return samples;
}

export interface ZoneBucket {
  zone: PaceZone;
  seconds: number;
  pct: number;
}

export function paceDistribution(samples: PaceSample[], thresholdSecPerKm: number): ZoneBucket[] {
  const seconds = PACE_ZONES.map(() => 0);
  for (const s of samples) {
    seconds[zoneIndexForPace(1000 / s.speedMs, thresholdSecPerKm)] += s.durationS;
  }
  const total = seconds.reduce((a, b) => a + b, 0);
  return PACE_ZONES.map((zone, i) => ({ zone, seconds: seconds[i], pct: total > 0 ? (seconds[i] / total) * 100 : 0 }));
}
