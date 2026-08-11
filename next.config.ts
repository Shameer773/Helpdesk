import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse is a CommonJS package; keep it out of the bundler. (Embeddings now
  // run in a Supabase Edge Function, so no native ML packages are bundled here.)
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
