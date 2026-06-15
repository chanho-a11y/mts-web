// Domain → brand/storefront mapping. 2 domains, 1 backend.
// mtspace.coffee = MTSPACE (B2B-led) · normcorecoffee.com = NORMCORE (B2C-led)
export type BrandCode = "mtspace" | "normcore";
export type Audience = "b2b" | "b2c";

export interface Brand {
  code: BrandCode;
  name: string;
  audience: Audience;
  domain: string;
  instagram: string;
}

export const BRANDS: Record<BrandCode, Brand> = {
  mtspace: {
    code: "mtspace",
    name: "MTSPACE COFFEE",
    audience: "b2b",
    domain: "mtspace.coffee",
    instagram: "@mtspacecoffee",
  },
  normcore: {
    code: "normcore",
    name: "NORMCORE COFFEE",
    audience: "b2c",
    domain: "normcorecoffee.com",
    instagram: "@normcorecoffee_official",
  },
};

// Resolve brand from request Host header.
// Default (localhost, vercel preview, mtspace.coffee) → mtspace.
export function brandForHost(host: string | null | undefined): Brand {
  const h = (host ?? "").toLowerCase();
  if (h.includes("normcore")) return BRANDS.normcore;
  return BRANDS.mtspace;
}
