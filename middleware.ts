import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { brandForHost } from "@/lib/brands";

// Multi-storefront + locale + Supabase session refresh.
export async function middleware(req: NextRequest) {
  const brand = brandForHost(req.headers.get("host"));
  const country = (req.geo?.country ?? "KR").toUpperCase();
  const cookieLocale = req.cookies.get("locale")?.value;
  // 경로 기반 로케일: /en/* 은 쿠키와 무관하게 항상 영어로 렌더한다.
  // (교육 자료를 언어별 URL + hreflang 으로 색인시키기 위한 것 — 쿠키 전환만으로는
  //  검색엔진이 한 언어만 색인한다.)
  const pathname = req.nextUrl.pathname;
  const pathLocale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : null;
  const locale = pathLocale ?? cookieLocale ?? (country === "KR" ? "ko" : "en");

  // expose brand/locale to RSC via request headers
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-brand", brand.code);
  reqHeaders.set("x-audience", brand.audience);
  reqHeaders.set("x-locale", locale);

  let res = NextResponse.next({ request: { headers: reqHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: { headers: reqHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options as any));
        },
      },
    },
  );
  // refresh session (auto-login persistence)
  await supabase.auth.getUser();

  // 경로로 강제된 로케일은 쿠키에 쓰지 않는다(사용자의 언어 선택을 덮어쓰지 않도록).
  if (!cookieLocale && !pathLocale) res.cookies.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
