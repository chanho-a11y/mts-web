#!/usr/bin/env python3
"""MTSPACE COFFEE 교정 산출물 생성기 (build_outputs v2)

긴 글(세 본)일 때: 세 교정본 DOCX + 비교 PDF(사실 대조 표 포함) + 검수 JSON 을 만든다.
양식은 chanho-document-design v1.0(그레이스케일, 서체 세 역할, A4 여백 위 34 / 좌우 20 / 아래 20mm)을 따른다.

사용:
  python3 -I build_outputs.py --title "제목" --channel mall_blog --orig 원문.txt \
      --min 최소.txt --mid 중간.txt --max 적극.txt --out 출력폴더 [--slug 이름] [--mark ch_logo.png] [--scores 점수.json]
  짧은 글(교정본 1개): --one 교정본.txt 를 주면 DOCX 1개 + 검수 JSON 만 만든다.
  --scores: {"원문": {"M1":20,...,"total":78,"grade":"C"}, "최소": {...}, ...}  (채점은 요청 시만)
  --mark: ch. 마크 PNG. 없으면 마크 없이 만들고 [확인 필요]를 남긴다(마크를 글자로 흉내 내지 않는다).
"""
import argparse, json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from mtspace_check import load_text, run as check_run  # noqa: E402
from fact_lock import extract, diff as fact_diff  # noqa: E402

KB = json.load(open(HERE.parent / "references" / "kb_snapshot.json", encoding="utf-8"))
INK, BODY, SUB, MUTED, LINE, LINE2, PAPER = "141414", "3D3D3D", "6E6E6E", "8C8C8C", "D6D5D3", "E8E7E5", "F3F2F0"
LABEL = {"min": "최소", "mid": "중간", "max": "적극", "one": "교정본"}


# ---------- DOCX ----------
def docx_out(path, title, subtitle, text, mark=None):
    from docx import Document
    from docx.shared import Mm, Pt, RGBColor
    from docx.oxml.ns import qn
    d = Document()
    for s in d.sections:
        s.top_margin, s.left_margin, s.right_margin, s.bottom_margin = Mm(34), Mm(20), Mm(20), Mm(20)
        s.header_distance = Mm(11)
        if mark and pathlib.Path(mark).exists():
            s.header.paragraphs[0].add_run().add_picture(str(mark), height=Mm(7.2))
    st = d.styles["Normal"]
    st.font.name = "Noto Sans KR Light"; st.font.size = Pt(9.5); st.font.color.rgb = RGBColor.from_string(BODY)
    st.element.rPr.rFonts.set(qn("w:eastAsia"), "Noto Sans KR Light")
    st.paragraph_format.line_spacing = 2.0
    h = d.add_paragraph(); r = h.add_run(title)
    r.font.name = "Noto Serif KR"; r._element.rPr.rFonts.set(qn("w:eastAsia"), "Noto Serif KR")
    r.font.size = Pt(17); r.font.color.rgb = RGBColor.from_string(INK)
    sp = d.add_paragraph(); rs = sp.add_run(subtitle); rs.font.size = Pt(9.4); rs.font.color.rgb = RGBColor.from_string(SUB)
    for block in re.split(r"\n\s*\n", text.strip()):
        p = d.add_paragraph()
        for k, line in enumerate(block.splitlines()):
            if k:
                p.add_run().add_break()
            run = p.add_run(line)
            if re.match(r"^(#{1,4}\s|\[제목\]|Q\.)", line):
                run.font.color.rgb = RGBColor.from_string(INK); run.bold = False
    d.save(str(path))


