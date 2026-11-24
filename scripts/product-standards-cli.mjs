#!/usr/bin/env node
// 제품 등록 기준 CLI (D-172). lib/product-standards.ts 를 그대로 불러 Claude 등록 스킬과 관리자 폼이 같은 계산을 쓴다.
// 사용: node scripts/product-standards-cli.mjs '{"notes":["라벤더","오렌지"],"roast":"라이트","process":"내추럴","greenPricePerKg":29000,"weightG":125,"taken":["#C6864A"]}'
import ts from "typescript";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "ps-"));
const tr = (rel) => ts.transpileModule(fs.readFileSync(path.join(root, rel), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 },
}).outputText;
fs.writeFileSync(path.join(out, "point-color.mjs"), tr("lib/point-color.ts"));
fs.writeFileSync(path.join(out, "report-no.mjs"), tr("lib/report-no.ts"));
fs.writeFileSync(path.join(out, "ps.mjs"), tr("lib/product-standards.ts")
  .replace('"@/lib/point-color"', '"./point-color.mjs"').replace('"@/lib/report-no"', '"./report-no.mjs"'));
const m = await import(pathToFileURL(path.join(out, "ps.mjs")).href);

const a = JSON.parse(process.argv[2] ?? "{}");
const fam = m.recipeFamily(a.process);
console.log(JSON.stringify({
  recipeFamily: fam,
  recipe: m.standardRecipeFor(a.process),
  recipeSource: fam ? m.STANDARD_RECIPES[fam].source : null,
  cost: a.greenPricePerKg ? m.estimateCost(Number(a.greenPricePerKg), Number(a.weightG ?? 125)) : null,
  keyColors: m.suggestKeyColors(a.notes ?? [], a.roast ?? "라이트", a.taken ?? [], 3),
}, null, 2));
