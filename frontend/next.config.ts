import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["almanac-patient-spookily.ngrok-free.dev"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
