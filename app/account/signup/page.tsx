import { getStorefrontContext } from "@/lib/storefront";
import SignupForm from "@/components/signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  const { locale } = await getStorefrontContext();
  return <SignupForm error={searchParams.error} locale={locale} />;
}
