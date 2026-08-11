import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/CommonJS packages out of the bundler so their runtime binaries
  // (onnxruntime-node, sharp) resolve correctly on the server.
  serverExternalPackages: ["pdf-parse", "@huggingface/transformers", "sharp"],
};

export default nextConfig;
