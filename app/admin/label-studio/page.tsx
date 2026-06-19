export const dynamic = "force-dynamic";
export const metadata = { title: "레이블 스튜디오" };

// 새 레이블 제작기(180×130mm 3박스, 1:1 정밀)를 내부 임베드. 상단 바에서 기존 제품을 불러오면 자동 주입.
export default function AdminLabelStudioPage() {
  return (
    <main className="-my-8">
      <div className="flex items-center justify-between py-3">
        <div>
          <h1 className="text-2xl font-bold">레이블 스튜디오</h1>
          <p className="text-sm text-inkSoft">180×130mm · 3박스(1:1:1). 상단 ‘내부 제품 연동’에서 기존 제품을 불러오면 품목보고·커피정보·레시피·포인트컬러가 자동 채워집니다. 인쇄/PDF는 스튜디오 내 버튼.</p>
        </div>
        <a href="/tools/label-studio.html" target="_blank" rel="noreferrer" className="rounded-card border border-line px-3 py-1.5 text-xs text-inkSoft hover:bg-sand">새 탭에서 열기 ↗</a>
      </div>
      <iframe
        src="/tools/label-studio.html"
        title="MTSPACE Label Studio"
        className="h-[calc(100vh-120px)] w-full rounded-card border border-line bg-paper"
      />
    </main>
  );
}
