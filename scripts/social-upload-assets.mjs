// 카드뉴스 발행용 JPEG 를 Supabase 스토리지(product-assets/mcp/social/...)에 올린다. (D-138)
// 사용: node scripts/social-upload-assets.mjs "<JPG 폴더>"
// 폴더의 manifest.json 이 정한 경로 그대로 올리고, 이미 있는 파일은 건너뛴다(덮어쓰지 않는다).
// DB 는 건드리지 않는다. 키는 .env.local 에서 읽고 출력하지 않는다.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "manifest.json"))) {
  console.error("사용법: node scripts/social-upload-assets.mjs <manifest.json 이 있는 폴더>");
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
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
let up = 0, skip = 0, fail = 0;
for (const post of manifest) {
  for (const m of post.media) {
    const body = readFileSync(join(dir, m.file));
    if (body.length !== m.bytes) { console.error("크기 불일치:", m.file); fail++; continue; }
    const { error } = await db.storage.from(BUCKET).upload(m.path, body, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" });
    if (!error) { up++; continue; }
    if (/exists|duplicate/i.test(error.message)) { skip++; continue; }
    console.error("실패:", m.file, error.message); fail++;
  }
  process.stdout.write(`\r${post.slug.padEnd(48)} 올림 ${up} 건너뜀 ${skip} 실패 ${fail}`);
}
console.log(`\n완료: 올림 ${up}, 이미 있음 ${skip}, 실패 ${fail} / 전체 ${manifest.reduce((a, p) => a + p.media.length, 0)}`);
process.exit(fail ? 1 : 0);
