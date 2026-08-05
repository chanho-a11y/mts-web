# mcp/ — COMMERCE MCP

이 디렉터리는 **장차 사설 npm 패키지 `@<scope>/commerce-mcp` 로 추출된다.** 지금은 추출 비용(모노레포 도구·배포 파이프라인)을 미루기 위해 자사몰 안에 두지만, 코드 경계는 처음부터 패키지처럼 지킨다.

## 경계 규칙 (깨면 추출이 불가능해진다)

1. `app/` · `components/` · `lib/` 를 **import 하지 않는다.** 지금까지 0건이며 계속 0이어야 한다.
2. 네이티브 컬럼명을 **모른다.** `roast_level` 같은 이름이 이 디렉터리에 등장하면 이미 잘못된 것이다. 업종별 차이는 `mcp_v_*` 뷰가 흡수한다.
3. 테이블을 직접 조회하지 않는다. **`mcp_v_*` 뷰와 `mcp_*` 함수만** 쓴다.
4. 외부에서 쓰는 것은 `index.ts` 의 `createContext` · `registerTools` 뿐이다.

추출 시점에는 이 폴더를 그대로 `git mv` 하고 `package.json` 만 얹으면 된다.

## 구성

| 파일 | 역할 |
|---|---|
| `types.ts` | 뷰 계약 타입. 업종 중립 |
| `config.ts` | `mcp_config` 로드 + **스키마 버전 검사**(불일치면 실패) |
| `db.ts` | `mcp_reader` JWT 클라이언트. service_role 폴백은 개발 전용 |
| `auth.ts` | P0 정적 헤더 토큰 → 신원·스코프. OAuth 로 교체 가능한 인터페이스 |
| `policy.ts` | 스코프 게이트 + 감사로그 래퍼 + 응답 포맷 |
| `markdown.ts` | 마크다운 → 화이트리스트 HTML. 의존성 0. 쓰기 툴의 유일한 본문 입력 경로 |
| `tools/` | 툴 18종 (읽기 16 + 쓰기 2) |
| `index.ts` | 등록 진입점 |

라우트 어댑터는 `app/api/mcp/route.ts` 한 파일이다. 고객사 인스턴스에서는 이 파일만 복사한다.

## 필요한 환경변수

| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 기존 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 기존 |
| `SUPABASE_JWT_SECRET` | **신규** — `role=mcp_reader` 단명 JWT 서명용 |
| `MCP_ALLOW_SERVICE_FALLBACK` | **개발 전용** — `1` 이면 service_role 로 폴백. 프로덕션에서 켜지 말 것 |

## 선행 조건

`db/03_mcp_install.sql` 이 적용돼 있어야 한다. 적용 전에는 모든 툴이 `setup_required` 로 실패한다 — 조용히 빈 값을 반환하지 않는다.

## 설치

```bash
npm i mcp-handler @modelcontextprotocol/sdk zod jose
```

`mcp-handler@1.1.0` 은 `@modelcontextprotocol/sdk@1.26.0` 을 정확히 요구한다. Next 14.2.15 와 호환된다.

## 토큰 발급 (P0)

```sql
-- 관리자 화면이 생기기 전 임시 절차
insert into public.mcp_token (profile_id, name, token_hash, scopes)
values (
  (select id from public.profiles where email = '<관리자 이메일>'),
  '<토큰 용도>',
  public.mcp_hash_token('여기에-생성한-난수-토큰'),
  '{}'                       -- 빈 배열 = 역할 스코프 그대로
);
```

토큰 원문은 저장되지 않는다. 분실하면 재발급한다.

## 쓰기 경계 (D-105)

쓰기 툴은 `commerce_draft_post` 하나뿐이고, 다음은 **금지가 아니라 부재**다.

- **발행 불가** — 툴에 `status` 인자가 없고 `mcp_draft_post()` 가 `'draft'` 를 하드코딩한다.
- **발행글 수정 불가** — DB 함수가 `status='published'` 행을 거부한다. 개선안은 `<원본slug>--rev` 별도 초안으로만 들어오고, `/admin/blog` 의 「원본에 반영」을 사람이 눌러야 원본이 바뀐다.
- **HTML 주입 불가** — HTML 인자가 없다. `markdown.ts` 가 입력을 먼저 전부 이스케이프한 뒤 화이트리스트 태그만 만든다.
- **삭제 불가** — 삭제 툴도 삭제 함수도 없다.

상품(`commerce_propose_product_update`, D-106)도 라이브를 직접 바꾸지 못한다.

- **즉시 반영 불가** — `mcp_product_change` 에 제안만 쌓는다. 관리자가 `/admin/products/changes` 에서 반영해야 적용된다.
- **필드 제한** — 화이트리스트 29필드(마케팅 카피·커피 정보·영문·카테고리)만. 가격·재고·SKU·판매상태·표시사항·디자인 토큰은 불가.
- **값 비우기 불가** — 빈 문자열·빈 배열·빈 객체·null 은 예외. 삭제 불가를 필드 단위까지 관철한다.
- 반영·버림 함수는 **SECURITY INVOKER** 다(D-092·093).

선행 SQL: `docs/mcp-write-blog-20260805.sql`(블로그), `docs/mcp-product-change-20260805.sql`(상품 제안 큐), `docs/mcp-brand-tokens-20260805.sql`(브랜드 규범 시딩).

## 현재 역할 매핑의 한계

DB의 `customer_role` enum 은 `guest | individual | business | influencer | admin` 뿐이다. 설계서의 직원 역할(manager·cs·marketer·analyst·operator)은 아직 스키마에 없다.

- 지금은 **`admin` 만 MCP 접근이 가능**하고 나머지는 전부 거부된다.
- 세분화가 필요하면 `mcp_token.scopes` 로 **좁힌다**(교집합). 넓히지는 못한다.
- 직원 역할 도입은 P1 과제다.

## 검증

```bash
npx tsc --noEmit                       # 0
npx @modelcontextprotocol/inspector     # Streamable HTTP → http://localhost:3000/api/mcp
npx tsx mcp/schema-smoke.mts            # 전 툴 PASS
```
