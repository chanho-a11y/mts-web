-- =====================================================================
-- MTSPACE COMMERCE MCP — 제거
-- v1.0 · 2026-07-29
--
-- 주의: §8 주문 백필은 되돌리지 않는다(정상 데이터 보정이므로).
--       감사로그를 보존하려면 아래 mcp_audit_log drop 을 주석 처리할 것.
-- =====================================================================

drop view if exists
  public.mcp_v_kb_entry, public.mcp_v_faq, public.mcp_v_content_post,
  public.mcp_v_customer_price, public.mcp_v_customer, public.mcp_v_shipment,
  public.mcp_v_payment, public.mcp_v_order_item, public.mcp_v_order,
  public.mcp_v_product_image, public.mcp_v_inventory, public.mcp_v_variant_price,
  public.mcp_v_variant, public.mcp_v_product, public.mcp_v_shop
cascade;

drop function if exists public.mcp_resolve_price(uuid, uuid, timestamptz);
drop function if exists public.mcp_audit(uuid, uuid, text, jsonb, text[], int, int, text, text, boolean, boolean);
drop function if exists public.mcp_verify_token(text);
drop function if exists public.mcp_touch_token(uuid);
drop function if exists public.mcp_hash_token(text);
drop function if exists public.mcp_region(jsonb);
drop function if exists public.mcp_mask_phone(text);
drop function if exists public.mcp_mask_email(text);
drop function if exists public.mcp_config_json(text);
drop function if exists public.mcp_config_text(text);
drop function if exists public.mcp_storefront_id();

drop table if exists public.mcp_audit_log;
drop table if exists public.mcp_token;
drop table if exists public.mcp_config;

revoke mcp_reader from authenticator;
drop role if exists mcp_reader;

select 'MCP 제거 완료' as result;
