# MTSPACE COFFEE — Label Template Package

Templatized, editable, **import-ready** label system for a label-production studio. One label = **18 × 13 cm**, three equal boxes (6 + 6 + 6 cm).

## What's inside
| File | Purpose |
|---|---|
| **MTSPACE-Label-Studio.html** | The master template **and** working editor. Left = input section; right = live label. Open in a browser. Self-contained (loads fonts + qrcodejs from CDN). |
| **LABEL_SPEC.md** | Full technical specification — dimensions, boxes, tokens, field→element binding, QR, export, import steps. |
| **schema.json** | Machine-readable input model: every field, its type, and which label element (`data-field`) it binds to. |
| **presets.json** | 품목보고번호-keyed product data (댐굳 · 스팟라이트 · 에티오피아 아리차) + the flavour×roast point-color table + fixed business info. Seeds the dropdown. |
| **SKILL.md** | Step-by-step generation logic/guardrails for an automated agent or studio macro. |

## How it works (the required logic)
- **Input section drives the label.** Every form field is bound to a label element; typing updates the label live. (`schema.json` is the authoritative map.)
- **품목보고번호 = pre-stored dropdown.** Defined in `presets.json`; selecting a product auto-fills 제품명·원재료·소개·커피 정보·레시피·포인트 컬러. New numbers: add an entry to `presets.json`.
- **Direct element editing.** Every text node is `contenteditable` with a `data-field` id — edit content and line breaks in place; per-zone sliders change font size; the color bar length and point color are parameters.
- **QR is changeable.** Enter a URL → regenerates instantly (qrcodejs); or drop in a custom image.

## Use it
1. Open `MTSPACE-Label-Studio.html`.
2. Pick a 품목보고번호 (or edit fields / click text directly).
3. Adjust typography, point color, QR.
4. **인쇄 / PDF** for a 180 × 130 mm print, or **데이터 내보내기** for the JSON.

## Importing into another studio
Map your studio's fields to the `data-field` attributes and `--fs-*` / `--point*` / `--bar-w` CSS variables (see `LABEL_SPEC.md §9` and `schema.json`). The HTML is plain, dependency-light, and uses real `mm` units for 1:1 print.

## Notes
- Internet required for Google Fonts + Pretendard + qrcodejs; bundle them locally for offline/press use.
- Point colors are RGB hex — supply CMYK/Pantone equivalents at prepress if spot color is needed.
- Light-roast blocks (citrus/peach) use white middle text per request; deepen the block one roast-step if higher contrast is required.
