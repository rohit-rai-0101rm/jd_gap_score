import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist (used by pdf-parse) loads its worker via a relative file path
  // at runtime; bundling it breaks that resolution, so keep it external.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
