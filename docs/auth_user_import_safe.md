# auth.users 안전 임포트 가이드 (회원가입 500 재발 방지)

> 배경: 2026-07-01 레거시 고객 41명을 `auth.users`에 **직접 SQL로 벌크 임포트**하면서
> 토큰 컬럼을 빈 문자열('') 대신 **NULL**로 남겼다. GoTrue(Go)는 이 컬럼들을 non-nullable
> string으로 스캔하므로 NULL 행이 하나라도 있으면 로그인·회원가입 전체가
> `500: Database error querying schema`(클라이언트엔 빈 `{}`)로 실패한다.
> 실제 로그: `error finding user: Scan error on column "confirmation_token": converting NULL to string is unsupported`.

## 원칙
`auth.users`에 계정을 **직접 INSERT하지 말 것.** 반드시 GoTrue를 거친다.

- 앱/관리자 코드는 이미 안전하다 → `admin.auth.admin.createUser(...)`
  (`app/admin/customers/actions.ts`, `app/api/admin/customers/bulk/route.ts`).
- 신규 회원가입도 `supabase.auth.signUp(...)` 경유라 안전(`app/account/actions.ts`).
- 벌크 임포트가 필요하면 서비스롤 키로 `auth.admin.createUser`를 **행마다 호출**한다.
  (이메일·비밀번호·`email_confirm:true`·`user_metadata` 지정 가능. 토큰 컬럼은 GoTrue가 ''로 채운다.)

## 부득이하게 직접 SQL로 넣었다면 — 교정 스니펫
넣은 직후 아래를 실행해 NULL 토큰을 ''로 정규화한다(자격증명·세션 영향 없음).

```sql
update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  recovery_token             = coalesce(recovery_token, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where confirmation_token is null or email_change is null
   or email_change_token_new is null or email_change_token_current is null
   or recovery_token is null or phone_change is null
   or phone_change_token is null or reauthentication_token is null;
```

## 사전 점검(가입/로그인 장애 시 1분 진단)
```sql
-- 0보다 크면 위 교정 스니펫 실행
select count(*) from auth.users
where confirmation_token is null or email_change is null or email_change_token_new is null
   or email_change_token_current is null or recovery_token is null or phone_change is null
   or phone_change_token is null or reauthentication_token is null;
```

_최종 조치: 2026-07-09 — 41개 NULL 행 교정 완료(D-064)._
