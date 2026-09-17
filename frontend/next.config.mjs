/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendOrigin = process.env.BACKEND_API_ORIGIN;
    return backendOrigin ? [{ source: '/api/:path*', destination: `${backendOrigin}/api/:path*` }] : [];
  }
};

export default nextConfig;
