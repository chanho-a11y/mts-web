// 실행: npx tsx mcp/schema-smoke.mts   (프로젝트 루트에서)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "./index";

// --- 가짜 DB: 모든 툴의 "성공 경로"를 태워 outputSchema 를 검증한다 ---
const ROWS: Record<string, any[]> = {
  mcp_v_shop: [{ storefront_id: "s1", domain: "shop.example.com", brand_code: "acme" }],
  mcp_v_product: [{ id: "p1", slug: "sample-200", title: "샘플상품", title_en: "Sample", product_type: "blend",
    status: "active", is_b2b_only: false, weight_g: 200, key_color: "#C68D62", published_at: "2026-01-01",
    attributes: { attr_a: "값A", attr_b: ["값B"] }, attributes_en: {}, evidence: null,
    seo_title: null, seo_description: null, seo_title_en: null, seo_description_en: null, one_liner: null, one_liner_en: null }],
  mcp_v_variant: [{ id: "v1", product_id: "p1", sku: "SAMPLE-200", base_price: 18000, currency: "KRW",
    is_active: true, is_b2b_only: false, inventory_policy: "deny", position: 1, option_values: {}, weight_g: 200, grind: null }],
  mcp_v_variant_price: [{ variant_id: "v1", price: 16000, tier_name: "도매-기본", is_b2b: true }],
  mcp_v_inventory: [{ variant_id: "v1", sku: "SAMPLE-200", product_id: "p1", on_hand: 12, inventory_policy: "deny", is_active: true }],
  mcp_v_product_image: [{ product_id: "p1", storage_path: "a.jpg", alt: null, position: 1, is_primary: true, variant_id: null }],
  mcp_v_order: [{ id: "o1", order_no: "20260729-001", status: "paid", customer_type: "b2b", profile_id: "u1",
    channel: "web", email_masked: "ch****@x.com", phone_masked: "****1234", region: "경기",
    items_subtotal: 32000, discount_total: 0, shipping_fee: 3000, tax_amount: 0, grand_total: 35000,
    currency: "KRW", coupon_code: null, tax_invoice_requested: false, placed_at: "2026-07-25T00:00:00Z", paid_at: "2026-07-25T00:01:00Z" }],
  mcp_v_order_item: [{ order_id: "o1", variant_id: "v1", sku: "SAMPLE-200", title_snapshot: "샘플상품",
    option_snapshot: {}, unit_price: 32000, price_source: "individual", qty: 1, cancelled_qty: 0, line_total: 32000 }],
  mcp_v_payment: [{ order_id: "o1", provider: "inicis", method: "card", status: "paid", amount: 35000, currency: "KRW", approved_at: "2026-07-25T00:01:00Z" }],
  mcp_v_shipment: [{ order_id: "o1", carrier: "CJ", status: "shipped", shipped_at: "2026-07-26T00:00:00Z" }],
  mcp_v_customer_price: [{ profile_id: "u1", variant_id: "v1", price: 32000, starts_at: "2026-01-01", ends_at: null, note: null }],
  mcp_v_customer: [{ id: "u1", name_masked: "홍*호", email_masked: "ho****@x.com", phone_masked: "****1234",
    role: "business", price_tier: "도매-기본", is_b2b: true, company_name_masked: "에*시", business_status: "approved",
    approved_at: "2026-01-01", created_at: "2026-01-01", archived: false, language: "ko", marketing_opt_in: true }],
  mcp_v_site_setting: [{ key: "brand.color.key", value: "#123456", brand_code: "acme" },
                       { key: "brand.wordmark.rule", value: "재트래킹 금지", brand_code: "acme" }],
  mcp_v_content_post: [{ slug: "hello", title: "첫 글", excerpt: null, tags: [], author: "a", status: "published", published_at: "2026-01-01" }],
  mcp_v_faq: [{ question: "배송은?", category: "shipping", is_b2b_only: false, status: "published", position: 1 }],
};

function qb(table: string) {
  const api: any = {};
  for (const m of ["select","eq","in","gte","lte","or","order","range","limit","lt","lte2"]) api[m] = () => api;
  api.then = (res: any) => res({ data: ROWS[table] ?? [], error: null, count: (ROWS[table] ?? []).length });
  api.maybeSingle = async () => ({ data: (ROWS[table] ?? [])[0] ?? null, error: null });
  api.single = api.maybeSingle;
  return api;
}
const db: any = {
  from: (t: string) => qb(t),
  rpc: async (fn: string) => {
    if (fn === "mcp_resolve_price") return { data: [{ price: 32000, source: "individual" }], error: null };
    if (fn.startsWith("mcp_report_")) return { data: [{ period: "2026-07", orders: 11, gross_revenue: 3260230, refund_total: 0, net_revenue: 3260230 }], error: null };
    return { data: null, error: null };
  },
};

const ALL = ["catalog:read","inventory:read","pricing:read","orders:read","analytics:read","content:read","brand:read","customers:read"];
const ctx: any = {
  config: { storefrontId: "s1", currency: "KRW", timezone: "Asia/Seoul", schemaVersion: "1", enabledModules: ["coffee"],
    attributes: [{ key: "attr_a", label_ko: "속성A", type: "string", show_in_list: true }] },
  identity: { tokenId: null, profileId: null, role: "admin", scopes: ALL, tokenName: "smoke"  },
  db, audit: async () => {},
};

const CALLS: [string, any][] = [
  ["commerce_get_shop_info", {}],
  ["commerce_get_schema", {}],
  ["commerce_search_products", {}],
  ["commerce_get_product", { slug: "sample-200", include: ["variants","images","attributes","evidence"] }],
  ["commerce_get_inventory", { sku: "SAMPLE-200" }],
  ["commerce_resolve_price", { variant_id: "11111111-1111-1111-1111-111111111111", profile_id: "22222222-2222-2222-2222-222222222222" }],
  ["commerce_list_price_overrides", {}],
  ["commerce_search_orders", {}],
  ["commerce_get_order", { order_no: "20260729-001" }],
  ["commerce_run_report", { report: "sales_by_period" }],
  ["commerce_run_report", { report: "top_products" }],
  ["commerce_run_report", { report: "b2b_vs_b2c" }],
  ["commerce_run_report", { report: "aov_repeat" }],
  ["commerce_run_report", { report: "channel_mix" }],
  ["commerce_run_report", { report: "discount_impact" }],
  ["commerce_search_customers", {}],
  ["commerce_get_customer", { profile_id: "22222222-2222-2222-2222-222222222222" }],
  ["commerce_get_brand_tokens", {}],
  ["commerce_search_content", {}],
];

async function main() {
  const server = new McpServer({ name: "commerce-mcp", version: "0.1.0" });
  registerTools(server, () => ctx);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "smoke", version: "1.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);

  let pass = 0, fail = 0;
  for (const [name, args] of CALLS) {
    const label = args.report ? `${name}(${args.report})` : name;
    try {
      const r: any = await client.callTool({ name, arguments: args });
      if (r.isError) { console.log(`✗ ${label} -> 툴에러: ${r.content?.[0]?.text?.slice(0,80)}`); fail++; }
      else { console.log(`✓ ${label}`); pass++; }
    } catch (e: any) { console.log(`✗ ${label} -> 스키마검증 실패: ${String(e.message).slice(0,110)}`); fail++; }
  }
  console.log(`\nPASS ${pass} / FAIL ${fail}`);
  await client.close();
}
main();
