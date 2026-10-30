import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { brandForHost } from "@/lib/brands";
import { FT_COOKIE, LT_COOKIE, FT_MAX_AGE, LT_MAX_AGE, extractTouch, directTouch, serializeTouch } from "@/lib/attribution";

// Multi-storefront + locale + Supabase session refresh.
export async function middleware(req: NextRequest) {
  const brand = brandForHost(req.headers.get("host"));
  const cookieLocale = req.cookies.get("locale")?.value;
  // 경로 기반 로케일: /en/* 은 쿠키와 무관하게 항상 영어로 렌더한다.
  // (교육 자료를 언어별 URL + hreflang 으로 색인시키기 위한 것 — 쿠키 전환만으로는
  //  검색엔진이 한 언어만 색인한다.)
  const pathname = req.nextUrl.pathname;
  const pathLocale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : null;
  // 기본 언어는 접속 국가와 무관하게 한국어다(D-134). 국가로 정하면 해외 IP 크롤러(구글, AI 검색)가
  // 한국어 주소에서 영문 화면을 받아 색인한다. 영문은 방문자가 직접 고르거나(/en 경로, 쿠키) 할 때만 쓴다.
  const locale = pathLocale ?? (cookieLocale === "en" || cookieLocale === "ko" ? cookieLocale : "ko");

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

  // 유입 경로 계측(D-154). 문서 요청(GET)만 본다. Next 의 RSC 이동, prefetch 는 내부 이동이라 건너뛴다.
  // 실패해도 페이지 응답에는 영향이 없도록 전부 try 로 감싼다.
  try {
    const isPrefetch =
      req.headers.get("rsc") === "1" ||
      req.headers.has("next-router-prefetch") ||
      req.headers.get("purpose") === "prefetch" ||
      req.headers.has("x-middleware-prefetch");
    if (req.method === "GET" && !isPrefetch) {
      const selfHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      const touch = extractTouch(req.nextUrl, req.headers.get("referer"), selfHost);
      const hasFt = !!req.cookies.get(FT_COOKIE)?.value;
      const opts = { path: "/", httpOnly: true, sameSite: "lax" as const, secure: req.nextUrl.protocol === "https:" };
      if (touch) {
        res.cookies.set(LT_COOKIE, serializeTouch(touch), { ...opts, maxAge: LT_MAX_AGE });
        if (!hasFt) res.cookies.set(FT_COOKIE, serializeTouch(touch), { ...opts, maxAge: FT_MAX_AGE });
      } else if (!hasFt) {
        res.cookies.set(FT_COOKIE, serializeTouch(directTouch(req.nextUrl)), { ...opts, maxAge: FT_MAX_AGE });
      }
    }
  } catch {}
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
