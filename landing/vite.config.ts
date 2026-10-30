import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Open Graph needs absolute URLs; index.html reads this via %VITE_SITE_URL%.
  const env = loadEnv(mode, __dirname, '');
  process.env.VITE_SITE_URL = (env.VITE_SITE_URL || 'https://kluska.app').replace(/\/$/, '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      host: true,
    },
    preview: {
      port: 5174,
      host: true,
    },
  };
});
