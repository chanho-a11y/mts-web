# mtspace-content-writer (사람용)

MTSPACE COFFEE 글쓰기와 교정 스킬 v2. 2026-11-13 (D-167).

## 바뀐 점 (v1 대비)
- v1 은 전용 스킬이 없었다. 규칙이 인스타 서버 검사(lib/social/rules.ts)와 네이버 발행 스킬 안에 흩어져 있었다.
- v2 는 금지어를 B01~B16 으로 합쳤고, 인증, 건강 효능, 구표기, 옛 이름, 호칭, 출처 없는 수치, 디카페인 오표기, 브랜드 혼입, 사실 대조, 중복 검사를 새로 넣었다.
- 긴 글은 세 교정본 DOCX 와 비교 PDF 로 나온다.

## 구성
- `SKILL.md` 진입점 / `references/` 규칙과 기준 / `scripts/` 검수기, 사실 대조, 산출물 / `tests/` 회귀(배포 zip 에서 뺀다)

## 회귀 실행
```
cd new-website/skills/mtspace-content-writer
python3 -I tests/run.py
```
PASS 여야 배포한다.

## 배포
- claude.ai 스킬 저장 카드로 SKILL.md 를 저장한다(대표 계정).
- 전체 패키지는 이 폴더가 정본이다. 바꾸면 회귀를 돌리고 의사결정 로그에 남긴다.
- 백업: `new-website/docs/skills_dist/` 에 날짜별 zip.

## 롤백
claude.ai 스킬 버전 기록의 이전 판, 또는 skills_dist 의 zip.
