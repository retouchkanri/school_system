import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  // アバター画像(最大5MB)のアップロード用。multipart のオーバーヘッド分を少し余裕を持たせる
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
