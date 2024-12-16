import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://api-service:3000/api/:path*", // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
