import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?error=" + encodeURIComponent("관리자 로그인이 필요합니다"));
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") redirect("/");

  const nav = [
    { href: "/admin", label: "대시보드" },
    { href: "/admin/orders", label: "주문 관리" },
    { href: "/admin/products", label: "제품 관리" },
    { href: "/admin/templates", label: "양식 관리" },
    { href: "/admin/customers", label: "고객 관리" },
    { href: "/admin/business", label: "사업자 승인" },
    { href: "/admin/marketing", label: "마케팅" },
    { href: "/admin/email", label: "이메일" },
    { href: "/admin/content", label: "콘텐츠 관리" },
    { href: "/admin/kb", label: "지식 베이스" },
    { href: "/admin/store", label: "스토어 정보" },
    { href: "/admin/analytics", label: "분석" },
  ];
  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
      <aside className="w-44 shrink-0">
        <p className="mb-3 text-xs font-bold uppercase text-neutral-400">Admin</p>
        <nav className="space-y-1 text-sm">
          {nav.map((n) => <Link key={n.href} href={n.href} className="block rounded px-2 py-1.5 hover:bg-neutral-100">{n.label}</Link>)}
        </nav>
        <div className="mt-4 border-t pt-3">
          <a href="/tools/design-studio.html" target="_blank" rel="noreferrer" className="block rounded px-2 py-1.5 text-sm text-brandBlue hover:bg-neutral-100">디자인 스튜디오 ↗</a>
          <p className="mt-1 px-2 text-[10px] text-neutral-400">라벨·카드뉴스·썸네일·상세·블로그 생성 도구(원본 임포트)</p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
