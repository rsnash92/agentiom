import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark problematic packages as external to avoid Turbopack bundling issues
  serverExternalPackages: ['thread-stream', 'pino', 'pino-pretty'],

  // Transpile Privy packages for compatibility
  transpilePackages: ['@privy-io/react-auth', '@privy-io/server-auth'],

  // Disable Turbopack for production builds (issues with Privy dependencies)
  // Dev mode still uses Turbopack via --turbopack flag
  experimental: {
    // Use webpack for production builds
  },
};

export default nextConfig;
