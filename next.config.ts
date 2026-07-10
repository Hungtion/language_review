import type { NextConfig } from "next";
import { execSync } from "child_process";

function getVersion() {
  try {
    // Vercel does shallow clone — unshallow first to get full history
    try { execSync("git fetch --unshallow", { encoding: "utf-8", stdio: "ignore" }); } catch {}
    const count = execSync("git rev-list --count HEAD", { encoding: "utf-8" }).trim();
    return `0.1.${count}`;
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
