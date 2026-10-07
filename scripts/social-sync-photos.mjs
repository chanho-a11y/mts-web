// 소셜 전용 사진 라이브러리를 Supabase 스토리지(product-assets/social/photos/...)에 올린다. (D-139)
// 사용: node scripts/social-sync-photos.mjs "<준비된 폴더>"
//   준비된 폴더 = full/ (긴 변 1600px JPEG) 와 thumb/ (360px JPEG) 가 들어 있는 폴더.
//   원본은 "photo for social" 폴더이고, 줄인 사본은 04_marketing/MTSPACE_단일이미지_2026Q4/photos_prepared 에 만든다.
// 이미 있는 파일은 건너뛴다(덮어쓰지 않는다). 지우지 않는다. DB 는 건드리지 않는다.
// 키는 .env.local 에서 읽고 출력하지 않는다.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const dir = process.argv[2];
const start = Number(process.argv[3] || 0);
const count = Number(process.argv[4] || 100000);
if (!dir || !existsSync(join(dir, "full")) || !existsSync(join(dir, "thumb"))) {
  console.error('사용법: node scripts/social-sync-photos.mjs "<full 과 thumb 가 있는 폴더>" [시작] [개수]');
  process.exit(1);
}
const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(".env.local 에 NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "product-assets";
const NAME = /^[a-z0-9][a-z0-9-]{0,63}\.jpg$/;

const have = { full: new Set(), thumb: new Set() };
for (const kind of ["full", "thumb"]) {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list(`social/photos/${kind}`, { limit: 1000, offset });
    if (error) { console.error("목록 조회 실패:", error.message); process.exit(1); }
    for (const o of data ?? []) have[kind].add(o.name);
    if (!data || data.length < 1000) break;
  }
}

const files = readdirSync(join(dir, "full")).filter((f) => NAME.test(f)).sort().slice(start, start + count);
let up = 0, skip = 0, fail = 0;
for (const f of files) {
  for (const kind of ["full", "thumb"]) {
    if (have[kind].has(f)) { skip++; continue; }
    const p = join(dir, kind, f);
    if (!existsSync(p)) { console.error("없음:", kind, f); fail++; continue; }
    const { error } = await db.storage.from(BUCKET).upload(`social/photos/${kind}/${f}`, readFileSync(p), { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" });
    if (!error) up++;
    else if (/exists|duplicate/i.test(error.message)) skip++;
    else { console.error("실패:", kind, f, error.message); fail++; }
  }
}
console.log(`완료: 올림 ${up}, 이미 있음 ${skip}, 실패 ${fail} / 대상 사진 ${files.length}장`);
process.exit(fail ? 1 : 0);
