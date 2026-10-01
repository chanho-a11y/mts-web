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

const CONTACT_TYPES = ["general", "wholesale", "consulting", "education", "product"] as const;

export default async function ContactPage({ searchParams }: { searchParams?: { type?: string } }) {
  const { locale } = await getStorefrontContext();
  // B2B CTA(?type=wholesale) 진입 시 문의 유형을 미리 선택한다(D-129).
  const q = searchParams?.type;
  const defaultType = (CONTACT_TYPES as readonly string[]).includes(q ?? "") ? (q as string) : "general";
  return <ContactForm locale={locale} defaultType={defaultType} />;
}
