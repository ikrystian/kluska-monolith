export interface GeoPoint {
  lat: number;
  lng: number;
  /** Epoch ms when the fix was taken. */
  at: number;
  /** Altitude in metres, when the device/provider reports one. */
  alt?: number | null;
}

/** Great-circle distance in metres. */
export function haversine(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Samples averaged into each smoothed altitude reading. */
const ALTITUDE_SMOOTHING_WINDOW = 5;
/** Deltas smaller than this between smoothed readings are leftover jitter, not a real climb. */
const MIN_CLIMB_M = 0.3;

/**
 * Trailing moving average over each point's altitude, aligned 1:1 with
 * `points`. Phone-GPS altitude jitters by several metres fix-to-fix, so a
 * gradual real climb and pure noise look identical one step at a time —
 * smoothing first (then summing small positive deltas) catches the former
 * without the latter, unlike thresholding each raw consecutive delta, which
 * would also throw away a genuine climb spread thinly across many fixes.
 */
function smoothAltitudes(points: GeoPoint[]): (number | null)[] {
  return points.map((_, i) => {
    const windowStart = Math.max(0, i - ALTITUDE_SMOOTHING_WINDOW + 1);
    const samples = points
      .slice(windowStart, i + 1)
      .map(p => p.alt)
      .filter((alt): alt is number => alt != null);
    if (samples.length === 0) return null;
    return samples.reduce((sum, alt) => sum + alt, 0) / samples.length;
  });
}

/** Sums the positive deltas of the smoothed altitude trail — total climb for the run. */
export function computeElevationGain(points: GeoPoint[]): number {
  const smoothed = smoothAltitudes(points);
  let gain = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const prev = smoothed[i - 1];
    const alt = smoothed[i];
    if (prev == null || alt == null) continue;
    const delta = alt - prev;
    if (delta > MIN_CLIMB_M) gain += delta;
  }
  return gain;
}

export interface RunSplit {
  /** 1-based split number. */
  km: number;
  /** Metres actually covered in this split (equals splitDistanceM except the last, partial one). */
  distanceM: number;
  elapsedS: number;
  avgPaceMinPerKm: number;
  elevationGainM: number;
}

/**
 * Walks the raw GPS trail and buckets it into per-kilometre splits — the
 * Strava-style "Podziały na kilometry" list, computed from our own points
 * instead of coming from a third-party API.
 */
export function computeRunSplits(points: GeoPoint[], splitDistanceM = 1000): RunSplit[] {
  if (points.length < 2) return [];

  const smoothed = smoothAltitudes(points);
  const splits: RunSplit[] = [];
  let splitDistance = 0;
  let splitStartTime = points[0].at;
  let splitGain = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const point = points[i];
    splitDistance += haversine(prev, point);

    const prevAlt = smoothed[i - 1];
    const alt = smoothed[i];
    if (prevAlt != null && alt != null) {
      const delta = alt - prevAlt;
      if (delta > MIN_CLIMB_M) splitGain += delta;
    }

    if (splitDistance >= splitDistanceM) {
      const elapsedS = (point.at - splitStartTime) / 1000;
      splits.push({
        km: splits.length + 1,
        distanceM: splitDistance,
        elapsedS,
        avgPaceMinPerKm: elapsedS / 60 / (splitDistance / 1000),
        elevationGainM: splitGain,
      });
      splitDistance = 0;
      splitStartTime = point.at;
      splitGain = 0;
    }
  }

  // Trailing partial kilometre, if the run didn't end exactly on a split boundary.
  if (splitDistance > 50) {
    const last = points[points.length - 1];
    const elapsedS = (last.at - splitStartTime) / 1000;
    splits.push({
      km: splits.length + 1,
      distanceM: splitDistance,
      elapsedS,
      avgPaceMinPerKm: elapsedS / 60 / (splitDistance / 1000),
      elevationGainM: splitGain,
    });
  }

  return splits;
}
