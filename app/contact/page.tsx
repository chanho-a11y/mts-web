import { getStorefrontContext } from "@/lib/storefront";
import ContactForm from "@/components/contact-form";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const { locale } = await getStorefrontContext();
  return <ContactForm locale={locale} />;
}
