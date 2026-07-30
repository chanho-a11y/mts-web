import { getStorefrontContext } from "@/lib/storefront";
import SignupForm from "@/components/signup-form";
import { issueFormToken } from "@/lib/signup-guard";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  const { locale } = await getStorefrontContext();
  // D-097 ②: 렌더 시점을 서버에서 서명해 내려보낸다 → 제출까지 걸린 시간을 위조 없이 검증.
  const formToken = issueFormToken(Date.now());
  return <SignupForm error={searchParams.error} locale={locale} formToken={formToken} />;
}
