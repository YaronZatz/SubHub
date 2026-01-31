/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use a different output dir so build doesn't need to delete locked .next (e.g. OneDrive/process holding it)
  distDir: '.next-build',
};

export default nextConfig;
