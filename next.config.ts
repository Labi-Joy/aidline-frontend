import type { NextConfig } from 'next';

import { securityHeaders } from './security-headers';

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_BUILD_ID ??
  Date.now().toString(36);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  async headers() {
    return securityHeaders;
  },
};

export default nextConfig;
