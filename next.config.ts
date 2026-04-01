import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LIFF SDK は外部スクリプトのため、CSP を緩和しない
  // 画像は LINE CDN を許可
  images: {
    domains: ["profile.line-scdn.net"],
  },
};

export default nextConfig;
