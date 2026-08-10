/**
 * COMMERCE MCP — 계약 타입
 *
 * ⚠️ 경계 규칙: 이 디렉터리(mcp/)는 장차 사설 패키지 @<scope>/commerce-mcp 로 추출된다.
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

/**
 * mcp_config.asset_policy 의 한 항목.
 * 크기·형식·상한을 코드가 아니라 설정이 갖는다 — 인스턴스마다 다르기 때문이다.
 */
export interface AssetPolicy {
  bucket: string;
  /** 스토리지 경로 접두사. 반드시 mcp/ 로 시작한다(RLS 가 그렇게 묶여 있다) */
  prefix: string;
  mime: string[];
  max_bytes: number;
  max_b64_len: number;
  min_width: number;
  min_height: number;
  aspect_min: number;
  aspect_max: number;
  max_per_hour: number;
}

export interface McpConfig {
  storefrontId: string;
  /** ISO 4217. mcp_config.currency 에서 온다. 코드에 하드코딩하지 않는다 */
  currency: string;
  /** 리포트 기간 버킷 기준 시간대. mcp_config.timezone */
  timezone: string;
  schemaVersion: string;
  enabledModules: string[];
  attributes: AttributeDescriptor[];
  /** purpose → 정책. 마이그레이션 전 인스턴스에서는 비어 있고, 자산 툴이 그때 오류를 낸다 */
  assetPolicy: Record<string, AssetPolicy>;
}

/** 툴 게이트에 쓰는 스코프 */
export type Scope =
  | "catalog:read"
  /** 상품 수정 '제안' 권한. 상품을 직접 바꾸는 권한이 아니다 — 반영은 관리자가 한다 */
  | "catalog:write"
  | "inventory:read"
  | "pricing:read"
  | "orders:read"
  | "orders:raw"
  | "customers:read"
  | "customers:pii"
  | "analytics:read"
  | "analytics:sql"
  | "content:read"
  /** 콘텐츠 초안 쓰기. 발행 권한이 아니다 — 발행은 관리자 화면에서 사람이 한다 */
  | "content:write"
  | "brand:read";

export interface Identity {
  tokenId: string | null;
  profileId: string | null;
  role: string;
  scopes: Scope[];
  tokenName: string;
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
  /** 제품 설명 정본. one_liner 와 다른 필드다(D-104) */
  story: string | null;
  story_en: string | null;
  /** 카테고리 슬러그 배열. product_categories 관계를 정규화한 값 */
  categories: string[] | null;
}

export interface VariantRow {
  id: string;
  product_id: string;
  sku: string | null;
  option_values: unknown;
  weight_g: number | null;
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
  source: "individual" | "tier" | "tier_default" | "base" | null;
}

/** 커버 렌더 필드 (D-108). 템플릿 레이아웃은 render.ts 가, 색·워드마크는 brand.* 토큰이 정한다 */
export interface CoverFields {
  headline: string;
  eyebrow?: string;
  notes?: string;
  variant?: "light" | "dark";
}

/**
 * 서버측 커버 렌더러. Next 런타임 결합(next/og)은 이 어댑터 뒤에 숨긴다 —
 * 패키지 추출·스모크 하네스에서는 다른 구현(또는 부재)으로 갈아끼운다.
 */
export type CoverRenderer = (spec: {
  template: "signature-cover";
  fields: CoverFields;
  tokens: Record<string, string>;
}) => Promise<Buffer>;

/** 툴 실행 컨텍스트 */
export interface ToolContext {
  config: McpConfig;
  identity: Identity;
  /** mcp_v_* 뷰와 지정 함수만 조회하는 클라이언트 */
  db: DbClient;
  /** 자산 저장소. DbClient 와 분리해 둔다 — 패키지 추출 시 어댑터를 따로 갈아끼울 수 있어야 한다 */
  storage: StorageClient;
  /** 서버측 커버 렌더러. 없는 배포에서는 template 렌더가 명확한 오류를 낸다 */
  render?: CoverRenderer;
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

export interface StorageError {
  message: string;
  statusCode?: string | number;
  name?: string;
}

/**
 * 자산 저장소의 최소 표면.
 * 덮어쓰기(upsert)·삭제는 의도적으로 노출하지 않는다 — 부재로 강제한다.
 */
export interface StorageClient {
  upload: (
    bucket: string,
    path: string,
    body: Uint8Array,
    opts: { contentType: string; cacheControl: string },
  ) => Promise<{ error: StorageError | null }>;
  publicUrl: (bucket: string, path: string) => string;
}
