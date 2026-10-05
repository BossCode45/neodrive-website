import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone, packaged by nix/package.nix.
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Steam update banners, capsules and post images.
      { protocol: "https", hostname: "clan.akamai.steamstatic.com", pathname: "/images/**" },
      // Player avatars on the leaderboards.
      { protocol: "https", hostname: "avatars.akamai.steamstatic.com" },
      { protocol: "https", hostname: "avatars.steamstatic.com" },
    ],
    qualities: [75],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
