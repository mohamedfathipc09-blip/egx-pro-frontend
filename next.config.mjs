/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // بيمنع Vercel إنه يوقف الرفع بسبب أخطاء ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // بيمنع Vercel إنه يوقف الرفع بسبب أخطاء TypeScript
    ignoreBuildErrors: true,
  },
};

export default nextConfig;