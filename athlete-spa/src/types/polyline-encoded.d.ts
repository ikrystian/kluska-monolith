/**
 * `polyline-encoded` ships no types. Only the two functions the app uses are
 * declared, against Google's encoded-polyline format as `[lat, lng]` pairs.
 */
declare module 'polyline-encoded' {
  export function encode(points: [number, number][], precision?: number): string;
  export function decode(encoded: string, precision?: number): [number, number][];
}
