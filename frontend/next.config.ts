import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["almanac-patient-spookily.ngrok-free.dev"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.s3.**.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
