import type { NextConfig } from "next";
import { readFileSync } from "fs";

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    const base = pkg.version || "1.0.0"; // e.g. "1.0.0"
    const [major, minor] = base.split(".");
    const patch = readFileSync(".build-number", "utf-8").trim();
    return `${major}.${minor}.${patch}`;
  } catch {
    return "1.0.0";
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.219"],
  env: {
    NEXT_PUBLIC_APP_VERSION: getVersion(),
  },
};

export default nextConfig;
