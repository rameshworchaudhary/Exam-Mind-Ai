import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Standard Next.js build output for Vercel deployment.
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