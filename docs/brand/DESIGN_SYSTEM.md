# MTSPACE COFFEE — Design System Spec

> Machine-readable design system for building the MTSPACE COFFEE website and product pages.
> Slogan: **everyday excellence** · "매일의 커피는 우리의 삶을 만듭니다"
> Direction: minimal, calm, premium-yet-affordable. Symmetrical layout, horizontal/vertical modular grid. Single brand key color + per-product point color.

---

## 1. Design Principles

1. **Origin integrity** (원산지의 정직함) — speak in facts: origin, lot, process, altitude, roast date.
2. **Technical rigor** (기술적 엄밀함) — structured specs, mono type for data.
3. **Quiet confidence** (조용한 자신감) — restraint over decoration; whitespace is the hero.
4. **Everyday access** (매일의 접근성) — approachable, human, never cold or "cheap".

**Layout law:** every layout is built on a **center vertical symmetry axis** and an **8px base module** (24/48px grid). Color = 90% neutral, ≤10% accent. Color comes from content, not the canvas.

---

## 2. Color Tokens

### Core (brand-fixed — never per product)
| Token | Hex | Use |
|---|---|---|
| `--clay` (KEY) | `#C68D62` | brand key color — large accents, surfaces, keylines. **Not for small body text.** |
| `--clay-deep` | `#B0764A` | text-safe accent / links on light bg |
| `--oat` | `#F6F1E7` | primary background |
| `--sand` | `#ECE2D1` | cards, panels, secondary surface |
| `--ink` | `#3C352C` | body text, headlines, dark surfaces (cacao) |
| `--ink-soft` | `#8A8173` | muted text, captions |
| `--border` | `#E3DAC8` | hairlines, card borders |
| `--paper` | `#FFFFFF` | elevated card surface |

### Support tints
`#FBF8F1` (oat-light) · `#E7C9AD` (clay-tint) · `#D3C8B3` (taupe) · `#F3EFE6` (note panel) · `#FAF6EE` (warm-paper)

### Page chrome
`--page-bg: #E7E0D3` (the gray-warm behind cards)

### Contrast (WCAG)
- `--ink` on `--oat` → passes AA for all sizes. **Default body pairing.**
- `--clay` on `--oat` → fails for small text → use for ≥24px / accents / fills only.
- Text on `--clay` or `--ink` surfaces → use `--oat`/white.

---

## 3. Product Point Color — Flavor × Roast Matrix

Per-product identifier color. **Used only on small indicators**: the label dot, a 1mm keyline, the thumbnail/PDP dot. Brand key (clay) never changes; only this point color does.

- **Dimension 1 — Flavor character (row = hue)**
- **Dimension 2 — Roast level (column = value; light→dark = lighter→deeper)**

| Flavor | Light | Medium | Dark |
|---|---|---|---|
| **Chocolate** 초콜릿·너트 | `#A6794F` | `#8B5E3C` | `#5E3F2A` |
| **Citrus** 시트러스 | `#D2A84E` | `#BC8E36` | `#8A6526` |
| **Peach** 복숭아·스톤프루트 | `#DCA07E` | `#C9825F` | `#9A5E42` |
| **Berry** 베리 | `#B27488` | `#9A5E72` | `#6E3E4E` |
| **Tropical** 열대과일 | `#AEAF5E` | `#95964A` | `#6B6B32` |

**Mapping rule:** classify the product's dominant cup character → flavor row; classify roast → column. Example: *Ethiopia Aricha Amy* (jasmine/bergamot/black tea = Citrus, light roast) → `#D2A84E`.

---

## 4. Typography

Three voices, never mixed within one line.

| Voice | Family (web) | Fallback | Role |
|---|---|---|---|
| **Information / Wordmark / UI** | Helvetica Neue → Pretendard (KR) | Arial, sans-serif | product names, labels, buttons |
| **Emotion / Headline / Tasting** | Spectral → Noto Serif KR (KR) | Georgia, serif | cup notes, brand copy, display |
| **Data / Spec** | IBM Plex Mono | monospace | altitude, roast date, SKU, URL, lot |

