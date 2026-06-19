# MTSPACE COFFEE — Product Detail Page Template Package

Templatized, **import-ready** product detail page system, matching the label package's design language. Layout **B** (sticky buy rail + modular content) with a **keycolor hero**, on a bright **#FCFAF5** canvas for large screens.

## What's inside
| File | Purpose |
|---|---|
| **MTSPACE-Product-Detail.html** | The master template — full working page (댐굳 example). Self-contained (fonts from CDN). Includes the live `<head>` SEO block + 3 JSON-LD scripts and the mobile `@media` reflow. |
| **PRODUCT_DETAIL_SPEC.md** | Full technical spec — layout, section order, tokens, field→element binding, the SEO/AIEO system, responsive rules, import steps. |
| **schema.json** | Machine-readable input model: every field and which page element / structured-data slot it binds to. |
| **presets.json** | Slug-keyed product data + flavour×roast point colors + fixed brand copy. Seeds new pages. |
| **SKILL.md** | Step-by-step generation logic + guardrails for a CMS macro or agent. |

## Content order (fixed)
제품 핵심 내용 → 플레이버 노트 → 엠티스페이스 커피 소개 → 커피 정보 → 추출 레시피 → FAQ. Buy rail (image · price · CTA · chips) stays on the left; hero (keycolor + hairline pattern) opens the right column.

## SEO / AIEO (built in)
- One semantic `H1` (product name in hero) → `H2` per section → `H3` subs.
- `<head>`: title, meta description, canonical, Open Graph.
- **JSON-LD**: `Product`+`Offer`, `FAQPage` (AIEO answer extraction), `BreadcrumbList`.
- Every image carries `alt`. All structured data is injected from the one product object — no hand-editing.

## Use it
1. Open `MTSPACE-Product-Detail.html` (renders the 댐굳 page).
2. To make another product: copy a `presets.json` entry, change `slug`/copy/`point`, and feed it to the template (map `{{TOKEN}}`s per `schema.json`).
3. Switch theme by `point` key (e.g. `peach-light` for 아리차) — hero, accent, and recipe keys recolor automatically.

## Importing into another studio / CMS
Map your CMS fields to the template slots and `--point*` / `data-point` variables (see `PRODUCT_DETAIL_SPEC.md §5, §8` and `schema.json`). Generate the `<head>` SEO block and JSON-LD from the same product object so content and structured data never drift.

## Notes
- Internet required for Google Fonts + Pretendard; bundle locally for offline/SSR.
- Desktop + mobile (≤760px) covered; tablet inherits desktop.
- Point colors are RGB — supply CMYK/Pantone only if shared with print.
