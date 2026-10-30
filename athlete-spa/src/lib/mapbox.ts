/** Public Mapbox token (pk.…); maps render a placeholder when it is missing. */
export const MAPBOX_TOKEN: string | undefined = import.meta.env.VITE_MAPBOX_TOKEN;

export const MAP_STYLE = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
};

// Mapbox paint properties can't read CSS variables, so --primary (ember) is
// mirrored here for each theme.
export const ROUTE_COLOR = { dark: '#ff6929', light: '#e64c0a' };

/** Whether the OS asks for less motion; map animations then jump instead of play. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
