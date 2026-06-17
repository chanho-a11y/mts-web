export const dynamic = "force-dynamic";

export const metadata = { title: "디자인 스튜디오" };

// 디자인 스튜디오 원본을 내부에 임베드(외부 창 X). 내부 제품/콘텐츠와 연동(상단 '내부 연동' 바).
export default function AdminStudioPage() {
  return (
    <main className="-my-8">
      <div className="flex items-center justify-between py-3">
        <div>
          <h1 className="text-2xl font-bold">디자인 스튜디오</h1>
          <p className="text-sm text-neutral-500">상단 ‘내부 연동’ 바에서 제품을 불러오면 폼이 자동 채워지고, 생성물(상세 본문·블로그 초안)을 내부에 저장합니다.</p>
        </div>
        <a href="/tools/design-studio.html" target="_blank" rel="noreferrer" className="rounded border px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100">새 탭에서 열기 ↗</a>
      </div>
      <iframe
        src="/tools/design-studio.html"
        title="MTSPACE Design Studio"
        className="h-[calc(100vh-120px)] w-full rounded-lg border"
      />
    </main>
  );
}
