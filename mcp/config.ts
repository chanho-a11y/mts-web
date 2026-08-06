/**
 * 인스턴스 설정 로드 + 스키마 버전 계약.
 *
 * 설정은 mcp_config 테이블이 아니라 mcp_config_text / mcp_config_json 함수로 읽는다.
 * (mcp_reader 에게는 테이블 권한이 없다.)
 */
import type { AssetPolicy, AttributeDescriptor, DbClient, McpConfig } from "./types";
import { McpSetupError } from "./db";

/** 이 패키지 버전이 지원하는 DB 스키마 계약 */
export const SUPPORTED_SCHEMA_VERSIONS = ["1"];

let cached: { at: number; value: McpConfig } | null = null;
const TTL_MS = 60_000;

async function cfgText(db: DbClient, key: string): Promise<string | null> {
  const { data, error } = await db.rpc("mcp_config_text", { p_key: key });
  if (error) {
    throw new McpSetupError(
      `설정을 읽지 못했습니다 (${key}): ${error.message}`,
      "MCP 설치 SQL(db/install.sql) 적용 여부와 mcp_reader 의 함수 EXECUTE 권한을 확인하세요.",
    );
  }
  return (data as string | null) ?? null;
}

async function cfgJson(db: DbClient, key: string): Promise<unknown> {
  const { data, error } = await db.rpc("mcp_config_json", { p_key: key });
  if (error) {
    throw new McpSetupError(
      `설정을 읽지 못했습니다 (${key}): ${error.message}`,
      "MCP 설치 SQL(db/install.sql) 적용 여부를 확인하세요.",
    );
  }
  return data ?? null;
}

export async function loadConfig(db: DbClient, force = false): Promise<McpConfig> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const storefrontId = await cfgText(db, "storefront_id");
  if (!storefrontId) {
    throw new McpSetupError(
      "mcp_config.storefront_id 가 비어 있습니다.",
      "이 인스턴스가 다룰 스토어프론트를 mcp_config 에 넣으세요.",
    );
  }

  const schemaVersion = (await cfgText(db, "schema_version")) ?? "0";
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
    // 조용히 넘기지 않는다. 잘못된 값을 태연히 반환하는 것이 최악의 실패다.
    throw new McpSetupError(
      `DB 스키마 버전 ${schemaVersion} 은 이 MCP 패키지가 지원하지 않습니다 (지원: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}).`,
      "패키지를 업데이트하거나 mcp_v_* 뷰 계약을 지원 버전에 맞추세요.",
    );
  }

  const modulesRaw = (await cfgText(db, "enabled_modules")) ?? "";
  const enabledModules = modulesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const attrRaw = await cfgJson(db, "product_attribute_schema");
  const attributes: AttributeDescriptor[] = Array.isArray(attrRaw)
    ? (attrRaw as AttributeDescriptor[])
    : [];

  const currency = (await cfgText(db, "currency")) ?? "KRW";
  const timezone = (await cfgText(db, "timezone")) ?? "UTC";

  /**
   * 자산 정책.
   *
   * 여기서 부팅을 실패시키지 않는 이유: 이 설정이 없다는 것은 자산 마이그레이션이
   * 아직 안 됐다는 뜻일 뿐인데, 그걸로 읽기 툴까지 전부 죽이면 코드를 먼저 배포한
   * 인스턴스가 통째로 멈춘다. "기본값을 대신 쓰지 않는다"는 원칙은 지키되,
   * 실패 지점은 자산 툴 호출 시점으로 미룬다(tools/assets.ts 의 policyFor).
   */
  const policyRaw = await cfgJson(db, "asset_policy");
  const assetPolicy: Record<string, AssetPolicy> =
    policyRaw && typeof policyRaw === "object" && !Array.isArray(policyRaw)
      ? (policyRaw as Record<string, AssetPolicy>)
      : {};

  const value: McpConfig = {
    storefrontId,
    currency,
    timezone,
    schemaVersion,
    enabledModules,
    attributes,
    assetPolicy,
  };
  cached = { at: Date.now(), value };
  return value;
}

/** 목록 응답에 실을 속성 키 */
export function listAttributeKeys(config: McpConfig): string[] {
  return config.attributes.filter((a) => a.show_in_list).map((a) => a.key);
}

export function pickAttributes(
  attrs: Record<string, unknown> | null,
  keys: string[],
): Record<string, unknown> {
  if (!attrs) return {};
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in attrs) out[k] = attrs[k];
  return out;
}
