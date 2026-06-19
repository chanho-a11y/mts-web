# MTSPACE COFFEE — Product Detail Page Technical Specification (v1)

Importable, data-driven product detail page following the MTSPACE design system. Pairs with `MTSPACE-Product-Detail.html` (template), `schema.json` (input model), `presets.json` (product data).

---

## 1. Layout
- **Container:** max-width **1040 px**, centered, background **#FCFAF5** (white with subtle oat tint — chosen for large screens).
- **Top accent:** 4 px bar in the product point color.
- **Two-column body:** left **sticky buy rail (312 px)** + right **content (fluid)**.
- **Right column opens with a full-width keycolor hero** (point color + hairline grid pattern, same vocabulary as the label package).

## 2. Section order (fixed)
1. **Hero** — kicker (typeLine), H1 (name_kr), EN+weight, rule, flavour notes line. Point-color background + hairline grid.
2. **제품 핵심 내용** — lead paragraph (명조).
3. *(image slot 16:9)*
4. **플레이버 노트** — 3 cards, point-color top border.
5. **엠티스페이스 커피 소개** — 2 brand paragraphs + image (4:5).
6. **커피 정보** — 2-column borderless key/value.
7. **추출 레시피** — method │ numbers (+ faint condition).
8. **FAQ** — Q/A list (AIEO).
- Buy rail (left): main image (1:1), 3 thumbnails, kicker, H1, EN, price, CTA, chips.

## 3. Design tokens (CSS variables)
```
--oat #F6F1E7  --paper #FCFAF5  --tint #F1EBDD  --tint2 #F3EEE2
--ink #3C352C  --ink-soft #5C574E  --mute #8A8173  --faint #A79E8D  --hair #ECE4D4
--point / --point-text / --check   (per product, from pointColors)
--maxw 1040px
```
Fonts: **Helvetica Neue / Pretendard** (UI, wordmark) · **Spectral / Noto Serif KR** (lead, notes, brand — 명조) · **IBM Plex Mono (+Pretendard)** (labels, specs, recipe, data).

## 4. Point color — flavour × roast matrix
Same table as the label package (`presets.json → pointColors`). Sets `--point` (hero bg, accent, recipe keys), `--point-text` (deeper shade for text on light backgrounds), `--check` (hero grid lines). Set via `<body data-point="…">` + a tiny mapping script, or inline the three vars.

## 5. Field → element binding
Authoritative map in `schema.json`. Highlights:
- `name_kr` → **single H1** (hero) + rail title + `<title>` + breadcrumb + JSON-LD.
- `point` → CSS vars + accent + hero background.
- `lead` → core paragraph **and** `meta description` / `og:description`.
- `specs` → coffee-info table **and** JSON-LD `additionalProperty`.
- `faqs` → FAQ section **and** JSON-LD `FAQPage`.
- `images[]` → slots; **every image needs `alt`**.

## 6. SEO / AIEO system
Emit in `<head>` (the template ships a working example):
- `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:type/title/description/image`.
- **JSON-LD** (3 blocks): `Product`+`Offer`, `FAQPage`, `BreadcrumbList`.
- **Hierarchy:** exactly one `H1` (name_kr, in hero); each section uses `H2`; sub-items `H3`.
- **AIEO:** FAQ written as natural-language Q&A and mirrored into `FAQPage` so AI assistants can extract answers.
- All values are injected from the product object — no hand-editing of the structured data.

## 7. Responsive
- ≤ 760 px: columns stack (content first, buy rail second), coffee-info 2→1 col, about stacks, flavour 3→2 cols, hero H1 46→36 px. Rules live in the template's `@media` block.

## 8. Import into a studio / CMS
1. Load `MTSPACE-Product-Detail.html` as the master template.
2. Map CMS fields to the `{{TOKEN}}` slots / `data-field` regions per `schema.json`.
3. Seed product data from `presets.json` (keyed by slug).
4. Expose `--point*` and `data-point` as the per-product theme switch.
5. Generate the `<head>` SEO block + 3 JSON-LD scripts from the same product object.

## 9. Notes
- Internet required for Google Fonts + Pretendard; bundle locally for offline.
- Point colors are RGB; supply CMYK/Pantone only if also used in print.
