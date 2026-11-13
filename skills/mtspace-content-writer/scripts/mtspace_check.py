#!/usr/bin/env python3
"""MTSPACE COFFEE 글 규칙 검수기 v2 (mtspace-content-writer)

사용: python3 -I mtspace_check.py <원고> --channel <매체> [--kb kb_snapshot.json] [--json 결과.json] [--field all|body]
  원고: .txt .md .html 또는 표본 .json(title, excerpt, one_liner, story, seo, caption, body_html)
  매체: mall_blog | pdp | naver | instagram | b2b_doc | education | caption
종료 코드: 막음(BLOCK)이 하나라도 있으면 1, 아니면 0.

판정 코드: BLOCK 막음 / FIX 고침 / REVIEW 검토 / KEEP 유지
검사: 지식베이스 금지어(B01~B16), 매체 형식, 항목 중복과 겹침, 한국어 지표(K4 포괄 동사, 번역투, 같은 종결 반복),
      AI 상투, 사생활, 브랜드 에셋 4축(사용자 축 없으면 발행 보류)
"""
import argparse, html, json, pathlib, re, sys
from collections import Counter

HERE = pathlib.Path(__file__).resolve().parent
DEFAULT_KB = HERE.parent / "references" / "kb_snapshot.json"
CHANNELS = ["mall_blog", "pdp", "naver", "instagram", "b2b_doc", "education", "caption"]
LONG = {"mall_blog", "naver", "b2b_doc", "education"}
AXIS_REQUIRED = {"mall_blog", "naver", "instagram", "b2b_doc"}


