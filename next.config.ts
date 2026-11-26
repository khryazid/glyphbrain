import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
});

const nextConfig: NextConfig = withSerwist({
  // Indicar que usamos Turbopack (Next.js 16 default)
  turbopack: {},
});

export default nextConfig;
