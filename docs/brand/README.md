# Handoff: MTSPACE COFFEE Website & Product Pages

## Overview
A brand redesign system for **MTSPACE COFFEE**, a specialty coffee brand. This package contains everything needed to build the marketing website, product detail pages (PDP), product cards/thumbnails, labels, and social content. Aesthetic: **minimal, calm, premium-yet-affordable** — symmetrical layouts on a horizontal/vertical modular grid, a single brand key color (clay), warm neutral canvas, and a per-product point color derived from flavor × roast.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype/spec showing the intended look, system, and behavior. They are **not production code to copy directly.** The task is to **recreate this design system in the target codebase's environment** (React, Next.js, Vue, Astro, etc.) using its established patterns. If no codebase exists yet, **Next.js + plain CSS (or Tailwind mapped to these tokens)** is a good default for a content + commerce site with strong SEO needs.

Start from `DESIGN_SYSTEM.md` (the authoritative spec) and `tokens.css` (drop-in variables). Open `MTSPACE_Design_Guide.html` in a browser to see the system rendered.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and component anatomy are final. Recreate the UI faithfully using the exact tokens in `tokens.css`. The one deliberately flexible element is the **hairline grid background**, which is optional/toggleable per surface.

## Files
| File | What it is |
|---|---|
| `DESIGN_SYSTEM.md` | **Authoritative spec** — principles, color tokens, flavor×roast matrix, type scale, spacing, hierarchy, responsive rules, component anatomy, SEO/JSON-LD, sample product data. Read this first. |
| `tokens.css` | Drop-in CSS custom properties (color, type, spacing, radius, grid pattern) + font imports. Use as the styling foundation. |
| `MTSPACE_Design_Guide.html` | Self-contained visual guide (works offline). Reference for how the system looks assembled. |

## Screens / Views to build

### 1. Home / Landing
- **Purpose:** brand intro + shop entry.
- **Layout:** desktop 12-col (max 1200px, 80px margin); hero with wordmark centered on oat (optional hairline grid), tagline `everyday excellence` (mono, +5px tracking, uppercase, clay). Product grid below (1:1 cards).
- **Nav:** desktop horizontal (SHOP / ORIGINS / BREW / ABOUT); mobile hamburger.

### 2. Product Detail Page (PDP) — primary screen
- **Layout — desktop:** 2-col hero (packshot on oat-grid | info column). Below: 5-col spec strip, then 2-col story (THE STORY 명조 + sand BREW GUIDE panel).
- **Layout — mobile:** stacked (image → info → spec → story), **price + "장바구니 담기" CTA pinned to bottom of viewport.**
- **Components & exact values:** see `DESIGN_SYSTEM.md` §9 (PDP) and §4 (type) and §2 (color). Key items:
  - Origin tag: Plex Mono 10px, ink-soft, `SINGLE ORIGIN · AFRICA`, preceded by the product point-color dot (`#D2A84E` for the sample).
  - H1 product name: Helvetica 800, 36/1.05 desktop · 26/1.1 mobile, letter-spacing 0.
  - Cup notes: Spectral italic, clay-deep `#B0764A`.
  - Price: Helvetica 800, 24px. Net weight: Plex Mono, ink-soft.
  - Primary button: `#3C352C` bg / `#F6F1E7` text, radius 3px, padding 14px, weight 600.
  - Spec strip cells: mono label (8.5px, ink-soft, +1 tracking) + value (Helvetica 600, 13px).
- **SEO:** one `<h1>`, spec as `<dl>`/`<table>`, Product + FAQPage JSON-LD (see §10). Image alt pattern in §10.

### 3. Product Card / Thumbnail (1:1)
- Reusable grid tile. Same skeleton across all products; **only the point color changes.** Anatomy in §9.

### 4. Label Sticker (60×90mm) — print/packaging reference
- Centered symmetric layout. Anatomy in §9. Useful as a compact product summary component too.

### 5. Instagram content (1:1, series of 3)
- ① oat-grid product ② clay serif quote ③ ink spec/brew card. For a social/press section. §9.

## Interactions & Behavior
- **Pattern toggle:** the hairline grid is decorative; treat as a per-surface boolean, default ON for hero/empty surfaces, OFF (clear zone) behind text blocks.
- **Hover:** primary button lightens to `#4A443A`; links use `--clay-deep` with underline on hover. Keep transitions subtle (~150ms ease).
- **Responsive:** breakpoints 768 / 1024 (§8). PDP reflows 2-col → stacked; CTA becomes sticky-bottom on mobile.
- **Touch:** min 44×44px targets, ≥8px apart.

## State Management
Minimal for marketing pages. For commerce: product data (name, origin, process, altitude, varietal, roast, crop, cup notes, flavor, roast level, lot, roasted date, net weight, price, point-color), cart count, and the derived point color = `pointColor(flavor, roastLevel)` looked up from the §3 matrix.

## Design Tokens
All in `tokens.css` and `DESIGN_SYSTEM.md` (§2 color, §3 point matrix, §4 type, §5 spacing/radius/border, §6 grid pattern). Highlights:
- Key color `--clay #C68D62`; canvas `--oat #F6F1E7`; ink `--ink #3C352C`; border `#E3DAC8`.
- Spacing 8pt: 4/8/12/16/24/32/48/64/96. Radius 2/3/999. Shadow `0 1px 3px rgba(0,0,0,.06)`.
- Fonts: Helvetica Neue/Pretendard (sans), Spectral/Noto Serif KR (serif), IBM Plex Mono (mono).

## Assets
No raster assets are bundled — packshots are shown as placeholders. The codebase should supply real product photography (shot on oat/neutral backgrounds to match). Logo is **typographic** (no image file): render the wordmark with the font stack per §9. Favicon = `M` monogram in a 2px ink square.

## Accessibility
- Body text = `--ink` on `--oat` (passes AA). Never use `--clay` for small body text — use `--clay-deep` or `--ink`.
- Maintain heading order; one `<h1>` per page.
- Form inputs ≥16px font on mobile (prevents iOS zoom).
