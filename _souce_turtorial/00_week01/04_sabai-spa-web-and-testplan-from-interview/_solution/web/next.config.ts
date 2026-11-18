import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // V1/V2 รัน next dev คนละ distDir พร้อมกันได้
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  serverExternalPackages: ['@node-rs/argon2', 'pg'],
  images: {
    qualities: [60, 75, 85],
    formats: ['image/webp'],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 256, 384, 512],
  },
  async redirects() {
    return [
      { source: '/', destination: '/th', permanent: false },
      { source: '/admin', destination: '/th/admin', permanent: false },
    ];
  },
};

export default nextConfig;
