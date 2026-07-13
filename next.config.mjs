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
  // 보안 응답 헤더 (H-3). CSP 는 초기 회귀 방지를 위해 Report-Only 로 시작 → 검증 후 enforce 전환.
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next 인라인/PG SDK(이니시스·카카오·페이팔)·GA·Meta 픽셀 허용
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.inicis.com https://*.kakaopay.com https://*.kakao.com https://*.paypal.com https://*.paypalobjects.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.inicis.com https://*.kakaopay.com https://*.paypal.com https://www.google-analytics.com https://region1.google-analytics.com https://connect.facebook.net",
      "frame-src 'self' https://*.inicis.com https://*.kakaopay.com https://*.kakao.com https://*.paypal.com",
      "form-action 'self' https://*.inicis.com https://*.kakaopay.com https://*.paypal.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
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
      // 용량별 별도 제품 재정규화(D-059) — 슬러그 변경분 구→신 301. (classic-200·house-200 은 살아있는 제품이라 리다이렉트 없음)
      { source: '/products/damn-good-125g', destination: '/products/damn-good-125', permanent: true },
      { source: '/products/damn-good-1kg-wholesale', destination: '/products/damn-good-1000', permanent: true },
      { source: '/products/spotlight-1kg', destination: '/products/spotlight-1000', permanent: true },
      { source: '/products/aha-1kg', destination: '/products/aha-1000', permanent: true },
      { source: '/products/allrounder-1kg', destination: '/products/allrounder-1000', permanent: true },
      { source: '/products/ezpz-1kg', destination: '/products/ezpz-1000', permanent: true },
      { source: '/products/yirga-decaf-1kg', destination: '/products/yirga-decaf-1000', permanent: true },
      { source: '/products/classic-1kg', destination: '/products/classic-1000', permanent: true },
      { source: '/products/house-1kg', destination: '/products/house-1000', permanent: true },
    ];
  },
};
export default nextConfig;
