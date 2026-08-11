import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse is a CommonJS native-ish package; keep it out of the bundler.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
