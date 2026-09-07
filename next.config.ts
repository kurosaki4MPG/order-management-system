import type { NextConfig } from "next";

const isLanShare = process.env.LAN_SHARE === "1";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  allowedDevOrigins: isLanShare ? ["192.168.3.8"] : undefined,
};

export default nextConfig;
