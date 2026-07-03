"use client";
import { useRef, useState } from "react";

// 상세페이지 인라인 편집기 — 실제 상세 레이아웃(고정)을 그대로 두고 텍스트/숫자만 직접 수정·저장.
// EN 전체·레시피·스토리 등 구조 편집은 '제품 수정' 폼에서. 여기서는 상세에 노출되는 KO 콘텐츠 중심.
export interface DetailInitial {
  slug: string;
  title_ko: string; title_en: string;
  one_liner: string;
  flavor_notes: string;   // "a · b · c"
  roast_level: string;
  weight_g: string;
  origin_country: string; origin_region: string;
  variety: string; altitude: string; process: string;
  key_color: string; key_color_text: string; key_color_check: string;
  recipe_preview: { title: string; rows: { label: string; value: string }[] }[];
}

const CSS = `
.mtpe{--paper:#FCFAF5;--tint:#F1EBDD;--tint2:#F3EEE2;--ink:#3C352C;--ink-soft:#5C574E;--mute:#8A8173;--faint:#A79E8D;--hair:#ECE4D4;--hair2:#EFE7D6;--maxw:1040px;background:#e7e3dc;color:var(--ink);font-family:'Helvetica Neue',Pretendard,Arial,sans-serif;padding-bottom:96px}
.mtpe .page{max-width:var(--maxw);margin:0 auto;background:var(--paper);box-shadow:0 2px 18px rgba(0,0,0,.10);overflow:hidden}
.mtpe .accent{height:4px;background:var(--point)}
.mtpe .bar{border-bottom:1px solid var(--hair);padding:15px 34px;display:flex;align-items:center;justify-content:space-between}
.mtpe .wm{font-weight:800;font-size:13px}.mtpe .wm .l{font-weight:200}
.mtpe .tagline{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:1.5px;color:var(--faint);text-transform:uppercase}
.mtpe .hero{position:relative;padding:38px 38px 34px;color:#fff;background-color:var(--point)}
.mtpe .hero .kicker{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.72)}
.mtpe .hero h1{font-weight:800;font-size:46px;line-height:1.04;margin:12px 0 6px}
.mtpe .hero .en{font-family:Spectral,serif;font-style:italic;font-size:21px;color:rgba(255,255,255,.9)}
.mtpe .hero .rule{width:48px;height:2px;background:rgba(255,255,255,.55);margin:18px 0}
.mtpe .sec{padding:30px 38px 0}
.mtpe h2.head{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:2px;color:var(--mute);text-transform:uppercase;margin:0 0 16px}
.mtpe .lead{font-family:'Noto Serif KR',serif;font-weight:300;font-size:15px;line-height:1.95;color:var(--ink);margin:0}
.mtpe .flav{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.mtpe .flav .card{background:var(--tint2);border-top:2px solid var(--point);padding:18px 14px;text-align:center}
.mtpe .flav .ft{font-family:Spectral,serif;font-size:19px;color:var(--point-text)}
.mtpe .grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 32px}
.mtpe .kv{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px solid var(--hair2)}
.mtpe .kv .k{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.7px;color:#b0a690;flex:none}
.mtpe .kv .v{font-size:13px;text-align:right;min-width:60px}
.mtpe .rec{display:flex;justify-content:space-between;align-items:baseline;gap:18px;padding:11px 0;border-bottom:1px solid var(--hair2)}
.mtpe .rec .rk{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.8px;color:var(--point-text);flex:none;width:120px}
.mtpe .rec .rn{font-family:'IBM Plex Mono',monospace;font-size:12.5px}
[data-field]{outline:1px dashed rgba(60,53,44,.28);outline-offset:2px;border-radius:2px;cursor:text;min-width:12px;display:inline-block}
[data-field]:focus{outline:2px solid var(--point);background:rgba(255,255,255,.35)}
.mtpe .hero [data-field]{outline-color:rgba(255,255,255,.5)}
.mtpe .savebar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;justify-content:center;gap:12px;background:#fff;border-top:1px solid var(--hair);padding:12px}
`;

function fv(el: HTMLElement | null): string { return (el?.innerText ?? "").replace(/\s+\n/g, "\n").trim(); }
function esc(s: string): string { return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// 비제어 contentEditable — dangerouslySetInnerHTML로 초기값만 주입해 리렌더 시 편집 내용이 초기화되지 않게 한다.
function Editable({ field, value, className, style }: { field: string; value: string; className?: string; style?: React.CSSProperties }) {
  return <span data-field={field} className={className} style={style} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: esc(value) }} />;
}

