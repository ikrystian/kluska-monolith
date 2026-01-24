import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // tailwindcss(), // Use if migrating to full v4 Vite plugin, but we use PostCSS now
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'next/image': path.resolve(__dirname, './src/lib/next-image.tsx'),
      'next/link': path.resolve(__dirname, './src/lib/next-link.tsx'),
      'next/navigation': path.resolve(__dirname, './src/lib/next-navigation.ts'),
      'next-auth/react': path.resolve(__dirname, './src/lib/next-auth-react.tsx'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://188.68.247.168:3001',
        changeOrigin: true,
      },
    },
  },
});