# ---------- PDF (HTML → Chromium, chanho-document-design 방식) ----------
CSS = """@page{size:A4 landscape;margin:34mm 20mm 20mm 20mm}
*{box-sizing:border-box} body{margin:0;font-family:"Noto Sans KR","Noto Sans CJK KR","Apple SD Gothic Neo",sans-serif;font-weight:300;
font-size:8.6pt;line-height:1.75;color:#3D3D3D;word-break:keep-all;overflow-wrap:anywhere;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.eye{font-family:"IBM Plex Mono","Noto Sans Mono CJK KR",monospace;font-size:7.2pt;letter-spacing:1.6px;text-transform:uppercase;color:#8C8C8C}
.ttl{font-family:"Noto Serif KR","Noto Serif CJK KR",serif;font-size:20pt;font-weight:400;color:#141414;margin:2mm 0 6mm}
h2{font-family:"Noto Serif KR","Noto Serif CJK KR",serif;font-size:13pt;font-weight:400;color:#262626;margin:9mm 0 5mm;padding-bottom:4mm;border-bottom:1px solid #141414;break-after:avoid}
h2 i{font-family:"Noto Serif KR",serif;color:#8C8C8C;margin-right:4mm}
table{width:100%;border-collapse:collapse;font-size:7.6pt;line-height:1.55;margin:0 0 4mm}
th{font-family:"IBM Plex Mono","Noto Sans Mono CJK KR",monospace;font-weight:400;font-size:6.6pt;letter-spacing:1px;color:#8C8C8C;text-align:left;border-bottom:1px solid #D6D5D3;padding:0 3mm 2mm 0}
td{border-bottom:1px solid #E8E7E5;padding:2mm 3mm 2mm 0;vertical-align:top;white-space:pre-wrap} td:first-child{color:#141414}
tr{break-inside:avoid} .warn{border-left:2px solid #141414;padding:1mm 0 1mm 4mm;margin:3mm 0}
.check{display:inline-block;font-size:7pt;font-weight:500;color:#141414;border:1px solid #141414;border-radius:999px;padding:0 2mm}
.hold{color:#141414;font-weight:500} .np{break-before:page}"""


def chromium_pdf(html_path, pdf_path, title, mark):
    from playwright.sync_api import sync_playwright
    import base64
    header = "<span></span>"
    if mark and pathlib.Path(mark).exists():
        uri = "data:image/png;base64," + base64.b64encode(pathlib.Path(mark).read_bytes()).decode()
        header = f'<div style="width:100%;padding:0 20mm;margin-top:11mm"><img src="{uri}" style="height:7.2mm;display:block"></div>'
    footer = ('<div style="width:100%;padding:0 20mm;display:flex;font-family:monospace;font-size:6.2pt;color:#ABABAB">'
              f'<span>{title} 교정 비교</span><span style="margin-left:auto">MTSPACE COFFEE content check&nbsp;&nbsp;'
              '<span class="pageNumber" style="color:#141414"></span></span></div>')
    with sync_playwright() as p:
        b = None
        for kw in ({}, {"executable_path": "/usr/bin/google-chrome"}, {"channel": "chrome"}):
            try:
                b = p.chromium.launch(**kw); break
            except Exception:
                continue
        if b is None:
            sys.exit("Chromium 을 띄우지 못했다. playwright install chromium 후 다시 실행")
        pg = b.new_page(); pg.goto(pathlib.Path(html_path).resolve().as_uri()); pg.evaluate("document.fonts.ready")
        pg.pdf(path=str(pdf_path), print_background=True, prefer_css_page_size=True,
               display_header_footer=True, header_template=header, footer_template=footer)
        b.close()


