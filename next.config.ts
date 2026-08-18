import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/firestore",
    "jwks-rsa",
    "jose",
  ],
  // Allow Cloud Run / AI Studio preview origins in development mode
  allowedDevOrigins: [
    "*.run.app",
    "*.asia-east1.run.app",
    "*.asia-southeast1.run.app",
    "ais-dev-d7jxrdihs522xgnz4fx5nv-905144230119.asia-east1.run.app",
    "ais-pre-d7jxrdihs522xgnz4fx5nv-905144230119.asia-east1.run.app",
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
