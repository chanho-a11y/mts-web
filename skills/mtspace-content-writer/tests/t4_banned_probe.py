"""1단계 QA: kb_snapshot.json 금지어가 합성 표본(T4)의 모든 줄을 잡는지, 실제 표본 4건에서 무엇이 걸리는지 본다.
사용: python3 -I t4_banned_probe.py <kb_snapshot.json> <samples_dir>
2단계에서 scripts/mtspace_check.py 로 대체된다."""
import json, re, sys, html, pathlib

kb = json.load(open(sys.argv[1], encoding="utf-8"))
sd = pathlib.Path(sys.argv[2])
rules = [(b["id"], b["code"], re.compile(p, re.I)) for b in kb["banned"] for p in b["patterns"]]

def text_of(p):
    raw = p.read_text(encoding="utf-8")
    if p.suffix == ".json":
        d = json.loads(raw)
        d = d[0] if isinstance(d, list) else d
        parts = []
        for k in ("title", "excerpt", "one_liner", "story", "caption"):
            if d.get(k): parts.append(d[k])
        if d.get("seo"): parts += [d["seo"].get("title", ""), d["seo"].get("description", "")]
        if d.get("body_html"): parts.append(re.sub(r"<[^>]+>", "\n", html.unescape(d["body_html"])))
        raw = "\n".join(parts)
    return raw

def hits(line):
    return sorted({f"{i}:{c}" for i, c, rx in rules if rx.search(line)})

ok = True
t4 = sd / "s5_synthetic_banned.txt"
print("== T4 합성 표본: 모든 줄이 하나 이상 걸려야 통과")
for n, line in enumerate(t4.read_text(encoding="utf-8").splitlines(), 1):
    if not line.strip(): continue
    h = hits(line)
    print(f"  L{n} {'OK ' if h else 'MISS'} {h}")
    ok &= bool(h)

for p in sorted(sd.glob("s[1-4]_*")):
    print(f"== {p.name}")
    agg = {}
    for line in text_of(p).splitlines():
        for h in hits(line): agg[h] = agg.get(h, 0) + 1
    print("  ", agg or "걸린 것 없음")

print("RESULT", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
