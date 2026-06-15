import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { brandForHost } from "@/lib/brands";

// Multi-storefront + locale + Supabase session refresh.
export async function middleware(req: NextRequest) {
  const brand = brandForHost(req.headers.get("host"));
  const country = (req.geo?.country ?? "KR").toUpperCase();
  const cookieLocale = req.cookies.get("locale")?.value;
  const locale = cookieLocale ?? (country === "KR" ? "ko" : "en");

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

  if (!cookieLocale) res.cookies.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
