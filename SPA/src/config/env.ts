export const env = {
  // Use empty string to leverage Vite proxy, or full URL for direct connection
  API_URL: import.meta.env.VITE_API_URL || '',
  ENABLE_MOCK_API: import.meta.env.VITE_ENABLE_MOCK_API === 'true',
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
};
