/**
 * OAuth 동의 화면.
 *
 * Supabase OAuth Server 의 Authorization Path 가 여기를 가리킨다.
 * (Authentication → OAuth Server → Authorization Path = /oauth/consent)
 *
 * 흐름
 *   Claude → Supabase /oauth/authorize → 여기(?authorization_id=...) → 승인 → redirect_url → Claude
 *
 * 네 가지를 반드시 지킨다.
 *   ① 로그인하지 않았으면 로그인으로 보낸다. 돌아올 주소를 잃지 않는다.
 *   ② **이미 동의한 사용자는 화면을 보여주지 않고 곧바로 되돌려보낸다.**
 *      getAuthorizationDetails 는 이 경우 details 가 아니라 redirect_url 을 준다.
 *      이걸 빠뜨리면 재연결 때마다 깨진 화면을 만난다.
 *   ③ MCP 접근 권한이 없는 역할이면 승인 버튼을 보여주지 않는다.
 *      동의는 됐는데 툴 호출이 전부 실패하는 상황이 사용자에게 가장 나쁘다.
 *   ④ 무엇이 열리고 무엇이 막히는지 구체적으로 적는다. "액세스 허용"은 동의가 아니다.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveAuthorization, denyAuthorization } from "./actions";

export const dynamic = "force-dynamic";

/** mcp/auth.ts 의 ROLE_SCOPES 와 같은 판단. 여기서 미리 걸러 헛된 동의를 막는다. */
const MCP_ALLOWED_ROLES = new Set(["admin"]);

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: { authorization_id?: string };
}) {
  const authorizationId = searchParams.authorization_id;
  if (!authorizationId) {
    return (
      <Shell title="잘못된 요청">
        <p className="text-sm text-neutral-600">
          인가 요청 식별자가 없습니다. 연결을 처음부터 다시 시도해 주세요.
        </p>
      </Shell>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const back = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/account/login?next=${encodeURIComponent(back)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(profile?.role ?? "");
  const allowed = MCP_ALLOWED_ROLES.has(role);

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !data) {
    return (
      <Shell title="인가 요청을 불러오지 못했습니다">
        <p className="text-sm text-neutral-600">
          {error ? String((error as { message?: string }).message ?? error) : "응답이 비어 있습니다."}
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          요청이 이미 만료되었을 수 있습니다. 연결을 다시 시도해 주세요.
        </p>
      </Shell>
    );
  }

  // ② 이미 동의한 경우 — 인가서버가 곧바로 redirect_url 을 준다.
  //    권한 없는 역할이면 되돌려보내지 않고 아래에서 안내한다.
  if (!("authorization_id" in data)) {
    if (!allowed) {
      return <NoPermission name={profile?.name} appName="연결된 애플리케이션" />;
    }
    redirect(data.redirect_url);
  }

  const appName = data.client?.name?.trim() || "이름이 없는 애플리케이션";
  const appUri = data.client?.uri?.trim() || "";

  if (!allowed) {
    return <NoPermission name={profile?.name} appName={appName} />;
  }

  async function onApprove() {
    "use server";
    const url = await approveAuthorization(authorizationId!);
    redirect(url);
  }

  async function onDeny() {
    "use server";
    const url = await denyAuthorization(authorizationId!);
    redirect(url);
  }

  return (
    <Shell title="연결을 허용하시겠습니까?">
      <p className="text-sm text-neutral-700">
        <strong>{appName}</strong>
        {appUri ? <span className="text-neutral-400"> ({appUri})</span> : null} 이(가) 이 계정으로
        상점 데이터를 조회하려 합니다.
      </p>

      <section className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">허용되는 것</h2>
        <ul className="mt-2 space-y-1 text-sm text-neutral-700">
          <li>· 상품·재고·단가 조회</li>
          <li>· 주문 조회 (결제 원문·배송 상세주소 제외)</li>
          <li>
            · 고객 조회 — <strong>이름·이메일·전화는 마스킹된 상태로만</strong>
          </li>
          <li>· 매출·재구매 등 집계 리포트</li>
          <li>· 공개 콘텐츠·FAQ·브랜드 토큰 조회</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">
          허용되지 않는 것
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-neutral-700">
          <li>
            · <strong>모든 쓰기</strong> — 주문·상품·고객 어느 것도 변경할 수 없습니다
          </li>
          <li>· 개인정보 원문 — 마스킹 해제 경로가 없습니다</li>
          <li>· 결제 원문(PG 응답·승인번호)</li>
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          쓰기 차단은 애플리케이션이 아니라 데이터베이스 권한으로 강제됩니다.
        </p>
      </section>

      <p className="mt-4 text-xs text-neutral-500">
        모든 조회는 감사 기록에 남습니다. 연결은 나중에 해제할 수 있습니다.
      </p>

      <div className="mt-6 flex gap-3">
        <form action={onApprove}>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            허용
          </button>
        </form>
        <form action={onDeny}>
          <button
            type="submit"
            className="rounded border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-50"
          >
            거부
          </button>
        </form>
      </div>
    </Shell>
  );
}

function NoPermission({ name, appName }: { name?: string | null; appName: string }) {
  return (
    <Shell title="접근 권한이 없습니다">
      <p className="text-sm text-neutral-700">
        <strong>{appName}</strong> 이(가) 연결을 요청했지만, 현재 계정
        {name ? ` (${name})` : ""} 에는 MCP 접근 권한이 없습니다.
      </p>
      <p className="mt-3 text-sm text-neutral-500">
        관리자에게 권한을 요청하세요. 지금 승인해도 모든 조회가 거부됩니다.
      </p>
      <a
        href="/"
        className="mt-6 inline-block rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
      >
        홈으로
      </a>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="mt-4">{children}</div>
    </main>
  );
}
