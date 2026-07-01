/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output → tiny production Docker image.
  output: 'standalone',
};

export default nextConfig;
