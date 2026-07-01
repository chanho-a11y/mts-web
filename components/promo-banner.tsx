// Top promotion banner. (P6: driven by `promotion` table with 노출위치=상단배너)
// 프로모션 미설정 시: 'welcome to MTSPACE COFFEE' 를 왼쪽 → 오른쪽으로 흐르게(마퀴).
export default function PromoBanner({ message }: { message?: string | null }) {
  // 프로모션 메시지가 있으면 정적 배너로 노출
  if (message) {
    return (
      <div className="w-full bg-ink text-white text-center text-xs py-2 px-4">
        {message}
      </div>
    );
  }

  // 기본(프로모션 미설정) — 상시 마퀴 배너
  const phrase = "welcome to MTSPACE COFFEE";
  const items = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="mx-8 inline-block tracking-[0.25em] uppercase">
      {phrase}
    </span>
  ));
  return (
    <div className="mt-promo-marquee w-full overflow-hidden bg-ink text-white text-[10px] py-2">
      <div className="mt-promo-marquee__track whitespace-nowrap will-change-transform">
        <span className="inline-block">{items}</span>
        <span className="inline-block" aria-hidden="true">{items}</span>
      </div>
      <style>{`
        .mt-promo-marquee__track {
          display: inline-flex;
          animation: mt-promo-marquee 30s linear infinite;
        }
        /* -50% → 0 : 트랙이 오른쪽으로 이동 = 텍스트가 왼쪽에서 오른쪽으로 흐름 */
        @keyframes mt-promo-marquee {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mt-promo-marquee__track { animation: none; }
        }
      `}</style>
    </div>
  );
}
