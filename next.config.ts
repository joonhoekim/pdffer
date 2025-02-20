import type { NextConfig } from "next";

const isDev: boolean = process.env.BUILD_MODE === "dev";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: isDev,
  },
  eslint: {
    ignoreDuringBuilds: isDev,
  },

  // pdfjs-dist 패키지 내부 구성요소를 직접 사용하려고 함
  webpack: (config) => {
    // PDF.js 관련 파일들을 번들에 포함
    config.module.rules.push({
      test: /\.(pdf|worker\.min\.m?js)$/,
      type: "asset/resource",
    });

    return config;
  },
  transpilePackages: ["pdfjs-dist"],
};

export default nextConfig;
