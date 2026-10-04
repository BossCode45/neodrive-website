import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Steam update banners, capsules and post images.
    remotePatterns: [{ protocol: "https", hostname: "clan.akamai.steamstatic.com", pathname: "/images/**" }],
    qualities: [75],
  },
};

export default nextConfig;
