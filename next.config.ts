import type { NextConfig } from "next";
import { validateEnvironment } from "./src/lib/env";
validateEnvironment(process.env);
const config: NextConfig = { poweredByHeader: false, reactStrictMode: true };
export default config;