**Google Fonts import:**
```
https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+KR:wght@300;400;500;600&display=swap
```
Pretendard: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css`

### Type scale (desktop / mobile · size px / line-height)
| Token | Desktop | Mobile | Font | Use |
|---|---|---|---|---|
| Display | 56 / 1.1 | 36 / 1.15 | Spectral 400 | hero copy |
| H1 | 36 / 1.05 | 26 / 1.1 | Helvetica 800 | product name |
| H2 | 24 / 1.2 | 20 / 1.25 | Helvetica 700 | section title |
| Body | 16 / 1.8 | 15 / 1.75 | Noto Serif KR 300–400 | paragraph |
| Caption | 13 / 1.5 | 12 / 1.5 | Helvetica 400 | secondary |
| Spec | 12 / LS +1px | 11 / LS +1px | Plex Mono 400 | spec, lot |

### Rules
- **Wordmark letter-spacing = 0** (decided: −2pt → 0pt, for calm/premium + readability). Only the lowercase tagline `everyday excellence` uses **+5px** tracking, uppercased.
- English labels/specs: UPPERCASE + tracking. Korean: 명조(serif), letter-spacing 0.
- Body line length: Korean 28–40 chars / English 60–75 chars.
- Mobile body min 15px; form inputs min 16px (prevents iOS auto-zoom).

---

## 5. Spacing, Radius, Border

- **Spacing scale (8pt base):** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`
- **Radius:** `2px` (label/sticker), `3px` (card/button), `999px` (pill/dot)
- **Border:** `1px solid #E3DAC8`
- **Card shadow (web):** `0 1px 3px rgba(0,0,0,.06)` — keep shadows barely-there.

---

## 6. Hairline Grid Pattern (optional, toggleable)

Conceptual nod to "MTSPACE = space". Tone-on-tone, near-invisible. **Off by default in dense text areas (clear zone); on for hero/empty surfaces.**

```css
background-color: #F6F1E7;
background-image:
  linear-gradient(#ECE0CB 1px, transparent 1px),
  linear-gradient(90deg, #ECE0CB 1px, transparent 1px);
background-size: 24px 24px; /* hero: 48px; thumbnail: 26–32px */
```
Rule: line color within 5% lightness of base. Never let the grid become visible noise in print/thumbnails. Clear the pattern behind any text block.

---

## 7. Layers & Hierarchy

System cascades top→down; upper layers are constants.

- **L1 Master brand** — wordmark, clay key, oat canvas, type system. Identical on every channel.
- **L2 Category / Series** — Single Origin · Blend · Decaf · Gift. Differentiated by **layout module + label header text only — never a new color.**
- **L3 Product** — flavor×roast point color + name + spec. The only variable.

**Visual hierarchy within a layout (max 4 levels):**
1. Primary — product name (Helvetica 800, largest)
2. Secondary — cup notes (Spectral italic)
3. Tertiary — spec (Plex Mono)
4. Quaternary — meta/lot (Mono small, muted)

Same information always at the same level. Read by hierarchy, not position.

---

## 8. Responsive

| Breakpoint | Range | Grid | Margin / Gutter |
|---|---|---|---|
| Mobile | `< 768px` | 4-col | 20 / 16 |
| Tablet | `768–1024px` | 8-col | 48 / 20 |
| Desktop | `≥ 1024px` | 12-col | 80 / 24 |

- Content max-width: **1200px**.
- Touch target min **44×44px**, ≥8px apart.
- PDP: desktop = 2-col hero (image | info); mobile = stacked (image → info → price/CTA) with **price + CTA pinned to the bottom of the viewport**.
- Nav: desktop horizontal menu; mobile hamburger + sticky bottom CTA bar.

---

## 9. Core Components

### Wordmark
`MTSPACE` (weight 800) + space + `COFFEE` (weight 200), letter-spacing 0, single line. Variants: default (ink on oat), reversed (oat on ink), on-key (white on clay), monogram `M` in a 2px ink square (favicon/app). Clear space = cap height of "M". Min width 120px.

