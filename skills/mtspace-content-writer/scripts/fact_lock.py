#!/usr/bin/env python3
"""MTSPACE COFFEE 사실 잠금과 대조 (fact_lock v2)

사용:
  python3 -I fact_lock.py lock <원문>                      원문에서 지킬 사실 목록을 뽑는다
  python3 -I fact_lock.py diff <원문> <교정본> [--json 결과.json]
      전체 기준 빠짐 / 새로 생김 = BLOCK (종료 코드 1)
      항목(문단)별 빠짐 = REVIEW (다른 항목에 남아 있어도 원래 자리에서 사라짐)
      금지어(지역, 요일, 용량)에 걸려 지운 사실 = KEEP (의도된 삭제)로 따로 표시
원문과 교정본은 .txt .md .html 또는 표본 .json 모두 된다(mtspace_check.load_text 와 같은 규칙).
사전은 references/kb_snapshot.json 의 facts 를 쓴다.
"""
import argparse, json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from mtspace_check import load_text, items_of, grams, jaccard  # noqa: E402

KB = json.load(open(HERE.parent / "references" / "kb_snapshot.json", encoding="utf-8"))
F = KB["facts"]
LEX = F["lexicon"]


def vocab():
    terms = {}
    for p in F["products_active"]:
        terms[p["ko"]] = "제품명"
        terms[p["en"]] = "제품명"
        for n in p.get("notes", []):
            terms[n] = "컵 노트"
    for a in F["products_archived"]:
        terms[a] = "제품명(판매 종료)"
    for cat, key in [("가공", "process"), ("로스팅", "roast"), ("국가", "country"), ("지역", "region"),
                     ("생산자", "producer_station"), ("품종", "variety")]:
        for t in LEX[key]:
            terms.setdefault(t, cat)
    for t in ["사업자", "도매", "납품", "샘플", "OEM", "계약 로스팅", "에티오피아 베이스", "로우 카페인", "디카페인"]:
        terms.setdefault(t, "조건")
    # 긴 이름부터 찾아 짧은 이름이 겹쳐 잡히지 않게 한다
    return sorted(terms.items(), key=lambda kv: -len(kv[0]))


VOCAB = vocab()
NUM = re.compile(LEX["unit_regex"])
RATIO = re.compile(LEX["ratio_regex"])
TIME = re.compile(LEX["time_regex"])
PRICE = re.compile(r"\d{1,3}(,\d{3})+\s*원|\d+\s*만\s*원")
UNITS = r"(g|kg|ml|mL|°C|℃|초|분|일|시간|%|원|m|km|masl|µm|헥타르|곳|명|년|개국|종|잔|샷)"
RANGE = re.compile(r"\d[\d,.]*\s*[~\-–]\s*\d[\d,.]*\s*" + UNITS)
NUM2 = re.compile(r"(?<![\d,.~\-–])\d[\d,]*(\.\d+)?\s*" + UNITS + r"(?![a-zA-Z])")
BANNED_RX = [re.compile(p, re.I) for b in KB["banned"] if b["id"] in ("B01", "B02", "B03", "B09") for p in b["patterns"]]


def norm_num(s):
    return re.sub(r"\s+", "", s).replace("℃", "°C").replace("mL", "ml")


def extract(text):
    facts = {}
    masked = text
    for term, cat in VOCAB:
        if term and term in masked:
            facts[term] = cat
            masked = masked.replace(term, " " * len(term))
    rest = text
    for m in RANGE.finditer(text):
        facts.setdefault(norm_num(m.group(0)), "수치 범위")
        rest = rest.replace(m.group(0), " ")
    for rx, cat in [(PRICE, "가격"), (TIME, "시간"), (RATIO, "비율"), (NUM2, "수치")]:
        for m in rx.finditer(rest):
            v = norm_num(m.group(0))
            if cat == "수치" and re.fullmatch(r"\d{1,2}(일|분)", v) is None and re.fullmatch(r"\d+", v):
                continue
            facts.setdefault(v, cat)
    return facts


def is_banned(fact):
    return any(rx.search(fact) for rx in BANNED_RX)


def align(orig_items, new_items):
    """원문 항목마다 가장 닮은 교정본 항목을 짝짓는다"""
    pairs = []
    for i, o in enumerate(orig_items):
        go = grams(o)
        best, bj = -1, 0.0
        for j, n in enumerate(new_items):
            s = jaccard(go, grams(n))
            if s > bj:
                best, bj = j, s
        pairs.append((i, best, bj))
    return pairs


def diff(orig_text, new_text):
    fo, fn = extract(orig_text), extract(new_text)
    res = {"missing": [], "added": [], "intended": [], "item_missing": []}
    for k, cat in fo.items():
        if k not in fn:
            (res["intended"] if is_banned(k) else res["missing"]).append({"fact": k, "cat": cat})
    for k, cat in fn.items():
        if k not in fo:
            res["added"].append({"fact": k, "cat": cat})
    oi, ni = items_of(orig_text), items_of(new_text)
    for i, j, sim in align(oi, ni):
        if j < 0 or sim < 0.2:
            continue
        a, b = extract(oi[i]), extract(ni[j])
        for k, cat in a.items():
            if k not in b and k in fn and not is_banned(k):
                res["item_missing"].append({"item": i + 1, "fact": k, "cat": cat, "note": "전체에는 남아 있으나 이 항목에서 빠짐"})
    res["verdict"] = "BLOCK" if (res["missing"] or res["added"]) else ("REVIEW" if res["item_missing"] else "PASS")
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["lock", "diff"]); ap.add_argument("a"); ap.add_argument("b", nargs="?")
    ap.add_argument("--json")
    x = ap.parse_args()
    ta, _ = load_text(x.a)
    if x.cmd == "lock":
        f = extract(ta)
        for k, c in sorted(f.items(), key=lambda kv: kv[1]):
            print(f"{c}\t{k}")
        print(f"총 {len(f)}개")
        return
    tb, _ = load_text(x.b)
    r = diff(ta, tb)
    if x.json:
        pathlib.Path(x.json).write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"판정 {r['verdict']}  빠짐 {len(r['missing'])} / 새로 생김 {len(r['added'])} / 항목별 빠짐 {len(r['item_missing'])} / 의도된 삭제 {len(r['intended'])}")
    for k in ("missing", "added", "item_missing", "intended"):
        for f in r[k]:
            print(f"  {k:12} {f.get('cat')}\t{f['fact']}" + (f"  (항목 {f['item']})" if "item" in f else ""))
    sys.exit(1 if r["verdict"] == "BLOCK" else 0)


if __name__ == "__main__":
    main()
