# SKILL — Generate an MTSPACE COFFEE product detail page

Produce an SEO/AIEO-optimized, text-based product detail page on the MTSPACE design system. Inputs come from a product object; output binds to a fixed section order with a sticky buy rail and a keycolor hero.

## Inputs
By `slug` from `presets.json` (auto-fill), or the full field set:
`name_kr, name_en, weight, slug, typeLine, point, price, priceValue, notesEn, heroLine, chips[], lead, flavours[], specs[], recipe[], faqs[], images[]`. Brand intro paragraphs are fixed (`presets.brand`).

## Generation logic
1. **Resolve product.** slug ∈ presets → load; merge overrides. Else build from inputs.
2. **Theme.** `point` key → `{point, point-text, check}`; set CSS vars + `data-point` + 4px accent + hero background.
3. **Render sections in fixed order:** hero → lead → image → flavour notes → about → coffee info → recipe → FAQ. Buy rail on the left.
4. **Build SEO/AIEO** from the same object:
   - `<head>`: title, meta description (= lead, ~110 chars), canonical, OG.
   - JSON-LD: Product+Offer, FAQPage, BreadcrumbList.
   - Exactly one H1 (name_kr in hero); H2 per section; image `alt` everywhere.
5. **Validate:** one H1 only; every image has alt; JSON-LD parses; mobile reflow (≤760px) stacks correctly; contrast on hero acceptable (light-roast points use white hero text — deepen one step if needed).

## Guardrails (design-system compliance)
- Background paper #FCFAF5; point color only as hero/accent/recipe keys/borders — not as flat fills elsewhere.
- Three type voices, never mixed within a line; wordmark letter-spacing 0.
- Hairline grid is the only background pattern (over the hero block).
- No invented colors outside the matrix; no decorative graphics; keep it text-first.

## Files
`MTSPACE-Product-Detail.html` (template) · `schema.json` (fields/bindings) · `presets.json` (product data + point colors + brand copy) · `PRODUCT_DETAIL_SPEC.md` (full spec).