### Button (primary)
`background:#3C352C; color:#F6F1E7; border-radius:3px; padding:14px; font-weight:600; letter-spacing:.5px`. Full-width on mobile. Hover: lighten ~6% / `#4A443A`.

### Product Card / Thumbnail (1:1)
Oat (optionally hairline-grid) square. Top row: `MTSPACE COFFEE` (mono, ink-soft) + point-color dot. Center: packshot. Below: product name (H1-ish, Helvetica 800) + cup notes (Spectral italic, clay-deep). Bottom row: `SINGLE ORIGIN` · net weight (mono). Series consistency = same skeleton, swap point color.

### Label Sticker (60×90mm)
Centered symmetric. Top: EST·2026 + point dot. Wordmark. 34px clay divider. Origin + product name (Helvetica 800). KR name (명조). Cup notes (Spectral italic, clay-deep). 2×2 spec block on sand panel (PROCESS / ALT / ROAST / NET, mono). Footer: LOT · ROASTED date (mono, muted).

### Product Detail Page (PDP)
- Hero: 2-col (packshot on oat-grid | info). Info = origin tag + dot, H1 name, KR sub, Spectral-italic cup notes, price (Helvetica 800) + net weight (mono), primary button.
- Spec strip: 5-col bordered grid — PROCESS / ALTITUDE / VARIETAL / ROAST / CROP (mono labels + value).
- Story: 2-col — "THE STORY" 명조 body + sand "BREW GUIDE" panel (분쇄도/비율/물온도/추출시간, mono values).

### Instagram (1:1, series of 3)
Feed rhythm in 3s: ① oat-grid product ② clay-surface serif quote (white) ③ ink-surface spec/brew card. Swap SKU to extend infinitely. Wordmark anchored bottom of each.

---

## 10. AIEO / SEO

On-page checklist:
- Title pattern: `원산지 + 농장/로트 + 프로세스` (e.g. "에티오피아 아리차 에이미 워시드 원두").
- One `<h1>` = product name. Cup notes / spec as `<h2>` + `<dl>`.
- Image `alt`: "MTSPACE 에티오피아 아리차 에이미 125g 패키지".
- FAQ block with natural-language questions (AI-citation friendly).
- Spec as `<table>`/`<dl>` (machine-parsable).
- Naming (origin/lot/process) **identical across label, thumbnail, URL, caption** so AI resolves them as one product.
- Instagram caption: keyword (origin/notes) in first line, brew tip in body, 3 fixed + 5 variable hashtags (`#엠티스페이스커피 #스페셜티원두 #에티오피아원두` + variable).

**Product JSON-LD** — include on every PDP, plus a `FAQPage` block:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "에티오피아 아리차 에이미 워시드",
  "brand": { "@type": "Brand", "name": "MTSPACE COFFEE" },
  "category": "스페셜티 커피 원두",
  "image": "https://.../aricha-amy.jpg",
  "description": "재스민·베르가못·홍차 피니시의 워시드 싱글오리진.",
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "Process", "value": "Washed" },
    { "@type": "PropertyValue", "name": "Altitude", "value": "1,950m" },
    { "@type": "PropertyValue", "name": "Roast", "value": "Light" }
  ],
  "offers": {
    "@type": "Offer",
    "price": "18000",
    "priceCurrency": "KRW",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

---

## 11. Sample Product Data (reference content)

```
Name (EN): Ethiopia Aricha Amy
Name (KR): 에티오피아 아리차 에이미
Process: Washed · Altitude: 1,950m · Varietal: Heirloom
Roast: Light (●○○) · Ferment: 100 hrs · Crop: 2026 Spring
Cup notes: Jasmine · Bergamot · Black tea (재스민·베르가못·홍차 피니시)
Flavor/Roast → point color: Citrus / Light → #D2A84E
Lot: 02 · Roasted: 2026.06.14 · Net: 125g · Price: ₩18,000
Brew: Medium-fine · 1:16 (15g/240ml) · 92–94℃ · 2:30–3:00
```
