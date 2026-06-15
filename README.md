# mts-web — MTSPACE × NORMCORE 자사몰

Next.js 14 (App Router) + Supabase + Vercel. 단일 백엔드, 2도메인(mtspace.coffee=B2B / normcorecoffee.com=B2C).

기획·설계 문서는 상위 폴더 `자사몰 이전 기획/` (01~06) 참조.

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

`.env.local`에 Supabase URL/anon 키가 설정돼 있습니다(로컬 dev용, 커밋 안 됨).
서버 전용 키(service_role·PG 키)는 Vercel 환경변수에만 설정합니다.

## 구조 (P0)

- `middleware.ts` — Host → brand(mtspace/normcore) + locale(KR→ko, else en)
- `lib/brands.ts` — 도메인↔브랜드 매핑
- `lib/supabase/{server,client}.ts` — Supabase 클라이언트(RLS)
- `app/` — App Router (홈은 카테고리 조회로 DB 연결 검증)
- 디자인 토큰 — Helvetica Neue · 자간 -2pt · 헤드라인 bold · 본문 light · 줄간격 160

## 데이터베이스

Supabase `mtspace-commerce` (ref `apiskyivlvebpvvxfejq`, ap-northeast-2). 
마이그레이션: 브랜드/회원/가격티어 → 카탈로그/가격해석 → 커머스/결제/배송. (Supabase migrations)

## 로드맵

`자사몰 이전 기획/05_작업계획_및_실행로드맵.md` (P0~P8).
