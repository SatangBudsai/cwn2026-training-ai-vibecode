import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ไลบรารีฝั่ง server ที่ไม่ควร bundle (bullmq มี optional dependency ที่ webpack หาไม่เจอ)
  serverExternalPackages: ['bullmq', 'ioredis', 'pino'],
};

export default nextConfig;
