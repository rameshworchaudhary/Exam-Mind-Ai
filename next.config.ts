import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow Cloud Run / AI Studio preview origins in development mode
  allowedDevOrigins: [
    "*.run.app",
    "ais-dev-vhe77j2met75ddlqkw3be7-2339521220.asia-southeast1.run.app",
    "ais-pre-vhe77j2met75ddlqkw3be7-2339521220.asia-southeast1.run.app",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
