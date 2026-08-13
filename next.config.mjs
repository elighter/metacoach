/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `standalone` bundles a minimal server (+ traced deps) into
  // .next/standalone so the Docker image stays small. Harmless for
  // Vercel, required for Fly.io/Railway container deploys.
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
