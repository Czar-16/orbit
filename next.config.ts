import type { NextConfig } from "next";
import { validateEnvironment } from "./src/lib/env";
validateEnvironment(process.env);
const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingExcludes: {
    "/*": ["./private/**/*", "./.test-private/**/*", "./.env*"],
  },
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};
export default config;
