# SKILL — Generate an MTSPACE COFFEE label

Use this to produce a print-ready 18 × 13 cm coffee label that follows the MTSPACE design system. Inputs come from a form/section; outputs bind to a fixed 3-box layout.

## Inputs (from the studio's input section)
Required: `reportNo` (품목보고번호, dropdown) **or** the full field set. If `reportNo` matches `presets.json`, auto-fill everything below; otherwise collect:
`tableName, name_en, typeKr, typeEn, notesEn, point, desc, specs[], flavor, recipe[], material, maker, ig, qrUrl, vol`.

## Generation logic
1. **Resolve product data.** If `reportNo` ∈ presets → load preset; merge any user overrides. Else build from raw inputs.
2. **Pick point color.** From `point` key → `{point, point-text, check}` (flavour × roast matrix). Light roasts ⇒ white middle text (already enforced).
3. **Enforce invariants:**
   - Middle largest text = `tableName` and MUST equal table 제품명.
   - English name present under Korean name; shrink `--fs-en-mid` until it fits one line.
   - Left & right color bars identical length (`--bar-w`).
   - Coffee info and recipe use the same row type.
   - Left box order: brand → `IG:` → table → QR/recycle (QR & recycle equal height, centered).
4. **Render** by setting `data-field` text nodes + CSS vars; build the 품목제조보고 table, specs rows, recipe rows; generate QR from `qrUrl`.
5. **Validate:** no element overflows its 130 mm box; Korean renders in Pretendard/Noto Serif (never tofu); table single-lines except 품목보고번호 & 업소명; contrast acceptable.
6. **Export:** print to PDF at 180 × 130 mm (+3 mm bleed for press), or emit the JSON data model.

## Guardrails (design-system compliance)
- Canvas oat `#F6F1E7`, ink `#3C352C`; 90% neutral, point color only as block + accents.
- Wordmark letter-spacing 0; type voices not mixed within a line.
- Hairline grid is the only background pattern (tone-on-tone / over the block).
- Do not invent colors outside the matrix; do not add decorative graphics.

## Files
`MTSPACE-Label-Studio.html` (template+editor) · `schema.json` (fields/bindings) · `presets.json` (품목보고번호 data + point colors) · `LABEL_SPEC.md` (full spec).
