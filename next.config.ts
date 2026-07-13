import type { NextConfig } from "next";
import { readFileSync } from "fs";

function getVersion() {
  try {
    const count = readFileSync(".build-number", "utf-8").trim();
    return `1.0.${count}`;
  } catch {
    return "0.1.0";
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.219"],
  env: {
    NEXT_PUBLIC_APP_VERSION: getVersion(),
  },
};

export default nextConfig;
