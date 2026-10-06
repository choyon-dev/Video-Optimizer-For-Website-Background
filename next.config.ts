import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for FFmpeg.wasm SharedArrayBuffer support
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },

  // Explicitly acknowledge Turbopack (default in Next.js 16).
  // No special bundler config needed — @ffmpeg/* packages are loaded via
  // runtime dynamic import() in src/lib/ffmpeg.ts, so the bundler never
  // tries to statically analyze them.
  turbopack: {},
};

export default nextConfig;
