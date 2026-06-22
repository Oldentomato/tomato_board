import type { NextConfig } from "next";
import { API_BASE_URL } from "./src/lib/config/api";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    if (!isDev) {
      return [];
    }

    return [
      { source: "/api/:path*", destination: `${API_BASE_URL}/api/:path*` },
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
