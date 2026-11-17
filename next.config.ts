import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  experimental: { cpus: 2 },
  async redirects() {
    return [{
      source: "/",
      has: [{ type: "host", value: "adminsharetoo\\.vercel\\.app" }],
      destination: "https://sharetoo.vercel.app/admin",
      permanent: false,
    }];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Referrer-Policy", value: "same-origin" },
      ],
    }];
  },
};
export default config;
