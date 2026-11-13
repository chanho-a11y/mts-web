#!/usr/bin/env python3
"""mtspace-content-writer 회귀 테스트.  사용: python3 -I tests/run.py
expect.json 의 기대 판정과 비교하고, baseline_v1.json(기존 규칙 rules.ts + 네이버 스킬 규칙)보다 덜 잡는 범주가 없는지 본다."""
import json, pathlib, subprocess, sys, tempfile
T = pathlib.Path(__file__).resolve().parent
TMP = pathlib.Path(tempfile.gettempdir())
ROOT = T.parent
S = T / "samples"
exp = json.load(open(T / "expect.json", encoding="utf-8"))
fails = []


def check(c):
    j = TMP / "mcw_out.json"
    p = subprocess.run([sys.executable, "-I", str(ROOT / "scripts" / "mtspace_check.py"), str(S / c["sample"]), "--channel", c["channel"], "--json", str(j)],
                       capture_output=True, text=True)
    r = json.load(open(j, encoding="utf-8"))
    keys = set()
    for f in r["findings"]:
        rid = f["rule"].split(" ")[0] if f["rule"][:1] == "B" else f["rule"]
        keys |= {f"{rid}:{f['code']}", rid, f["code"]}
    bad = []
    if p.returncode != c["exit"]:
        bad.append(f"exit {p.returncode} != {c['exit']}")
    bad += [f"없음 {h}" for h in c["has"] if h not in keys]
    bad += [f"있으면 안 됨 {n}" for n in c["not"] if n in keys]
    return bad, keys


def main():
    v2_cats = {}
    for c in exp["check"]:
        bad, keys = check(c)
        v2_cats[c["sample"]] = {k.split(":")[0] for k in keys if k.startswith("B") and ":" in k}
        print(("OK  " if not bad else "FAIL") + f" check {c['sample']} [{c['channel']}]" + ("" if not bad else "  " + "; ".join(bad)))
        if bad: fails.append(c["sample"])
    for c in exp["fact_lock"]:
        j = TMP / "mcw_fl.json"
        p = subprocess.run([sys.executable, "-I", str(ROOT / "scripts" / "fact_lock.py"), "diff", str(S / c["orig"]), str(S / c["new"]), "--json", str(j)],
                           capture_output=True, text=True)
        r = json.load(open(j, encoding="utf-8"))
        ok = r["verdict"] == c["verdict"] and p.returncode == c["exit"]
        print(("OK  " if ok else "FAIL") + f" fact_lock {c['new']} → {r['verdict']} (exit {p.returncode})")
        if not ok: fails.append(c["new"])
    base = T / "baseline_v1.json"
    if base.exists():
        b = json.load(open(base, encoding="utf-8"))
        for sample, cats in b["caught"].items():
            miss = set(cats) - v2_cats.get(sample, set())
            print(("OK  " if not miss else "FAIL") + f" baseline {sample}: v1 범주 {sorted(cats)} 를 v2가 {'모두 잡음' if not miss else '놓침 ' + str(sorted(miss))}")
            if miss: fails.append("baseline:" + sample)
    print("RESULT", "PASS" if not fails else f"FAIL {fails}")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
