// 교육자료 공용 로직/뷰. ko/en 두 라우트가 모두 이 파일을 쓴다.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JsonLd from "@/components/json-ld";
import { absoluteUrl, siteBaseUrl, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { CHAPTERS, COPY_KO, LEVEL_LABEL, type ChapterCopy, type ChapterMeta, type Level } from "./_content/meta";
import { COPY_EN } from "./_content/meta.en";
import contentKo from "./_content/content.ko.json";
import contentEn from "./_content/content.en.json";

export type EduLocale = "ko" | "en";

interface Section { id: string; kicker: string; title: string; html: string }
interface Chapter { intro: { title: string; lead: string; leadHtml: string; figure: string }; sections: Section[] }
type ContentMap = Record<string, Chapter>;

const CONTENT: Record<EduLocale, ContentMap> = {
  ko: contentKo as unknown as ContentMap,
  en: contentEn as unknown as ContentMap,
};
const COPY: Record<EduLocale, Record<string, ChapterCopy>> = { ko: COPY_KO, en: COPY_EN };

/** /education (ko) · /en/education (en) */
export const basePath = (l: EduLocale) => (l === "en" ? "/en/education" : "/education");
export const chapterPath = (l: EduLocale, slug: string) => `${basePath(l)}/${slug}`;

export const UI = {
  ko: {
    section: "교육 자료",
    title: "커피 교육 자료",
    lede: "생두에서 한 잔까지, 그리고 WBC·WBrC 경기까지 — 스페셜티 커피의 전 영역을 13개 챕터로 정리했습니다. 각 항목은 용어와 정의 → 무엇이고 왜 그런가 → 어떻게 그렇게 되는가 → 실제 적용 예의 순서로 구성됩니다.",
    author: "글 홍찬호 (Chanho Hong)",
    chapters: "챕터",
    sections: "개 절",
    inThisChapter: "이 챕터에서 다루는 것",
    answers: "이 챕터가 답하는 질문",
    prev: "이전 챕터",
    next: "다음 챕터",
    backToIndex: "전체 챕터 보기",
    otherLang: "English",
    contents: "목차",
    sourceNote:
      "수치와 규정은 1차 사내 지식베이스 → 2차 SCA·WBC·동료평가 논문 → 3차 웹 순의 출처 위계에 따라 검증했습니다. 근거가 불충분한 항목은 본문에 [확인 필요]로 표시했습니다.",
    consultCta: "교육·컨설팅 문의",
    consultDesc: "로스터리 셋업, 프로파일 설계, 바리스타 교육, 대회 준비 — 현장에 맞춘 컨설팅을 제공합니다.",
  },
  en: {
    section: "Education",
    title: "Coffee Education",
    lede: "From green coffee to the finished cup, and on to WBC and WBrC competition — the whole of specialty coffee set out in thirteen chapters. Every topic follows the same four steps: term and definition → what it is and why → how it comes about → how it applies in practice.",
    author: "Written by Chanho Hong",
    chapters: "chapters",
    sections: "sections",
    inThisChapter: "What this chapter covers",
    answers: "Questions this chapter answers",
    prev: "Previous",
    next: "Next",
    backToIndex: "All chapters",
    otherLang: "한국어",
    contents: "Contents",
    sourceNote:
      "Figures and regulations are verified against a source hierarchy: Tier 1 in-house knowledge base → Tier 2 SCA·WBC and peer-reviewed literature → Tier 3 web. Anything not adequately supported is marked [to verify] in the text.",
    consultCta: "Education & consulting",
    consultDesc: "Roastery setup, profile design, barista training, competition preparation — consulting shaped to the site.",
  },
} as const;

export function chapterBySlug(slug: string): ChapterMeta | undefined {
  return CHAPTERS.find((c) => c.slug === slug);
}
export function chapterCopy(l: EduLocale, slug: string): ChapterCopy | undefined {
  return COPY[l][slug];
}
export function chapterContent(l: EduLocale, cid: string): Chapter | undefined {
  return CONTENT[l][cid];
}
export function neighbours(slug: string) {
  const i = CHAPTERS.findIndex((c) => c.slug === slug);
  return { prev: i > 0 ? CHAPTERS[i - 1] : null, next: i >= 0 && i < CHAPTERS.length - 1 ? CHAPTERS[i + 1] : null };
}

/* ------------------------------ metadata ------------------------------- */

export function indexMetadata(l: EduLocale): Metadata {
  const u = UI[l];
  const path = basePath(l);
  const desc =
    l === "ko"
      ? "생두·추출 이론·센서리·브루잉·에스프레소·밀크·로스팅·품질관리·로스터리 셋업·WBC·WBrC까지 13개 챕터로 정리한 스페셜티 커피 교육 자료. 홍찬호 저술, MTSPACE COFFEE 발행."
      : "A thirteen-chapter specialty coffee education manual covering green coffee, extraction theory, sensory, brewing, espresso, milk, roasting, quality control, roastery setup, WBC and WBrC. Written by Chanho Hong for MTSPACE COFFEE.";
  return {
    title: u.title,
    description: desc,
    alternates: {
      canonical: path,
      languages: { ko: "/education", en: "/en/education", "x-default": "/education" },
    },
    openGraph: {
      type: "website",
      title: u.title,
      description: desc,
      url: absoluteUrl(path),
      locale: l === "ko" ? "ko_KR" : "en_US",
    },
  };
}

export function chapterMetadata(l: EduLocale, slug: string): Metadata {
  const meta = chapterBySlug(slug);
  const copy = chapterCopy(l, slug);
  if (!meta || !copy) return {};
  const path = chapterPath(l, slug);
  return {
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    authors: [{ name: "Chanho Hong" }],
    alternates: {
      canonical: path,
      languages: {
        ko: `/education/${slug}`,
        en: `/en/education/${slug}`,
        "x-default": `/education/${slug}`,
      },
    },
    openGraph: {
      type: "article",
      title: copy.title,
      description: copy.description,
      url: absoluteUrl(path),
      locale: l === "ko" ? "ko_KR" : "en_US",
      images: [{ url: absoluteUrl(`/education/icons/${meta.icon}.svg`) }],
    },
    twitter: { card: "summary", title: copy.title, description: copy.description },
  };
}

/* ------------------------------- JSON-LD -------------------------------- */

function courseJsonLd(l: EduLocale) {
  const u = UI[l];
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: u.title,
    description: l === "ko"
      ? "스페셜티 커피 전 영역을 다루는 13개 챕터 교육 과정."
      : "A thirteen-chapter course covering the whole of specialty coffee.",
    url: absoluteUrl(basePath(l)),
    inLanguage: l === "ko" ? "ko-KR" : "en",
    provider: { "@type": "Organization", name: "MTSPACE COFFEE", url: siteBaseUrl() },
    author: { "@type": "Person", name: "Chanho Hong" },
    isAccessibleForFree: true,
    hasCourseInstance: CHAPTERS.map((c) => ({
      "@type": "CourseInstance",
      name: COPY[l][c.slug]?.title ?? c.slug,
      url: absoluteUrl(chapterPath(l, c.slug)),
      courseMode: "online",
    })),
  };
}

