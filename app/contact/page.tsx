import type { Metadata } from "next";
import { getStorefrontContext } from "@/lib/storefront";
import ContactForm from "@/components/contact-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { brand, locale } = await getStorefrontContext();
  const title = locale === "en" ? "Contact Us" : "문의하기";
  const description = locale === "en"
    ? `Contact ${brand.name} for wholesale supply, cafe consulting, barista education, or product inquiries.`
    : `${brand.name}에 도매 납품·카페 컨설팅·바리스타 교육·제품 문의를 남겨주세요. 어떤 문의든 편하게 연락 주세요.`;
  return { title, description, alternates: { canonical: "/contact" }, openGraph: { title: `${title} · ${brand.name}`, description, type: "website" } };
}

export default async function ContactPage() {
  const { locale } = await getStorefrontContext();
  return <ContactForm locale={locale} />;
}
