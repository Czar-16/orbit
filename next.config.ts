import type { NextConfig } from "next";
import { validateEnvironment } from "./src/lib/env";
validateEnvironment(process.env);
const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingExcludes: {
    "/*": ["./private/**/*", "./.test-private/**/*", "./.env*"],
  },
  outputFileTracingIncludes: {
    "/*": [
      "./scripts/generate-resume.mjs",
      "./scripts/resume-document-engine.mjs",
      "./assets/fonts/**/*",
      "./node_modules/pdfkit/**/*",
      "./node_modules/fontkit/**/*",
      "./node_modules/docx/**/*",
      "./node_modules/jszip/**/*",
      "./node_modules/fast-xml-parser/**/*",
      "./node_modules/unpdf/**/*",
    ],
  },
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};
export default config;
