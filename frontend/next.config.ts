import type { NextConfig } from "next";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${API_PROXY_TARGET}/auth/:path*` },
      { source: "/weather/:path*", destination: `${API_PROXY_TARGET}/weather/:path*` },
      { source: "/mail/:path*", destination: `${API_PROXY_TARGET}/mail/:path*` },
      { source: "/calendar/:path*", destination: `${API_PROXY_TARGET}/calendar/:path*` },
      { source: "/memos/:path*", destination: `${API_PROXY_TARGET}/memos/:path*` },
      { source: "/memos", destination: `${API_PROXY_TARGET}/memos` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
};

export default nextConfig;
