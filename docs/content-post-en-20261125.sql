-- D-174: 블로그 영문 컬럼 (Supabase mtspace-commerce 에 2026-11-25 적용 완료)
alter table public.content_post
  add column if not exists title_en text,
  add column if not exists excerpt_en text,
  add column if not exists body_html_en text,
  add column if not exists seo_title_en text,
  add column if not exists seo_description_en text;
