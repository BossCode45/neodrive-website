import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
