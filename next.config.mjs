/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'apiskyivlvebpvvxfejq.supabase.co' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  experimental: {
    // domain-based multi-storefront handled in middleware.ts
  },
  // 현행(Shopify) → 신규 자사몰 301 매핑 (SEO 보존, D-009).
  // · /products·/collections·/policies slug 는 동일 보존 → 리다이렉트 불필요.
  // · 아래는 Shopify /pages/* 프리픽스 및 blog handle 리네임만 처리.
  async redirects() {
    return [
      { source: '/pages/about-mts', destination: '/about', permanent: true },
      { source: '/pages/about', destination: '/about', permanent: true },
      { source: '/pages/consulting', destination: '/consulting', permanent: true },
      { source: '/pages/contact', destination: '/contact', permanent: true },
      { source: '/pages/faq', destination: '/faq', permanent: true },
      // Coffeelog 블로그 handle 변경 (현행: coffeelog-커피로그 → 신규: coffeelog)
      { source: '/blogs/coffeelog-커피로그', destination: '/blogs/coffeelog', permanent: true },
      { source: '/blogs/coffeelog-커피로그/:slug*', destination: '/blogs/coffeelog/:slug*', permanent: true },
    ];
  },
};
export default nextConfig;
