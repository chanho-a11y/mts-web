"use client";
import { useRouter } from "next/navigation";

export default function LangToggle({ locale }: { locale: "ko" | "en" }) {
  const router = useRouter();
  function set(l: "ko" | "en") {
    document.cookie = `locale=${l};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }
  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={() => set("ko")}
        className={locale === "ko" ? "font-bold" : "opacity-50"}
        aria-pressed={locale === "ko"}
      >
        KO
      </button>
      <span className="opacity-30">/</span>
      <button
        onClick={() => set("en")}
        className={locale === "en" ? "font-bold" : "opacity-50"}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
