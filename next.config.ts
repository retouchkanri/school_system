import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // 資料請求メールに添付する2つのフォーム(public/docs/*.docx)を
  // サーバーレス関数のバンドルに含め、実行時に fs で読めるようにする。
  outputFileTracingIncludes: {
    "/request": ["./public/docs/*.docx"],
  },
  // アバター画像(最大5MB)のアップロード用。multipart のオーバーヘッド分を少し余裕を持たせる
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
