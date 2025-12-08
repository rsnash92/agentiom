import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark problematic packages as external to avoid bundling issues
  serverExternalPackages: [
    'thread-stream',
    'pino',
    'pino-pretty',
    'sonic-boom',
    '@privy-io/server-auth',
    '@privy-io/public-api',
  ],

  // Webpack configuration to handle problematic modules
  webpack: (config, { isServer }) => {
    // Ignore test files and other non-essential files in node_modules
    config.module.rules.push({
      test: /node_modules\/@privy-io\/.*\/(test|bench|README|LICENSE|\.sh|\.zip|\.yml)/,
      use: 'ignore-loader',
    });

    // Handle pino and thread-stream issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        worker_threads: false,
      };
    }

    return config;
  },
};

export default nextConfig;
