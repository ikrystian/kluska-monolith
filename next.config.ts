import type { NextConfig } from 'next';
import os from 'os';

const getDevOrigins = (): string[] => {
  const baseOrigins = [
    'http://localhost',
    'https://localhost',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'capacitor://localhost',
    '188.68.236.161:3001',
    'capacitor://*',
    'http://0.0.0.0',
    'http://83.168.88.80',
    'https://kluska.studio-ai.com.pl'
  ];

  const origins = new Set<string>(baseOrigins);

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (netInterface) {
        for (const net of netInterface) {
          if (net.family === 'IPv4') {
            origins.add(net.address);
            origins.add(`http://${net.address}`);
            origins.add(`http://${net.address}:3000`);
            origins.add(`http://${net.address}:5173`);
            origins.add(`http://${net.address}:8080`);
            origins.add(`https://${net.address}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to parse network interfaces for allowedDevOrigins:', error);
  }

  return Array.from(origins);
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
});

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: getDevOrigins(),
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default withPWA(nextConfig);
