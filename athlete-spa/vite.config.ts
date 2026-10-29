import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

/**
 * Pin a handful of heavy libraries to dedicated chunks so they:
 *  - load in parallel with the app code instead of inflating one big bundle,
 *  - stay cached across app deploys (their hash only changes on upgrade),
 *  - are only fetched by the routes that need them — maps, charts, the barcode
 *    scanner and image cropper all sit behind lazy boundaries now.
 *
 * Everything else returns `undefined`: Rollup's default splitting then keeps
 * per-route dependencies inside that route's chunk and hoists genuinely shared
 * modules (e.g. individual lucide icons) into automatic shared chunks, instead
 * of one catch-all `vendor` bundle that the entry would have to load eagerly.
 */
function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;

  // Always needed at startup — large and rarely changes, so a stable long-lived
  // cache entry is a clear win.
  if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
    return 'vendor-react';
  }
  // Tiny styling / state helpers shared by the app shell AND by recharts/radix.
  // Pin them here so Rollup can't fold them into a lazy vendor chunk (e.g.
  // vendor-charts) and then have to pull that whole chunk into the entry.
  if (
    /[\\/]node_modules[\\/](clsx|class-variance-authority|tailwind-merge|tailwindcss-animate|use-sync-external-store|dequal|react-is|swr|next-themes|tslib)[\\/]/.test(
      id,
    )
  ) {
    return 'vendor-utils';
  }
  // Used by the layout shell (page transitions) and most screens.
  if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
    return 'vendor-motion';
  }
  // Radix primitives back nearly every screen's UI.
  if (id.includes('@radix-ui')) {
    return 'vendor-radix';
  }
  // Widely used for date formatting across calendar/history/running/nutrition.
  if (id.includes('date-fns')) {
    return 'vendor-date';
  }

  // --- lazy-only: never in the initial payload ---

  // recharts — shared by Progress, Measurements and the exercise progress dialog.
  if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor') || id.includes('internmap')) {
    return 'vendor-charts';
  }
  // leaflet — shared by the gym map and the running route map.
  if (id.includes('leaflet') || id.includes('polyline-encoded')) {
    return 'vendor-maps';
  }
  // html5-qrcode — only the barcode scanner.
  if (id.includes('html5-qrcode')) {
    return 'vendor-scanner';
  }
  // form stack — every create/edit form, but never the initial dashboard.
  if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) {
    return 'vendor-forms';
  }

  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
  preview: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
});
