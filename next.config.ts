import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow Cloud Run / AI Studio preview origins in development mode
  allowedDevOrigins: [
    "*.run.app",
    "*.asia-southeast1.run.app",
    "ais-dev-dny3nqjgqoor4ozbkln2if-2339521220.asia-southeast1.run.app",
    "ais-pre-dny3nqjgqoor4ozbkln2if-2339521220.asia-southeast1.run.app",
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
