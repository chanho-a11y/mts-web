// D-146: 구 Shopify 주소 301. 한글 경로는 원문과 encodeURI 형태를 둘 다 등록해야 실제 요청과 매칭된다.
const legacy = (from, to) => {
  const rules = [{ source: from, destination: to, permanent: true }];
  const enc = encodeURI(from);
  if (enc !== from) rules.push({ source: enc, destination: to, permanent: true });
  return rules;
};
const W = '/collections/wholesale', B = '/collections/blends', S = '/collections/single-origins', ALL = '/collections/all';
// [구 주소, 새 주소]. Search Console 404 목록(2026-10-19) 기준. Shopify 내부 엔드포인트(/cart/add, /cdn 등)는 404 유지.
const LEGACY_404 = [
  // 블렌드(소포장)
  ['/products/spotlight-125g', B], ['/products/ezpz-125g', B], ['/products/allrounder-125g', B],
  ['/products/ah-a-blend-125g', B], ['/products/damn-good', B], ['/products/aha-125', B],
  ['/products/ezpz', B], ['/products/allrounder', B], ['/products/blend-normcore-standard', B],
  ['/products/블렌드-스팟라이트-spotlight', B], ['/products/블렌드-아아-블렌드-ah-a-blend-125g', B],
  // 사업자 전용(1kg, 도매)
  ['/products/classic-blend-1kg-wholesale', W], ['/products/spotlight-1kg-wholesale', W],
  ['/products/ethiopia-yirgacheffe-decaf-1kg-wholesale', W], ['/products/house-blend-200g-wholesale', W],
  ['/products/allrounder-1kg-wholesale', W], ['/products/ah-a-blend-1kg-wholesale', W],
  ['/products/house-blend-1kg-wholesale', W], ['/products/ezpz-1kg-wholesale', W],
  ['/products/블렌드-클래식-블렌드-200g-사업자-전용', W], ['/products/블렌드-댐굳-damn-good-사업자-전용', W],
  ['/products/블렌드-스팟라이트-spotlight-1kg-사업자-전용', W], ['/products/블렌드-클래식-블렌드-1kg-사업자-전용', W],
  ['/products/블렌드-아아-블렌드-ah-a-blend-1kg-사업자-전용', W], ['/products/블렌드-하우스-블렌드-200g-사업자-전용', W],
  ['/products/블렌드-올라운더-allrounder-1kg-사업자-전용', W], ['/products/블렌드-하우스-블렌드-1kg-사업자-전용', W],
  ['/products/싱글-오리진-에티오피아-예가체프-디카페인-ethiopia-yirgacheffe-decaffeinated-1kg', W],
  // 싱글 오리진
  ['/products/ethiopia-bekele-125', S], ['/products/ethiopia-bekele-kachara-anaerobic-natural-125g', S],
  ['/products/ethiopia-genet-125', S], ['/products/colombia-tablon-125', S],
  ['/products/ethiopia-aricha-amy-washed', S], ['/products/ethiopia-guji-hambela-genet-washed-125g', S],
  ['/products/ethiopia-yirgacheffe-decaffeinated', S], ['/products/panama-auromar-pacamara-washed-125g', S],
  ['/products/yirga-decaf-125', S], ['/products/peru-tiringes-125', S], ['/products/guatemala-vaja-verapaz-washed', S],
  ['/products/싱글-오리진-과테말라-비스타-에르모사-guatemala-vista-hermosa-125g', S],
  ['/products/싱글-오리진-온두라스-모나르카-honduras-monarca-washed-125g', S],
  ['/products/싱글-오리진-파나마-핀카-하트만-게이샤-워시드-panama-finca-hartmann-geisha-washed-125g', S],
  ['/products/싱글-오리진-콜롬비아-엘-타블론-워시드-colombia-el-tablon-washed-125g', S],
  ['/products/싱글-오리진-페루-라스-티링게스-티피카-무산소-워시드-125g', S],
  ['/products/싱글-오리진-에티오피아-구지-함벨라-게넷-워시드-ethiopia-guji-hambela-genet-washed-125g', S],
  ['/products/싱글-오리진-파나마-아우로마르-파카마라-panama-finca-auromar-pacamara-washed-125g', S],
  ['/products/싱글-오리진-에티오피아-베켈레-카차라-무산소-내추럴-ethiopia-bekele-kachara-anaerobic-natural-125g', S],
  ['/products/싱글-오리진-콜롬비아-라-레이나-벨렌-게이샤-colombia-la-reina-belen-geisha-washed-125g', S],
  // 컬렉션과 피드
  ['/collections/normcore-coffee', ALL], ['/collections/사업자-전용', W],
  ['/collections/single-origins.atom', S], ['/collections/blends.atom', B],
  ['/collections/wholesale.atom', W], ['/collections/normcore-coffee.atom', ALL],
  // Shopify 페이지
  ['/pages/avada-sitemap', '/'], ['/pages/avada-sitemap-pages', '/'],
  ['/pages/avada-sitemap-products', ALL], ['/pages/avada-sitemap-collections', ALL],
  ['/pages/policy-정책', '/policies/terms-of-service'],
];

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
    // D-108: 커버 렌더 폰트(mcp/fonts/*.woff)를 MCP 라우트 함수 번들에 포함.
    // fs.readFile 로 읽는 파일은 트레이싱이 자동으로 못 잡는다 — 빠지면 렌더가 배포에서만 죽는다.
    outputFileTracingIncludes: {
      "/api/mcp": ["./mcp/fonts/**"],
      // D-139: 관리자 수정 화면의 단일 이미지 다시 그리기(/api/social/design)도 같은 폰트를 읽는다.
      "/api/social/design": ["./mcp/fonts/**"],
    },
  },
  // 보안 응답 헤더 (H-3). CSP 는 초기 회귀 방지를 위해 Report-Only 로 시작 → 검증 후 enforce 전환.
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next 인라인/PG SDK(이니시스·카카오·페이팔)·GA·Meta 픽셀·Turnstile(가입 봇 차단, D-091) 허용
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.inicis.com https://*.kakaopay.com https://*.kakao.com https://*.paypal.com https://*.paypalobjects.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.inicis.com https://*.kakaopay.com https://*.paypal.com https://www.google-analytics.com https://region1.google-analytics.com https://connect.facebook.net",
      "frame-src 'self' https://*.inicis.com https://*.kakaopay.com https://*.kakao.com https://*.paypal.com https://challenges.cloudflare.com",
      "form-action 'self' https://*.inicis.com https://*.kakaopay.com https://*.paypal.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      // O-1: 위반 리포트 수집처. 이전에는 report-uri 가 없어 위반이 각 방문자 콘솔에만 남고
      // 아무 데도 모이지 않아 "관찰 후 enforce 전환"이 불가능했다. → /api/csp-report 로 수집.
      "report-uri /api/csp-report",
      "report-to csp-endpoint",
    ].join("; ");
    // 이니시스 PC 표준결제(INIStdPay)는 payViewType=overlay 로 동작한다 —
    // 결제창을 우리 페이지 안의 iframe 으로 띄우고, 취소 시 그 iframe 을 closeUrl 로,
    // 인증 완료 시 returnUrl 로 이동시킨다. 두 URL 모두 우리 도메인이라 전역
    // `X-Frame-Options: DENY` 에 걸려 iframe 렌더링이 차단됐고, 결제창을 닫으면
    // 빈 iframe(깨진 문서 아이콘)만 화면을 덮은 채 남았다.
    // → 결제 콜백 경로에 한해 SAMEORIGIN 으로 완화한다(외부 도메인 프레이밍은 계속 차단).
    // ※ 이 블록은 D-090 에서 도입됐으나 D-091 커밋(5718b75)에서 실수로 삭제돼 결제창 버그가
    //   재발한 상태였다. D-093 에서 복구. 삭제 금지.
    const pgFrameHeaders = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Content-Security-Policy-Report-Only", value: csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'") },
    ];
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
          { key: "Reporting-Endpoints", value: 'csp-endpoint="/api/csp-report"' },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
      // ※ 아래 두 규칙은 전역 규칙보다 뒤에 와야 같은 키를 덮어쓴다.
      //    결제 완료 페이지(/checkout/complete)는 항상 최상위 창으로만 열리므로 DENY 유지.
      { source: "/api/payments/:path*", headers: pgFrameHeaders },
      { source: "/checkout/pg-close", headers: pgFrameHeaders },
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
      // D-146: 한글 원문 source 는 실제 요청(퍼센트 인코딩 경로)과 매칭되지 않아 404 가 나고 있었다.
      // legacy() 가 원문과 encodeURI 형태를 함께 등록한다. 구체 규칙(faq)이 일반 규칙보다 먼저 와야 한다.
      ...legacy('/blogs/coffeelog-커피로그/자주-묻는-질문', '/faq'),
      ...legacy('/blogs/coffeelog-커피로그/faq', '/faq'),
      ...legacy('/blogs/coffeelog-커피로그', '/blogs/coffeelog'),
      ...legacy('/blogs/coffeelog-커피로그/:slug*', '/blogs/coffeelog/:slug*'),
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
      // D-146: Search Console 404 정리(2026-10-19). 단종, 구 Shopify 상품은 컬렉션으로(대표 결정).
      ...LEGACY_404.flatMap(([from, to]) => legacy(from, to)),
    ];
  },
};
export default nextConfig;
