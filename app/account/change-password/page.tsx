import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePasswordAction } from "./actions";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");
  const { data: prof } = await supabase.from("profiles").select("must_change_password").eq("id", user.id).maybeSingle();

  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-extrabold">{tt.changePassword}</h1>
      {prof?.must_change_password && (
        <p className="mt-2 rounded bg-amber-50 px-4 py-2 text-sm text-amber-700">{tt.firstLoginNotice}</p>
      )}
      {searchParams.error && <p className="mt-3 rounded bg-red-50 px-4 py-2 text-sm text-red-600">{searchParams.error}</p>}
      <form action={updatePasswordAction} className="mt-6 space-y-4">
        <label className="block text-sm">{tt.newPassword}<input name="password" type="password" required minLength={6} className={input} /></label>
        <label className="block text-sm">{tt.confirmNewPassword}<input name="password2" type="password" required minLength={6} className={input} /></label>
        <button className="w-full rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-oat">{tt.changePasswordSubmit}</button>
      </form>
    </main>
  );
}
