/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent webpack from bundling Node.js-only packages used in Server Components and API routes.
  serverExternalPackages: ['firebase-admin'],
  // Use default .next so Firebase App Hosting finds the build. For local builds, close other processes (OneDrive, dev server) if .next is locked.
};

export default nextConfig;
