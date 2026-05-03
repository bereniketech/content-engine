import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/dashboard/twitter",
        destination: "/dashboard/social/x",
        permanent: true,
      },
      {
        source: "/dashboard/linkedin",
        destination: "/dashboard/social/linkedin",
        permanent: true,
      },
      {
        source: "/dashboard/instagram",
        destination: "/dashboard/social/instagram",
        permanent: true,
      },
      {
        source: "/dashboard/newsletter",
        destination: "/dashboard/social/newsletter",
        permanent: true,
      },
      {
        source: "/dashboard/medium",
        destination: "/dashboard/social/medium",
        permanent: true,
      },
      {
        source: "/dashboard/reddit",
        destination: "/dashboard/social/reddit",
        permanent: true,
      },
      {
        source: "/dashboard/pinterest",
        destination: "/dashboard/social/pinterest",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
