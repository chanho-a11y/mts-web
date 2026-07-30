# MTSPACE COMMERCE MCP — 설치 가이드

v1.0 · 2026-07-29 · `schema_version = 1`

자사몰을 Claude로 운영하기 위한 MCP 서버의 **설치 정본**이다. 새 고객사 인스턴스도 이 문서 하나로 설치한다.

---

## 0. 구성

| 파일 | 역할 |
|---|---|
| `install.sql` | **DB 설치 정본.** 통째로 붙여넣고 Run. 재실행 안전 |
| `verify.sql` | 설치 검증. 블록 하나씩 Run |
| `uninstall.sql` | 제거 |
| `../../mcp/` | MCP 서버 코드 (장차 `@mts/commerce-mcp` 패키지로 추출) |
| `../../app/api/mcp/route.ts` | 라우트 어댑터 |

이전 초안(`mcp-foundation-*.sql`, `mcp-run/*.sql`)은 **이 폴더로 대체됐다.** 이력 참고용으로만 둔다.

---

## 1. 설치 절차

### 1-1. DB

Supabase 대시보드 → SQL Editor → `install.sql` 전체 붙여넣기 → Run.

마지막 확인 쿼리에서 다음이 나와야 한다.

```
role_ok_1 = 1
views_ok_15 = 15
table_privs_must_be_0 = 0
anon_readable_must_be_0 = 0
unassigned_orders_must_be_0 = 0
schema_version = 1
```

그다음 `verify.sql` 을 블록별로 돌려 상세를 확인한다.

### 1-2. 애플리케이션

```bash
npm i mcp-handler@1.1.0 @modelcontextprotocol/sdk@1.26.0 zod@^3.25.76 jose
npx tsc --noEmit    # 0 이어야 한다
```

`mcp-handler@1.1.0` 은 `@modelcontextprotocol/sdk@1.26.0` 을 정확히 요구한다. Next 14.2.15 에서 동작을 확인했다.

### 1-3. 환경변수

| 변수 | 용도 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 기존 | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 기존 | |
| `SUPABASE_JWT_SECRET` | `role=mcp_reader` 단명 JWT 서명 | Project Settings → API → JWT Settings |
| `MCP_BOOTSTRAP_TOKEN` | 최초 연결용 임시 토큰 | `openssl rand -hex 32`. 정식 토큰 발급 후 제거 |
| `MCP_ALLOW_SERVICE_FALLBACK` | **개발 전용** | `1` 이면 service_role 폴백. 프로덕션 금지 |

### 1-4. 토큰 발급

관리자 화면이 생기기 전까지는 SQL로 발급한다. 원문은 저장되지 않으므로 분실 시 재발급한다.

```sql
insert into public.mcp_token (profile_id, name, token_hash, scopes)
values (
  (select id from public.profiles where email = 'chanho@mtspace.coffee'),
  '대표 데스크톱',
  public.mcp_hash_token('여기에-생성한-난수-토큰'),
  '{}'                      -- 빈 배열 = 역할 스코프 그대로
);
```

### 1-5. Claude 연결

- 전송: **Streamable HTTP**
- URL: `https://<도메인>/api/mcp` (로컬은 `http://localhost:3000/api/mcp`)
- 헤더: `Authorization: Bearer <토큰>`

로컬 점검은 `npx @modelcontextprotocol/inspector` 로 한다.

---

## 2. 설계상 반드시 지킬 것

**`install.sql` §7-3 의 anon/authenticated 회수를 절대 빼지 말 것.** Supabase 는 `public` 스키마의 신규 테이블·뷰·시퀀스에 `anon`·`authenticated` 권한을 기본 부여한다. `mcp_v_*` 는 소유자 권한 뷰라서, 이 회수를 빠뜨리면 **익명 사용자가 PostgREST 로 주문·고객 데이터를 RLS 우회해 전부 읽는다.** 2026-07-29 실제 설치에서 발생해 즉시 차단한 함정이다. 설치 후 `verify.sql` C 블록이 전부 `false` 인지 반드시 확인한다.

**`service_role` 은 MCP 경로에서 쓰지 않는다.** 인증(토큰 검증)조차 `mcp_verify_token` 정의자 함수를 통해 `mcp_reader` 로 처리한다.

**`mcp_reader` 는 테이블 권한이 0이어야 한다.** 뷰가 유일한 통로이고, 뷰 정의가 곧 접근 정책이다.

**스토어프론트는 서버 상수다.** 툴 파라미터로 노출하지 않는다.

---

## 3. 다른 업종 고객사에 설치할 때

바꿀 곳은 **두 군데뿐**이다.

1. `install.sql` §0 — `storefront_id`, `enabled_modules`(커피가 아니면 빈 값), `product_attribute_schema`
2. `install.sql` §4-2 — `mcp_v_product` 의 `attributes` 사상을 그 업종의 컬럼으로

`mcp/` 패키지 코드는 **한 줄도 바꾸지 않는다.** 툴은 네이티브 컬럼명을 모르고 뷰 계약만 안다.

인도 체크리스트는 설계서 v1.2 §7 을 따른다.

---

## 4. 알려진 제약

- **역할 세분화 미구현.** DB의 `customer_role` enum 이 `guest|individual|business|influencer|admin` 뿐이라, 현재는 `admin` 만 MCP 접근이 가능하다. 세분화가 필요하면 `mcp_token.scopes` 로 **좁힌다**(넓히지는 못한다). 직원 역할은 P1.
- **인증은 정적 헤더 토큰(P0).** 고객사 인도본은 OAuth 로 갈 가능성이 높다 — 첫 고객사 Claude 플랜 확인 후 결정.
- **쓰기 툴 없음.** P0 는 읽기 전용이다.
- **`orders` NOT NULL 미적용.** 주문 생성 코드가 `storefront_id`·`brand_id` 를 채우도록 고친 뒤에 건다.
- Supabase Advisor 의 `security_definer_view` 경고는 이 설계의 의도된 결과다. `rls_enabled_no_policy`(mcp_config·mcp_token·mcp_audit_log) 도 의도적이다 — 정책이 없어야 service-role 외 접근이 막힌다.

---

## 5. 이 인스턴스의 설치 기록 (mtspace.coffee)

2026-07-29 적용 완료. 마이그레이션 8건.

| 이름 | 내용 |
|---|---|
| `mcp_foundation_01_config_and_functions` | 설정·접근함수·마스킹 |
| `mcp_foundation_02_role` | `mcp_reader` |
| `mcp_foundation_03_views` | 뷰 15종 |
| `mcp_foundation_04_price_token_audit` | 단가함수·토큰·감사로그 |
| `mcp_foundation_05_grants` | 권한 부여 |
| `mcp_foundation_06_backfill_order_storefront` | 주문 35건 백필 |
| `mcp_foundation_07_revoke_default_grants` | **anon/authenticated 회수 + `mcp_config` RLS + search_path** |
| `mcp_foundation_08_revoke_sequence` | 시퀀스 회수 + 기본 권한 차단 |

검증 결과: 뷰 15 / `mcp_reader` 테이블 권한 0 / anon 접근 0 / 상품 29 / 주문 35 / 미할당 주문 0.
`mcp_resolve_price` = `individual` 32,000원, 기존 `resolve_price` = `base` 33,000원 — 래퍼가 필요했던 이유가 실증됐다.