export default function DetailInlineEditor({ init }: { init: DetailInitial }) {
  const root = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const el = root.current;
    if (!el) return;
    const get = (name: string) => fv(el.querySelector(`[data-field="${name}"]`));
    const payload = {
      slug: init.slug,
      title_ko: get("title_ko"),
      title_en: get("title_en"),
      one_liner: get("one_liner"),
      flavor_notes: get("flavor_notes"),
      roast_level: get("roast_level"),
      weight_g: get("weight_g").replace(/[^0-9]/g, ""),
      origin_country: get("origin_country"),
      origin_region: get("origin_region"),
      variety: get("variety"),
      altitude: get("altitude"),
      process: get("process"),
    };
    setBusy(true); setStatus("저장 중…");
    try {
      const r = await fetch("/api/studio/detail-save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "저장 실패");
      setStatus("저장됨 ✓ 상세페이지에 반영되었습니다.");
    } catch (e: any) { setStatus(`실패: ${e?.message ?? "오류"}`); }
    finally { setBusy(false); }
  }

  const pointVars = { ["--point" as string]: init.key_color, ["--point-text" as string]: init.key_color_text, ["--check" as string]: init.key_color_check };
  const notes = init.flavor_notes.split(/[·,]/).map((s) => s.trim()).filter(Boolean).slice(0, 3);

  return (
    <div className="mtpe" style={pointVars} ref={root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="page">
        <div className="accent" />
        <header className="bar">
          <div className="wm">MTSPACE <span className="l">COFFEE</span></div>
          <div className="tagline">everyday excellence</div>
        </header>

        <section className="hero">
          <div className="kicker">{init.roast_level || "COFFEE"}</div>
          <h1><Editable field="title_ko" value={init.title_ko} /></h1>
          <div className="en"><Editable field="title_en" value={init.title_en} /></div>
          <div className="rule" />
        </section>

        <section className="sec">
          <h2 className="head">한 줄 소개 · one liner</h2>
          <p className="lead"><Editable field="one_liner" value={init.one_liner} /></p>
        </section>

        <section className="sec">
          <h2 className="head">Flavour Notes · 플레이버 노트</h2>
          <div className="flav">
            {(notes.length ? notes : ["—"]).map((n, i) => <div className="card" key={i}><div className="ft">{n}</div></div>)}
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: "var(--mute)" }}>플레이버 편집 → 아래 <b>FLAVOUR</b> 칸 (쉼표 또는 · 로 구분)</p>
        </section>

        <section className="sec">
          <h2 className="head">Coffee Information · 커피 정보</h2>
          <div className="grid2">
            <div className="kv"><span className="k">ROAST</span><Editable field="roast_level" value={init.roast_level} className="v" /></div>
            <div className="kv"><span className="k">FLAVOUR</span><Editable field="flavor_notes" value={init.flavor_notes} className="v" /></div>
            <div className="kv"><span className="k">WEIGHT</span><Editable field="weight_g" value={init.weight_g} className="v" /></div>
            <div className="kv"><span className="k">ORIGIN</span><Editable field="origin_country" value={init.origin_country} className="v" /></div>
            <div className="kv"><span className="k">REGION</span><Editable field="origin_region" value={init.origin_region} className="v" /></div>
            <div className="kv"><span className="k">VARIETAL</span><Editable field="variety" value={init.variety} className="v" /></div>
            <div className="kv"><span className="k">ALTITUDE</span><Editable field="altitude" value={init.altitude} className="v" /></div>
            <div className="kv"><span className="k">PROCESS</span><Editable field="process" value={init.process} className="v" /></div>
          </div>

          {init.recipe_preview.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <h3 className="head" style={{ margin: "0 0 12px" }}>Recipe · 레시피 <span style={{ color: "var(--faint)" }}>(읽기전용 · 제품 수정에서 편집)</span></h3>
              {init.recipe_preview.map((b, bi) => (
                <div key={bi} style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: "var(--point-text)", textTransform: "uppercase", marginBottom: 4 }}>{b.title}</div>
                  {b.rows.map((rw, ri) => <div className="rec" key={ri}><span className="rk">{rw.label}</span><span className="rn">{rw.value}</span></div>)}
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ height: 24 }} />
      </div>

      <div className="savebar">
        <span style={{ fontSize: 12, color: status.startsWith("실패") ? "#c0392b" : "#5C574E" }}>{status || "텍스트를 클릭해 수정한 뒤 저장하세요 · 레이아웃 고정"}</span>
        <button onClick={save} disabled={busy} style={{ background: "#3C352C", color: "#F6F1E7", border: "none", borderRadius: 999, padding: "9px 22px", fontSize: 13, cursor: "pointer", opacity: busy ? 0.5 : 1 }}>{busy ? "저장 중…" : "저장"}</button>
        <a href={`/products/${init.slug}`} target="_blank" rel="noopener" style={{ fontSize: 12, color: "#5C574E", textDecoration: "underline" }}>실제 상세 보기 ↗</a>
      </div>
    </div>
  );
}
