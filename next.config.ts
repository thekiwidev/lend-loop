import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off: every signed-in page is a live Convex client view, and Clerk's
  // components read request data, so prerendering would buy nothing and break the build.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
