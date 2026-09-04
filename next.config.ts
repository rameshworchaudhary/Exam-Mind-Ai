import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["firebase-admin"],
  // Allow Cloud Run / AI Studio preview origins in development mode
  allowedDevOrigins: [
    "*.run.app",
    "*.asia-east1.run.app",
    "*.asia-southeast1.run.app",
    "ais-dev-vqav3tpk6qnbhte2lkovjd-905144230119.asia-east1.run.app",
    "ais-pre-vqav3tpk6qnbhte2lkovjd-905144230119.asia-east1.run.app",
    "ais-dev-mhbg7crmfj5zu2xcqcrten-905144230119.asia-east1.run.app",
    "ais-pre-mhbg7crmfj5zu2xcqcrten-905144230119.asia-east1.run.app",
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
