// Domain → brand/storefront mapping. 2 domains, 1 backend.
// mtspace.coffee = MTSPACE (B2B-led) · normcorecoffee.com = NORMCORE (B2C-led)
// Unknown hosts (vercel preview, localhost) default to NORMCORE (public B2C face).
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
      ko: "매일의 커피는 우리의 삶을 만듭니다. 정교한 기술과 깊이 있는 탐구로 일상 속 탁월함을 완성합니다.",
      en: "Daily coffee shapes our lives. With precise skill and deep exploration, we craft everyday excellence.",
    },
    about: {
      ko: "MTSPACE COFFEE는 경기도 가평 자체 로스터리에서 매주 월·화 로스팅하는 스페셜티 커피 브랜드입니다. 안정적인 공급과 균일한 품질로 카페 운영자의 신뢰할 수 있는 파트너가 됩니다.",
      en: "MTSPACE COFFEE roasts specialty coffee every Mon–Tue at our own roastery in Gapyeong, Korea — a reliable partner for cafés through consistent quality and supply.",
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

// Resolve brand from request Host header. Unknown → normcore (public B2C).
export function brandForHost(host: string | null | undefined): Brand {
  const h = (host ?? "").toLowerCase();
  if (h.includes("mtspace")) return BRANDS.mtspace;
  return BRANDS.normcore;
}