def pdf_out(path, title, channel, orig, versions, checks, facts, scores, mark):
    from html import escape as E
    keys = [k for k in ("min", "mid", "max") if k in versions]
    sec = [0]

    def h2(t):
        sec[0] += 1
        return f"<h2><i>{sec[0]:02d}</i>{E(t)}</h2>"
    out = [f'<div class="eye">CONTENT CHECK / {E(channel.upper())}</div><div class="ttl">{E(title)}</div>']
    if not (mark and pathlib.Path(mark).exists()):
        out.append('<div class="warn"><span class="check">확인 필요</span> ch. 마크 이미지가 없어 마크 없이 만들었다</div>')
    out.append(h2("판정 요약"))
    out.append("<table><tr><th>본</th><th>막음</th><th>고침</th><th>검토</th><th>사실 대조</th><th>발행</th></tr>")
    for k in ["orig"] + keys:
        s = checks[k]["summary"]; fd = "기준" if k == "orig" else facts[k]["verdict"]
        hold = (checks[k]["hold"] or fd == "BLOCK")
        out.append(f"<tr><td>{'원문' if k == 'orig' else LABEL[k]}</td><td>{s['BLOCK']}</td><td>{s['FIX']}</td><td>{s['REVIEW']}</td>"
                   f"<td>{fd}</td><td class='{'hold' if hold else ''}'>{'보류' if hold else '가능'}</td></tr>")
    out.append("</table>")
    if scores:
        codes = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"]
        out.append(h2("채점 (원문 점수 먼저 고정)"))
        out.append("<table><tr><th>본</th>" + "".join(f"<th>{c}</th>" for c in codes) + "<th>합계</th><th>등급</th></tr>")
        for name, sc in scores.items():
            out.append(f"<tr><td>{E(name)}</td>" + "".join(f"<td>{sc.get(c, '')}</td>" for c in codes) + f"<td>{sc.get('total', '')}</td><td>{sc.get('grade', '')}</td></tr>")
        out.append("</table>")
    out.append(h2("사실 대조"))
    out.append("<table><tr><th>분류</th><th>사실</th><th>원문</th>" + "".join(f"<th>{LABEL[k]}</th>" for k in keys) + "</tr>")
    for fact, cat in sorted(extract(orig).items(), key=lambda kv: kv[1]):
        cells = []
        for k in keys:
            fd = facts[k]
            if any(x["fact"] == fact for x in fd["missing"]): v = "<b>빠짐 (막음)</b>"
            elif any(x["fact"] == fact for x in fd["intended"]): v = "삭제 (금지어)"
            elif any(x["fact"] == fact for x in fd["item_missing"]): v = "항목 빠짐 (검토)"
            else: v = "있음"
            cells.append(f"<td>{v}</td>")
        out.append(f"<tr><td>{E(cat)}</td><td>{E(fact)}</td><td>있음</td>{''.join(cells)}</tr>")
    for k in keys:
        for x in facts[k]["added"]:
            out.append(f"<tr><td>{E(x['cat'])}</td><td>{E(x['fact'])}</td><td>없음</td>" +
                       "".join(f"<td>{'<b>새로 생김 (막음)</b>' if kk == k else ''}</td>" for kk in keys) + "</tr>")
    out.append("</table>")
    out.append('<div class="np"></div>' + h2("원문 지적 목록"))
    out.append("<table><tr><th>판정</th><th>줄</th><th>규칙</th><th>찾은 말</th><th>설명</th></tr>")
    for x in checks["orig"]["findings"][:150]:
        out.append(f"<tr><td>{x['code']}</td><td>{x['line'] or ''}</td><td>{E(x['rule'])}</td><td>{E(x['match'] or '')}</td>"
                   f"<td>{E(x['msg'] + (' → ' + x['fix'] if x['fix'] else ''))}</td></tr>")
    out.append("</table>")
    out.append('<div class="np"></div>' + h2("나란히 보기"))
    cols = [orig] + [versions[k] for k in keys]
    paras = [re.split(r"\n\s*\n", x.strip()) for x in cols]
    out.append("<table><tr><th>원문</th>" + "".join(f"<th>{LABEL[k]}</th>" for k in keys) + "</tr>")
    for i in range(max(len(p) for p in paras)):
        out.append("<tr>" + "".join(f"<td style='width:{100 // len(cols)}%'>{E(p[i]) if i < len(p) else ''}</td>" for p in paras) + "</tr>")
    out.append("</table>")
    hp = pathlib.Path(path).with_suffix(".html")
    hp.write_text(f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(out)}</body></html>', encoding="utf-8")
    chromium_pdf(hp, path, title, mark)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True); ap.add_argument("--channel", required=True)
    ap.add_argument("--orig", required=True); ap.add_argument("--out", required=True)
    for k in ("min", "mid", "max", "one"):
        ap.add_argument(f"--{k}")
    ap.add_argument("--slug"); ap.add_argument("--mark"); ap.add_argument("--scores")
    a = ap.parse_args()
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    slug = a.slug or re.sub(r"[^\w가-힣]+", "_", a.title)[:40]
    orig, ometa = load_text(a.orig)
    versions = {k: load_text(getattr(a, k))[0] for k in ("min", "mid", "max", "one") if getattr(a, k)}
    checks = {"orig": check_run(orig, ometa, a.channel, KB)}
    facts = {}
    for k, v in versions.items():
        checks[k] = check_run(v, {"links": re.findall(r"https?://\S+", v)}, a.channel, KB)
        facts[k] = fact_diff(orig, v)
    report = {"title": a.title, "channel": a.channel, "checks": checks, "facts": facts}
    (out / f"{slug}_검수.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    made = [str(out / f"{slug}_검수.json")]
    for k, v in versions.items():
        p = out / f"{slug}_{LABEL[k]}.docx"
        docx_out(p, a.title, f"MTSPACE COFFEE / {a.channel} / {LABEL[k]} 교정본", v, a.mark)
        made.append(str(p))
    if all(k in versions for k in ("min", "mid", "max")):
        scores = json.load(open(a.scores, encoding="utf-8")) if a.scores else None
        p = out / f"{slug}_비교.pdf"
        pdf_out(p, a.title, a.channel, orig, versions, checks, facts, scores, a.mark)
        made.append(str(p))
    for m in made:
        print(m)
    blocked = [LABEL[k] for k in versions if checks[k]["hold"] or facts[k]["verdict"] == "BLOCK"]
    if blocked:
        print("막음이 남은 본:", ", ".join(blocked)); sys.exit(1)


if __name__ == "__main__":
    main()