# ---------- 입력 ----------
def strip_html(s):
    s = re.sub(r"(?i)<br\s*/?>", "\n", s)
    s = re.sub(r"(?i)</(p|h[1-6]|li|tr|div|section)>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s)


def load_text(path, field="all"):
    p = pathlib.Path(path)
    raw = p.read_text(encoding="utf-8")
    meta = {"links": re.findall(r'href="([^"]+)"', raw)}
    if p.suffix == ".json":
        d = json.loads(raw)
        d = d[0] if isinstance(d, list) else d
        parts, pdp_title = [], d.get("title", "")
        keys = ["title", "excerpt", "one_liner", "story", "caption"] if field == "all" else ["story", "caption"]
        for k in keys:
            if d.get(k):
                parts.append(("[제목] " if k == "title" else "") + d[k])
        if field == "all" and isinstance(d.get("seo"), dict):
            parts += [d["seo"].get("title", ""), d["seo"].get("description", "")]
        if d.get("body_html"):
            meta["links"] = re.findall(r'href="([^"]+)"', d["body_html"])
            parts.append(strip_html(d["body_html"]))
        if d.get("hashtags"):
            meta["hashtags"] = d["hashtags"]
        meta["pdp_title"] = pdp_title
        return "\n\n".join(parts), meta
    if p.suffix in (".html", ".htm"):
        return strip_html(raw), meta
    return raw, meta


# ---------- 도우미 ----------
def lines_of(text):
    return [(i + 1, l) for i, l in enumerate(text.splitlines())]


def items_of(text):
    """빈 줄 또는 제목으로 나눈 항목(문단) 목록"""
    blocks = [b.strip() for b in re.split(r"\n\s*\n|\n(?=#|\[제목\]|Q\.)", text) if b.strip()]
    return [b for b in blocks if len(re.sub(r"\s", "", b)) >= 20]


def grams(s, n=3):
    s = re.sub(r"\s+", "", s)
    return {s[i:i + n] for i in range(max(0, len(s) - n + 1))}


def jaccard(a, b):
    return len(a & b) / max(1, len(a | b))


def keywords(s, stop):
    toks = re.findall(r"[가-힣A-Za-z0-9]{2,}", s)
    return {t for t in toks if t not in stop}


def sentences(text):
    return [x.strip() for x in re.split(r"(?<=[.?!다요])\s+|\n", text) if len(x.strip()) >= 8]


def add(out, code, rule, msg, line=None, match=None, fix=None):
    out.append({"code": code, "rule": rule, "line": line, "match": match, "msg": msg, "fix": fix})


# ---------- 검사 ----------
RECIPE_CTX = re.compile(r"(물|추출|붓|우유|도징|원두\s|블룸|레시피|샷|ml|mL|\d+\s*g\s*[,:/]|:\s*\d)")


def check_banned(text, channel, kb, out):
    for b in kb["banned"]:
        chans = b.get("channels", "all")
        if chans != "all" and channel not in chans:
            continue
        for ln, line in lines_of(text):
            hit_line = False
            for pat in b["patterns"]:
                if hit_line:
                    break
                for m in re.finditer(pat, line, re.I):
                    code = b["code"]
                    if b["id"] == "B03":
                        if channel == "pdp" and line.startswith("[제목]"):
                            continue                                   # 상품 제목 용량 허용(대표 2026-11-13)
                        win = line[max(0, m.start() - 12): m.end() + 12]
                        if RECIPE_CTX.search(win) and not re.search(r"1\s?kg|대용량", m.group(0)):
                            code = "REVIEW"                             # 레시피 수치일 수 있음
                    if b["id"] == "B02" and m.group(0) == "요일" and re.search(r"로스팅|출고", line) is None:
                        code = "REVIEW"                                 # 요일 단어만, 신선도 맥락 아님
                    fix = None
                    if b.get("replace"):
                        fix = next((v for k, v in b["replace"].items() if k in m.group(0)), None)
                    add(out, code, f'{b["id"]} {b["cat"]}', b["why"], ln, m.group(0), fix)
                    hit_line = code != "REVIEW" or b["id"] not in ("B02", "B03")
                    break


def check_channel(text, meta, channel, kb, out):
    rules = kb["channel_rules"].get(channel, {})
    n_all = len(text)
    n_nos = len(re.sub(r"\s", "", text))
    if channel in ("mall_blog", "naver"):
        need = rules.get("min_chars", 1500)
        if n_all < need:
            add(out, "FIX", "M5 분량", f"공백 포함 {n_all}자, 기준 {need}자 이상")
    if channel == "caption" and n_nos >= 500:
        add(out, "REVIEW", "M5 분량", f"공백 빼고 {n_nos}자. 캡션과 짧은 글은 500자 미만")
    if channel == "naver":
        tags = re.findall(r"#\S+", text.split("=== 태그")[-1]) if "=== 태그" in text else re.findall(r"(?m)^#\S+", text)
        links = re.findall(r"https?://\S+", text)
        if tags and len(tags) != 5:
            add(out, "FIX", "M5 태그", f"태그 {len(tags)}개, 기준 5개")
        if len(links) > 3:
            add(out, "FIX", "M5 링크", f"링크 {len(links)}개, 기준 3개 이하")
        for u in links:
            if "mtspace.coffee" not in u:
                add(out, "REVIEW", "M5 링크", "mtspace.coffee 밖 링크", match=u)
        if re.search(r"<[a-z]+[^>]*>", text):
            add(out, "FIX", "M5 HTML", "네이버 원고에 HTML 태그 남음")
    if channel == "mall_blog":
        links = meta.get("links", [])
        if not any("/account/signup" in u for u in links) and "/account/signup" not in text:
            add(out, "FIX", "M5 CTA", "사업자 가입 링크(/account/signup) 없음 (D-129)")
        if not any("/contact" in u for u in links) and "/contact" not in text:
            add(out, "FIX", "M5 CTA", "납품 문의 링크(/contact) 없음 (D-129)")
        for u in links:
            if u.startswith("/"):
                add(out, "FIX", "M5 링크", "상대 링크. https://mtspace.coffee 절대 URL로", match=u)
        if not re.search(r"(?m)^\s*English\s*$|^##\s*English", text):
            add(out, "REVIEW", "M5 영문 요약", "English 요약 블록 없음")
        if "출처" not in text:
            add(out, "REVIEW", "M5 출처", "출처 블록 없음")
    if channel == "instagram":
        plain = re.sub(r"MTSPACE\s*COFFEE|@\w+|#\S+", "", text)
        ko = re.search(r"[가-힣]", plain)
        en = re.search(r"(?m)^(?=[^가-힣\n]*$)\s*[A-Za-z][A-Za-z,.'’:\-]*(\s+[A-Za-z,.'’:\-]+){2,}", plain)
        if ko and en and en.start() < ko.start():
            add(out, "FIX", "M5 캡션 순서", "한글 먼저, 영문 나중 (D-138)")
        if not en:
            add(out, "REVIEW", "M5 캡션 순서", "영문 병기 없음")
        if re.search(r"#\S+[^\n]*\n+[^#\n]*[가-힣A-Za-z]{2,}", text.split("@mtspacecoffee")[0]) and re.search(r"(?m)^#", text):
            add(out, "REVIEW", "M5 해시태그", "해시태그는 캡션 맨 끝에 둔다")


def check_dup(text, out):
    its = items_of(text)
    stop = {"그리고", "합니다", "있습니다", "입니다", "MTSPACE", "COFFEE", "커피", "원두"}
    for i in range(len(its)):
        for j in range(i + 1, len(its)):
            sim = jaccard(grams(its[i]), grams(its[j]))
            if sim >= 0.8:
                add(out, "BLOCK", "중복 항목", f"항목 {i+1}과 {j+1}이 거의 같다(3-gram {sim:.2f}). 같은 글 중복", match=its[j][:40])
                continue
            ka, kb_ = keywords(its[i], stop), keywords(its[j], stop)
            shared = ka & kb_
            if len(shared) >= 4 and len(shared) / max(1, min(len(ka), len(kb_))) >= 0.7:
                add(out, "REVIEW", "겹침 항목", f"항목 {i+1}과 {j+1} 핵심어 {len(shared)}개 공유", match=", ".join(sorted(shared))[:60])


BROAD = re.compile(r"(지원|제공|보조|진행)(합니다|하고|하며|해|하는|됩니다|되는|드립니다)")
TRANSLATIONESE = re.compile(r"(을|를)\s*통해|에\s*대해(서)?|에\s*있어(서)?|(을|를)\s*가지고\s*있|되어지|하는\s*것이\s*(중요|필요)")
AI_META = re.compile(r"(이번|오늘)\s*(글|포스팅)에서는|에\s*대해\s*알아보(겠|도록|자)|살펴보겠습니다|함께\s*알아볼까요")
AI_CLOSE = re.compile(r"도움이\s*되(셨|었)(길|기를|으면)|마무리하며|결론적으로|이상으로|지금까지\s*.{0,10}알아보았")
AI_ABSTRACT = re.compile(r"특별한\s*(경험|순간|여정)|여정|의미\s*있는\s*(시간|한\s*잔)|진정한|새로운\s*차원|한\s*단계\s*더")
AI_ADVERB = re.compile(r"(정말|매우|굉장히|무척|너무나|확실히|단연)\s")
AI_FLIP = re.compile(r"(뿐만\s*아니라|그것이\s*아니라|가\s*아니라)\s*.{0,20}(입니다|이다)")


def check_korean(text, out):
    sents = sentences(text)
    broad = [m.group(0) for m in BROAD.finditer(text)]
    if len(broad) >= 2:
        add(out, "REVIEW", "K4 포괄 동사", f"지원, 제공, 보조, 진행 {len(broad)}회. 무엇을 하는지 동사로 바꾼다", match=", ".join(broad[:5]))
    tr = [m.group(0) for m in TRANSLATIONESE.finditer(text)]
    if len(tr) >= 3:
        add(out, "REVIEW", "K4 번역투", f"번역투 {len(tr)}회", match=", ".join(tr[:5]))
    ends = [re.sub(r"[.?!\s]+$", "", s)[-3:] for s in sents]
    run = 1
    for a, b in zip(ends, ends[1:]):
        run = run + 1 if a == b else 1
        if run == 4:
            add(out, "REVIEW", "K7 같은 종결 반복", f"같은 종결 '{a}' 4문장 연속")
    long_s = [s for s in sents if len(s) > 90]
    if long_s:
        add(out, "REVIEW", "K3 긴 문장", f"90자 넘는 문장 {len(long_s)}개", match=long_s[0][:40])
    because = [s for s in sents if re.match(r"^.{0,40}(때문에|이므로|이라서|하기\s*위해)", s)]
    if len(because) >= 3:
        add(out, "REVIEW", "K5 이유가 앞선 문장", f"이유나 목적이 결과보다 앞선 문장 {len(because)}개. 결과부터")


def check_ai(text, out):
    for rx, rule, thr, code in [(AI_META, "AI 메타 서두", 1, "FIX"), (AI_CLOSE, "AI 상투 마무리", 1, "FIX"),
                                (AI_ABSTRACT, "AI 추상 의미 부여", 2, "REVIEW"), (AI_ADVERB, "AI 근거 없는 부사", 3, "REVIEW"),
                                (AI_FLIP, "AI 기계적 반전", 2, "REVIEW")]:
        ms = [m.group(0) for m in rx.finditer(text)]
        if len(ms) >= thr:
            add(out, code, rule, f"{len(ms)}회", match=", ".join(ms[:4]))
    bullets = len(re.findall(r"(?m)^\s*([-*•]|\d+\.)\s", text))
    if bullets > 25:
        add(out, "REVIEW", "AI 과도한 구조화", f"목록 줄 {bullets}개. 문단으로 풀 곳을 찾는다")


PRIV = [(re.compile(r"01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}"), "휴대전화 번호"),
        (re.compile(r"\d{6}[-\s]?[1-4]\d{6}"), "주민등록번호 형식"),
        (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "이메일 주소")]


def check_privacy(text, out):
    for rx, name in PRIV:
        for m in rx.finditer(text):
            add(out, "BLOCK" if "주민" in name else "REVIEW", "사생활", f"{name} 노출", match=m.group(0))


def check_axes(text, channel, kb, out):
    ax = kb["asset_axes"]
    found = {k: [w for w in v["detect"] if w in text] for k, v in ax.items() if k.startswith("A")}
    res = {k: bool(v) for k, v in found.items()}
    if channel in AXIS_REQUIRED and not res.get("A1_user"):
        add(out, "BLOCK", "에셋 A1 쓰는 사람", "사용자 축이 없다. 발행 보류 (D-167)")
    for k in ("A2_bean", "A3_roast", "A4_brew"):
        if channel in LONG and not res.get(k):
            add(out, "REVIEW", f"에셋 {k}", f"{ax[k]['name']} 축이 약하다")
    return res


def run(text, meta, channel, kb):
    out = []
    check_banned(text, channel, kb, out)
    check_channel(text, meta, channel, kb, out)
    check_dup(text, out)
    check_korean(text, out)
    check_ai(text, out)
    check_privacy(text, out)
    axes = check_axes(text, channel, kb, out)
    cnt = Counter(f["code"] for f in out)
    return {"channel": channel, "chars": len(text), "chars_nospace": len(re.sub(r"\s", "", text)),
            "axes": axes, "summary": {c: cnt.get(c, 0) for c in ("BLOCK", "FIX", "REVIEW", "KEEP")},
            "hold": cnt.get("BLOCK", 0) > 0, "findings": out}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("--channel", required=True, choices=CHANNELS)
    ap.add_argument("--kb", default=str(DEFAULT_KB)); ap.add_argument("--json"); ap.add_argument("--field", default="all")
    a = ap.parse_args()
    kb = json.load(open(a.kb, encoding="utf-8"))
    text, meta = load_text(a.src, a.field)
    r = run(text, meta, a.channel, kb)
    if a.json:
        pathlib.Path(a.json).write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
    s = r["summary"]
    print(f"[{a.channel}] 막음 {s['BLOCK']} / 고침 {s['FIX']} / 검토 {s['REVIEW']}  ({r['chars']}자)  4축 {r['axes']}")
    for f in r["findings"]:
        loc = f"L{f['line']} " if f["line"] else ""
        m = f" «{f['match']}»" if f["match"] else ""
        fx = f" → {f['fix']}" if f["fix"] else ""
        print(f"  {f['code']:6} {loc}{f['rule']}{m}: {f['msg']}{fx}")
    sys.exit(1 if r["hold"] else 0)


if __name__ == "__main__":
    main()
