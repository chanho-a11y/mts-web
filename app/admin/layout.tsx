import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminToast from "@/components/admin-toast";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?error=" + encodeURIComponent("관리자 로그인이 필요합니다"));
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") redirect("/");

  type NavItem = { href: string; label: string; children?: { href: string; label: string }[] };
  const nav: NavItem[] = [
    { href: "/admin", label: "대시보드" },
    { href: "/admin/orders", label: "주문 관리" },
    { href: "/admin/products", label: "제품 관리" },
    { href: "/admin/blog", label: "블로그 관리" },
    { href: "/admin/customers", label: "고객 관리", children: [
      { href: "/admin/business", label: "사업자 승인" },
    ] },
    { href: "/admin/marketing", label: "마케팅", children: [
      { href: "/admin/email", label: "이메일" },
    ] },
    { href: "/admin/content", label: "사이트 관리자", children: [
      { href: "/admin/content/pages", label: "페이지 수정" },
      { href: "/admin/content/roles", label: "관리자 역할지정" },
    ] },
    { href: "/admin/kb", label: "지식 베이스" },
    { href: "/admin/store", label: "배송 관리" },
    { href: "/admin/analytics", label: "분석" },
  ];
  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
      <aside className="w-44 shrink-0">
        <p className="mb-3 text-xs font-bold uppercase text-neutral-400">Admin</p>
        <nav className="space-y-1 text-sm">
          {nav.map((n) => (
            <div key={n.href}>
              <Link href={n.href} className="block rounded px-2 py-1.5 hover:bg-neutral-100">{n.label}</Link>
              {n.children?.map((c) => (
                <Link key={c.href} href={c.href} className="block rounded px-2 py-1 pl-5 text-[13px] text-neutral-500 hover:bg-neutral-100">└ {c.label}</Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-4 border-t pt-3">
          <Link href="/admin/studio" className="block rounded px-2 py-1.5 text-sm font-medium text-clayDeep hover:bg-neutral-100">통합 스튜디오</Link>
          <p className="mt-1 px-2 text-[10px] text-neutral-400">제품 등록 정보를 불러와 상세페이지·블로그·카드뉴스·레이블·썸네일 생성</p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
      <AdminToast />
    </div>
  );
}