function learningResourceJsonLd(l: EduLocale, meta: ChapterMeta, copy: ChapterCopy) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: copy.title,
    headline: copy.title,
    description: copy.description,
    url: absoluteUrl(chapterPath(l, meta.slug)),
    inLanguage: l === "ko" ? "ko-KR" : "en",
    learningResourceType: l === "ko" ? "교육 자료" : "Educational manual",
    educationalLevel: LEVEL_LABEL[meta.level][l],
    keywords: copy.keywords.join(", "),
    isAccessibleForFree: true,
    author: { "@type": "Person", name: "Chanho Hong" },
    publisher: {
      "@type": "Organization",
      name: "MTSPACE COFFEE",
      logo: { "@type": "ImageObject", url: absoluteUrl("/images/mtspace-logo.png") },
    },
    isPartOf: { "@type": "Course", name: UI[l].title, url: absoluteUrl(basePath(l)) },
  };
}

/* -------------------------------- views --------------------------------- */

function Icon({ name, size = 44 }: { name: string; size?: number }) {
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={`/education/icons/${name}.svg`} alt="" width={size} height={size} className="shrink-0" aria-hidden />;
}

export function EducationIndex({ locale }: { locale: EduLocale }) {
  const u = UI[locale];
  const levels: Level[] = ["basic", "expert", "competition"];
  const totalSections = CHAPTERS.reduce((n, c) => n + (chapterContent(locale, c.cid)?.sections.length ?? 0), 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <JsonLd
        data={[
          courseJsonLd(locale),
          breadcrumbJsonLd([
            { name: locale === "ko" ? "홈" : "Home", path: "/" },
            { name: u.section, path: basePath(locale) },
          ]),
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-clayDeep">{u.section}</p>
          <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-ink md:text-4xl">{u.title}</h1>
        </div>
        <Link
          href={locale === "ko" ? "/en/education" : "/education"}
          hrefLang={locale === "ko" ? "en" : "ko"}
          className="mt-1 shrink-0 rounded-card border border-line px-3 py-1 text-xs text-inkSoft hover:bg-oat"
        >
          {u.otherLang}
        </Link>
      </div>

      <p className="mt-5 max-w-3xl text-[15.5px] leading-relaxed text-inkSoft">{u.lede}</p>
      <p className="mt-3 text-xs text-inkSoft">
        {u.author} · {CHAPTERS.length} {u.chapters} · {totalSections} {u.sections}
      </p>

      {levels.map((lv) => {
        const group = CHAPTERS.filter((c) => c.level === lv);
        if (!group.length) return null;
        return (
          <section key={lv} className="mt-12">
            <h2 className="text-[11px] font-bold uppercase tracking-[.16em] text-inkSoft">{LEVEL_LABEL[lv][locale]}</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {group.map((c) => {
                const copy = COPY[locale][c.slug];
                if (!copy) return null;
                return (
                  <li key={c.slug}>
                    <Link
                      href={chapterPath(locale, c.slug)}
                      className="flex h-full gap-4 rounded-card border border-line bg-paper p-5 transition-colors hover:border-clay"
                    >
                      <Icon name={c.icon} />
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] tracking-widest text-clayDeep">{c.no}</p>
                        <h3 className="mt-1 font-serif text-[17px] font-bold leading-snug text-ink">{copy.title}</h3>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-inkSoft">{copy.tagline}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="mt-14 border-t border-line pt-5 text-xs leading-relaxed text-inkSoft">{u.sourceNote}</p>

      <div className="mt-8 rounded-card border border-line bg-oat p-6">
        <h2 className="font-serif text-lg font-bold text-ink">{u.consultCta}</h2>
        <p className="mt-2 text-sm text-inkSoft">{u.consultDesc}</p>
        <Link href="/consulting" className="mt-4 inline-block rounded-card bg-ink px-5 py-2.5 text-sm font-semibold text-oat hover:opacity-90">
          {u.consultCta} →
        </Link>
      </div>
    </main>
  );
}

export function ChapterView({ locale, slug }: { locale: EduLocale; slug: string }) {
  const meta = chapterBySlug(slug);
  const copy = meta ? COPY[locale][slug] : undefined;
  const body = meta ? chapterContent(locale, meta.cid) : undefined;
  if (!meta || !copy || !body) notFound();

  const u = UI[locale];
  const { prev, next } = neighbours(slug);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={[
          learningResourceJsonLd(locale, meta, copy),
          faqJsonLd(copy.faq),
          breadcrumbJsonLd([
            { name: locale === "ko" ? "홈" : "Home", path: "/" },
            { name: u.section, path: basePath(locale) },
            { name: copy.title, path: chapterPath(locale, slug) },
          ]),
        ]}
      />

      <nav className="flex items-center justify-between gap-4 text-xs">
        <Link href={basePath(locale)} className="text-inkSoft hover:text-ink">
          ← {u.backToIndex}
        </Link>
        <Link
          href={chapterPath(locale === "ko" ? "en" : "ko", slug)}
          hrefLang={locale === "ko" ? "en" : "ko"}
          className="rounded-card border border-line px-3 py-1 text-inkSoft hover:bg-oat"
        >
          {u.otherLang}
        </Link>
      </nav>

      <header className="mt-8 flex items-start gap-4 border-b border-line pb-8">
        <Icon name={meta.icon} size={52} />
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-widest text-clayDeep">
            {meta.no} · {LEVEL_LABEL[meta.level][locale]}
          </p>
          <h1 className="mt-1.5 font-serif text-[28px] font-bold leading-tight text-ink md:text-[32px]">{copy.title}</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-inkSoft">{copy.tagline}</p>
          <p className="mt-3 text-xs text-inkSoft">{u.author}</p>
        </div>
      </header>

      {/* 이 챕터에서 다루는 것 — 절 목록 */}
      <section className="mt-8 rounded-card border border-line bg-oatLight p-5">
        <h2 className="text-[11px] font-bold uppercase tracking-[.14em] text-inkSoft">{u.inThisChapter}</h2>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink">{copy.description}</p>
        <ol className="mt-4 grid gap-1.5 text-[13.5px] md:grid-cols-2">
          {body.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-inkSoft hover:text-clayDeep">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </section>

      {/* 본문 */}
      <div className="edu-prose mt-12">
        {body.intro.leadHtml && (
          <p className="lead-in" dangerouslySetInnerHTML={{ __html: body.intro.leadHtml }} />
        )}
        {body.intro.figure && <div dangerouslySetInnerHTML={{ __html: body.intro.figure }} />}
        {body.sections.map((s) => (
          <div key={s.id} dangerouslySetInnerHTML={{ __html: s.html }} />
        ))}
      </div>

      {/* 이 챕터가 답하는 질문 */}
      <section className="mt-14 border-t border-line pt-8">
        <h2 className="font-serif text-xl font-bold text-ink">{u.answers}</h2>
        <dl className="mt-5 space-y-5">
          {copy.faq.map((f) => (
            <div key={f.q} className="rounded-card border border-line bg-paper p-5">
              <dt className="font-semibold text-ink">{f.q}</dt>
              <dd className="mt-2 text-[14.5px] leading-relaxed text-inkSoft">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 이전 / 다음 */}
      <nav className="mt-12 grid gap-3 border-t border-line pt-8 md:grid-cols-2">
        {prev ? (
          <Link href={chapterPath(locale, prev.slug)} className="rounded-card border border-line p-4 hover:border-clay">
            <span className="text-[11px] uppercase tracking-widest text-inkSoft">← {u.prev}</span>
            <span className="mt-1 block font-serif text-[15px] font-bold text-ink">{COPY[locale][prev.slug]?.title}</span>
          </Link>
        ) : <span />}
        {next && (
          <Link href={chapterPath(locale, next.slug)} className="rounded-card border border-line p-4 text-right hover:border-clay">
            <span className="text-[11px] uppercase tracking-widest text-inkSoft">{u.next} →</span>
            <span className="mt-1 block font-serif text-[15px] font-bold text-ink">{COPY[locale][next.slug]?.title}</span>
          </Link>
        )}
      </nav>

      <p className="mt-10 text-xs leading-relaxed text-inkSoft">{u.sourceNote}</p>
    </main>
  );
}
