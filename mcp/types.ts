/**
 * MTSPACE COMMERCE MCP — 계약 타입
 *
 * ⚠️ 경계 규칙: 이 디렉터리(mcp/)는 장차 사설 패키지 @mts/commerce-mcp 로 추출된다.
 *    app/ · components/ · lib/ 를 import 하지 않는다. DB 뷰 계약(mcp_v_*)에만 의존한다.
 *    업종별 차이는 뷰가 흡수하므로 여기에는 커피 전용 컬럼명이 등장하지 않는다.
 */

/** mcp_config.product_attribute_schema 의 한 항목 */
export interface AttributeDescriptor {
  key: string;
  label_ko: string;
  label_en?: string;
  type: "string" | "string[]" | "number" | "boolean" | "object";
  group?: string;
  show_in_list?: boolean;
}

export interface McpConfig {
  storefrontId: string;
  schemaVersion: string;
  enabledModules: string[];
  attributes: AttributeDescriptor[];
}

/** 툴 게이트에 쓰는 스코프 */
export type Scope =
  | "catalog:read"
  | "inventory:read"
  | "pricing:read"
  | "orders:read"
  | "orders:raw"
  | "customers:read"
  | "customers:pii"
  | "analytics:read"
  | "analytics:sql"
  | "content:read"
  | "brand:read";

export interface Identity {
  tokenId: string | null;
  profileId: string | null;
  role: string;
  scopes: Scope[];
  tokenName: string;
  /** 부트스트랩 토큰으로 접속했는가 (감사로그에 표시) */
  bootstrap: boolean;
}

/** 뷰 계약: mcp_v_product 는 업종과 무관하게 이 모양을 반환한다 */
export interface ProductRow {
  id: string;
  slug: string;
  title: string | null;
  title_en: string | null;
  one_liner: string | null;
  one_liner_en: string | null;
  product_type: string | null;
  status: string | null;
  is_b2b_only: boolean | null;
  weight_g: number | null;
  key_color: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_title_en: string | null;
  seo_description_en: string | null;
  published_at: string | null;
  updated_at: string | null;
  is_visible: boolean | null;
  position: number | null;
  evidence: unknown;
  attributes: Record<string, unknown> | null;
  attributes_en: Record<string, unknown> | null;
}

export interface VariantRow {
  id: string;
  product_id: string;
  sku: string | null;
  option_values: unknown;
  weight_g: number | null;
  grind: string | null;
  base_price: number | null;
  currency: string | null;
  is_active: boolean | null;
  is_b2b_only: boolean | null;
  inventory_policy: string | null;
  position: number | null;
}

export interface OrderRow {
  id: string;
  order_no: string;
  status: string;
  customer_type: string | null;
  profile_id: string | null;
  channel: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  region: string | null;
  items_subtotal: number | null;
  discount_total: number | null;
  shipping_fee: number | null;
  tax_amount: number | null;
  grand_total: number | null;
  currency: string | null;
  coupon_code: string | null;
  tax_invoice_requested: boolean | null;
  placed_at: string | null;
  paid_at: string | null;
}

export interface PriceResult {
  price: number | null;
  source: "individual" | "tier" | "base" | null;
}

/** 툴 실행 컨텍스트 */
export interface ToolContext {
  config: McpConfig;
  identity: Identity;
  /** mcp_v_* 뷰와 지정 함수만 조회하는 클라이언트 */
  db: DbClient;
  audit: (entry: AuditEntry) => Promise<void>;
}

export interface AuditEntry {
  tool: string;
  args: Record<string, unknown>;
  rowCount: number;
  durationMs: number;
  status: "ok" | "denied" | "error";
  errorCode?: string;
  piiUnmasked?: boolean;
  rawSql?: boolean;
}

/**
 * supabase-js 의 최소 표면만 타입으로 고정한다.
 * 패키지 추출 시 어댑터 교체가 쉽도록 구조적 타입으로 둔다.
 */
export interface DbClient {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
}
