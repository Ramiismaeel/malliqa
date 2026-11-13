import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

// `pnpm build:export` sets BUILD_EXPORT=1 to verify the app is static-export
// compatible (Capacitor readiness). The normal build keeps /api/ai/* as the
// only server code.
const isExport = process.env.BUILD_EXPORT === "1";

const nextConfig: NextConfig = {
  output: isExport ? "export" : undefined,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSerwist(nextConfig);
