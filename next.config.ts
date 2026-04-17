import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.4.141", "192.168.4.141:3000"],
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
