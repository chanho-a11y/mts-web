// 실행: npx tsx mcp/schema-smoke.mts   (프로젝트 루트에서)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { deflateSync } from "node:zlib";
import { registerTools } from "./index";

/**
 * 최소 PNG 인코더 — 스모크용 단색 이미지를 만든다.
 * 커버 정책의 하한(1200x630)을 통과해야 하므로 실제 크기의 이미지가 필요한데,
 * 단색이면 deflate 후 몇 KB 라 파일에 박아 넣지 않고 여기서 만든다.
 */
function solidPng(width: number, height: number): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height); // 필터 0 + RGB, 전부 0 = 검정
  const idat = deflateSync(raw, { level: 9 });

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (b: Buffer) => {
    let c = 0xffffffff;
    for (const byte of b) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, body: Buffer) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(body.length, 0);
    const typed = Buffer.concat([Buffer.from(type, "ascii"), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed), 0);
    return Buffer.concat([head, typed, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type = truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const SMOKE_PNG_B64 = solidPng(1200, 800).toString("base64");

// --- 가짜 DB: 모든 툴의 "성공 경로"를 태워 outputSchema 를 검증한다 ---
const ROWS: Record<string, any[]> = {
  mcp_v_shop: [{ storefront_id: "s1", domain: "shop.example.com", brand_code: "acme" }],
  mcp_v_product: [{ id: "p1", slug: "sample-200", title: "샘플상품", title_en: "Sample", product_type: "blend",
    status: "active", is_b2b_only: false, weight_g: 200, key_color: "#C68D62", published_at: "2026-01-01",
    attributes: { attr_a: "값A", attr_b: ["값B"] }, attributes_en: {}, evidence: null,
    story: "제품 설명 본문", story_en: null, categories: ["blends"],
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
                       { key: "brand.color.bg", value: "#F0F0E0 (bg)", brand_code: "acme" },
                       { key: "brand.color.surface", value: "#E0D8C8", brand_code: "acme" },
                       { key: "brand.color.text", value: "#333028", brand_code: "acme" },
                       { key: "brand.color.text_muted", value: "#807868", brand_code: "acme" },
                       { key: "brand.identity.name", value: "ACME COFFEE", brand_code: "acme" },
                       { key: "brand.wordmark.rule", value: "재트래킹 금지", brand_code: "acme" }],
  mcp_v_content_post: [{ slug: "hello", title: "첫 글", excerpt: null, body_html: "<p>본문</p>", cover_image: null,
    tags: [], author: "a", status: "published", published_at: "2026-01-01", seo_title: null, seo_description: null }],
  mcp_v_faq: [{ question: "배송은?", category: "shipping", is_b2b_only: false, status: "published", position: 1 }],
  mcp_v_category: [{ slug: "blends", name: "블렌드", name_en: "Blends", kind: "blend", is_b2b: false, position: 1 }],
  mcp_v_product_change: [{ id: "c1", slug: "sample-200", title: "샘플상품", patch: { story: "새 설명" },
    before: { story: "옛 설명" }, note: "복사 오염 정정", status: "pending",
    created_at: "2026-08-05T00:00:00Z", reviewed_at: null }],
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
    if (fn === "mcp_draft_post") return { data: "smoke-post", error: null };
    if (fn === "mcp_asset_precheck") return { data: null, error: null };
    if (fn === "mcp_attach_cover") return { data: "smoke-post", error: null };
    if (fn === "mcp_register_asset") return { data: false, error: null };
    if (fn === "mcp_propose_product_change")
      return { data: { change_id: "c1", slug: "sample-200", fields: ["story"], status: "pending" }, error: null };
    if (fn.startsWith("mcp_report_")) return { data: [{ period: "2026-07", orders: 11, gross_revenue: 3260230, refund_total: 0, net_revenue: 3260230 }], error: null };
    return { data: null, error: null };
  },
};

const ALL = ["catalog:read","catalog:write","inventory:read","pricing:read","orders:read","analytics:read","content:read","content:write","brand:read","customers:read"];
// 진짜 렌더러(next/og)는 여기서 부르지 않는다 — 하네스는 형태 검증이 목적이다.
const fakeRender = async () => solidPng(1200, 800);

const storage: any = {
  upload: async () => ({ error: null }),
  publicUrl: (bucket: string, path: string) => `https://example.test/storage/v1/object/public/${bucket}/${path}`,
};

const ctx: any = {
  config: { storefrontId: "s1", currency: "KRW", timezone: "Asia/Seoul", schemaVersion: "1", enabledModules: ["coffee"],
    attributes: [{ key: "attr_a", label_ko: "속성A", type: "string", show_in_list: true }],
    assetPolicy: {
      "blog-cover": {
        bucket: "product-assets", prefix: "mcp/blog/cover",
        mime: ["image/png", "image/jpeg", "image/webp"],
        max_bytes: 1048576, max_b64_len: 1400000,
        min_width: 1200, min_height: 630, aspect_min: 1.2, aspect_max: 2.0, max_per_hour: 20,
      },
    } },
  // profileId 는 자산 쿼터의 기준이라 null 이면 안 된다(OAuth 경로도 항상 채운다).
  identity: { tokenId: null, profileId: "33333333-3333-3333-3333-333333333333", role: "admin", scopes: ALL, tokenName: "smoke"  },
  db, storage, render: fakeRender, audit: async () => {},
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
  ["commerce_get_post", { slug: "hello" }],
  ["commerce_draft_post", { title: "스모크 초안", body_md: "## 소제목\n\n첫 문단.\n\n- 항목1\n- 항목2\n\n| a | b |\n|---|---|\n| 1 | 2 |\n" }],
  ["commerce_list_product_changes", {}],
  ["commerce_propose_product_update", { slug: "sample-200", note: "스모크", story: "새 설명",
    flavor_notes: ["초콜릿"], product_type: "블렌드", categories: ["blends"] }],
  ["commerce_create_image", { purpose: "blog-cover", data_base64: SMOKE_PNG_B64,
    alt: "스모크용 검정 커버", post_slug: "smoke-post", name_hint: "smoke-cover" }],
  ["commerce_create_image", { purpose: "blog-cover", template: "signature-cover",
    fields: { headline: "스모크 렌더 커버", eyebrow: "검증", notes: "smoke", variant: "light" },
    alt: "렌더 경로 스모크 커버" }],
  ["commerce_attach_cover", { slug: "smoke-post",
    cover_image: "https://example.test/storage/v1/object/public/product-assets/mcp/blog/cover/202608/smoke-abcdef012345.png" }],
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
