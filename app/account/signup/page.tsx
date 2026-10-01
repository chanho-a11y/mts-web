import { getStorefrontContext } from "@/lib/storefront";
import SignupForm from "@/components/signup-form";
import { issueFormToken } from "@/lib/signup-guard";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: { error?: string; role?: string } }) {
  const { locale } = await getStorefrontContext();
  // D-097 ②: 렌더 시점을 서버에서 서명해 내려보낸다 → 제출까지 걸린 시간을 위조 없이 검증.
  const formToken = issueFormToken(Date.now());
  // B2B CTA(?role=business) 진입 시 사업자 탭을 미리 선택한다(D-129). 승인 게이트(D-055)는 그대로다.
  const initialRole = searchParams.role === "business" ? "business" : "individual";
  return <SignupForm error={searchParams.error} locale={locale} formToken={formToken} initialRole={initialRole} />;
}
