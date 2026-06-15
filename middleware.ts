import { NextRequest, NextResponse } from "next/server";
import { brandForHost } from "@/lib/brands";

// Multi-storefront + locale middleware.
// - Host → brand (mtspace / normcore)
// - Geo → locale (KR → ko, else en), overridable by `locale` cookie
export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const brand = brandForHost(host);

  const country = (req.geo?.country ?? "KR").toUpperCase();
  const cookieLocale = req.cookies.get("locale")?.value;
  const locale = cookieLocale ?? (country === "KR" ? "ko" : "en");

  const res = NextResponse.next();
  res.headers.set("x-brand", brand.code);
  res.headers.set("x-audience", brand.audience);
  res.headers.set("x-locale", locale);
  if (!cookieLocale) {
    res.cookies.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
