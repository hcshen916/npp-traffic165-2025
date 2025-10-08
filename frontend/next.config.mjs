/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  async rewrites() {
    // 取用環境變數（可能是 http://cms:1337 或 http://cms:1337/api）
    const baseFromEnv = process.env.NEXT_PUBLIC_CMS_BASE
      ? process.env.NEXT_PUBLIC_CMS_BASE
      : (process.env.NODE_ENV === 'production' ? 'http://cms:1337' : 'http://localhost:1337')

    // 針對 admin 後台，需去除尾端的 /api（Strapi Admin 不走 /api 前綴）
    const adminBase = baseFromEnv
      .replace(/\/$/, '')
      .replace(/\/api$/, '')
      .replace(/\/api\/$/, '')

    return [
      {
        source: '/admin',
        destination: `${adminBase}/admin`,
      },
      {
        source: '/admin/:path*',
        destination: `${adminBase}/admin/:path*`,
      },
    ]
  },
}

export default nextConfig

