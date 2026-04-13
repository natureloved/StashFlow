import type { NextConfig } from "next";

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        events: require.resolve('events/'),
      };
    }
    return config;
  },
};

export default nextConfig;
