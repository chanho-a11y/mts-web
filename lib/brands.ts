// 이 사이트는 MTSPACE COFFEE 웹사이트입니다.
// NORMCORE COFFEE 는 향후 별도 도메인/사이트(별도 운영). 단, NORMCORE 제품은 이 사이트에서 '판매 등록'되어 팔립니다.
// 따라서 알 수 없는 호스트(vercel preview, localhost)·mtspace.coffee 는 모두 MTSPACE 로 기본 처리합니다.
// normcorecoffee.com (미래 별도 사이트) 호스트만 NORMCORE 로 분기.
export type BrandCode = "mtspace" | "normcore";
export type Audience = "b2b" | "b2c";

export interface Brand {
  code: BrandCode;
  name: string;
  audience: Audience;
  domain: string;
  instagram: string;
  philosophy: { ko: string; en: string };
  about: { ko: string; en: string };
}

export const BRANDS: Record<BrandCode, Brand> = {
  mtspace: {
    code: "mtspace",
    name: "MTSPACE COFFEE",
    audience: "b2b",
    domain: "mtspace.coffee",
    instagram: "@mtspacecoffee",
    philosophy: {
      ko: "Everyday Excellence — 특별한 날의 한 잔이 아닌, 매일 마시는 커피가 탁월해야 한다고 믿습니다.",
      en: "Everyday Excellence — we believe the coffee you drink every day should be exceptional, not just on special occasions.",
    },
    about: {
      ko: "MTSPACE COFFEE는 경기도 가평 청평에 자체 로스터리를 운영하는 한국 스페셜티 커피 브랜드입니다. 경쟁 바리스타 홍찬호 대표가 호주 시드니에서 공동 창업한 Normcore Coffee(2016)의 경험을 바탕으로, 한국 시장에 맞춘 시그니쳐 블렌드와 세계 각지 싱글 오리진을 매주 월·화 로스팅합니다.",
      en: "MTSPACE COFFEE is a Korean specialty coffee brand with its own roastery in Cheongpyeong, Gapyeong. Founded on the Sydney experience of Normcore Coffee (2016) by competition barista Chanho Hong, we roast signature blends and single origins every Mon–Tue.",
    },
  },
  normcore: {
    code: "normcore",
    name: "NORMCORE COFFEE",
    audience: "b2c",
    domain: "normcorecoffee.com",
    instagram: "@normcorecoffee_official",
    philosophy: {
      ko: "도구가 아닌 맛. 어떤 추출이든 깨끗하고 균형 잡힌 한 잔으로, Flavour-Forward Coffee를 지향합니다.",
      en: "Flavour over gadgets. Whatever the method, a clean and balanced cup — Flavour-Forward Coffee.",
    },
    about: {
      ko: "2016년 호주 시드니에서 시작한 Normcore Coffee는 'damn good coffee'를 넘어선 경험을 추구합니다. 그 기술적 토대는 MTSPACE COFFEE입니다.",
      en: "Founded in Sydney in 2016, Normcore Coffee moves beyond ‘damn good coffee’. Its technical foundation is MTSPACE COFFEE.",
    },
  },
};

// Resolve brand from request Host header.
// 이 사이트는 MTSPACE. normcorecoffee.com 호스트만 NORMCORE(미래 별도 사이트). 그 외 전부 MTSPACE.
export function brandForHost(host: string | null | undefined): Brand {
  const h = (host ?? "").toLowerCase();
  if (h.includes("normcorecoffee.com")) return BRANDS.normcore;
  return BRANDS.mtspace;
}
