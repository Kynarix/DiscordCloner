import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['discord.js', 'zlib-sync', 'utf-8-validate', 'bufferutil'],
};

export default nextConfig;
