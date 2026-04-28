import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["almanac-patient-spookily.ngrok-free.dev"],
  images: {
    loader: "custom",
    loaderFile: "./image-loader.ts",
  },
};

export default nextConfig;
