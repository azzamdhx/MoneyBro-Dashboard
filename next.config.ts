import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "@apollo/client"],
  },
};

export default nextConfig;
