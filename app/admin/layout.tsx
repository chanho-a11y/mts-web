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
    { href: "/admin/business", label: "사업자 승인" },
  ];
  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
      <aside className="w-44 shrink-0">
        <p className="mb-3 text-xs font-bold uppercase text-neutral-400">Admin</p>
        <nav className="space-y-1 text-sm">
          {nav.map((n) => <Link key={n.href} href={n.href} className="block rounded px-2 py-1.5 hover:bg-neutral-100">{n.label}</Link>)}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
