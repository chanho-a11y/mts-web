/** image.ts 단위 점검 — 스모크 하네스가 태우지 못하는 거부 경로와 형식 파싱을 본다. */
import { deflateSync } from "node:zlib";
import { asciiSlug, buildAssetPath, decodeBase64, inspectImage, isAlreadyExists } from "./image";

let pass = 0;
let fail = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${label}`);
    pass++;
  } catch (e) {
    console.log(`✗ ${label} -> ${(e as Error).message}`);
    fail++;
  }
}
function eq(a: unknown, b: unknown, what = "") {
  if (a !== b) throw new Error(`${what} 기대 ${String(b)} / 실제 ${String(a)}`);
}
function throws(fn: () => unknown, re: RegExp) {
  let msg = "";
  try {
    fn();
  } catch (e) {
    msg = (e as Error).message;
  }
  if (!msg) throw new Error("예외가 나지 않았다");
  if (!re.test(msg)) throw new Error(`메시지 불일치: ${msg}`);
}

// ── 표본 만들기 ──────────────────────────────────────────────────────
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Buffer) => {
  let c = 0xffffffff;
  for (const byte of b) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function png(w: number, h: number): Buffer {
  const idat = deflateSync(Buffer.alloc((w * 3 + 1) * h), { level: 9 });
  const chunk = (t: string, body: Buffer) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(body.length, 0);
    const typed = Buffer.concat([Buffer.from(t, "ascii"), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed), 0);
    return Buffer.concat([head, typed, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
/** APP0 하나를 건너뛰고 SOF0 을 만나는 최소 JPEG */
function jpeg(w: number, h: number): Buffer {
  const app0 = Buffer.concat([
    Buffer.from([0xff, 0xe0, 0x00, 0x10]),
    Buffer.from("JFIF\0", "ascii"),
    Buffer.alloc(9),
  ]);
  const sof = Buffer.alloc(19);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(h, 5);
  sof.writeUInt16BE(w, 7);
  sof[9] = 3;
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]);
}
function webpVp8x(w: number, h: number): Buffer {
  const b = Buffer.alloc(30);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(22, 4);
  b.write("WEBP", 8, "ascii");
  b.write("VP8X", 12, "ascii");
  b.writeUInt32LE(10, 16);
  const w1 = w - 1;
  const h1 = h - 1;
  b[24] = w1 & 0xff; b[25] = (w1 >> 8) & 0xff; b[26] = (w1 >> 16) & 0xff;
  b[27] = h1 & 0xff; b[28] = (h1 >> 8) & 0xff; b[29] = (h1 >> 16) & 0xff;
  return b;
}

// ── 점검 ─────────────────────────────────────────────────────────────
check("PNG 크기 파싱", () => {
  const i = inspectImage(png(1200, 800));
  eq(i.mime, "image/png", "mime");
  eq(i.width, 1200, "width");
  eq(i.height, 800, "height");
  eq(i.ext, "png", "ext");
  eq(i.sha256.length, 64, "sha 길이");
});

check("JPEG 크기 파싱(APP0 건너뛰기)", () => {
  const i = inspectImage(jpeg(1600, 900));
  eq(i.mime, "image/jpeg", "mime");
  eq(i.width, 1600, "width");
  eq(i.height, 900, "height");
  eq(i.ext, "jpg", "ext");
});

check("WebP(VP8X) 크기 파싱", () => {
  const i = inspectImage(webpVp8x(1280, 720));
  eq(i.mime, "image/webp", "mime");
  eq(i.width, 1280, "width");
  eq(i.height, 720, "height");
});

check("확장자만 이미지인 텍스트는 거부", () => {
  throws(() => inspectImage(Buffer.from("<svg xmlns='...'>hello</svg>", "utf8")), /PNG · JPEG · WebP/);
});

check("GIF 는 거부(매직바이트)", () => {
  throws(() => inspectImage(Buffer.from("GIF89a\0\0\0\0", "binary")), /PNG · JPEG · WebP/);
});

check("데이터 URI 접두사 허용", () => {
  const b64 = png(1200, 800).toString("base64");
  const buf = decodeBase64(`data:image/png;base64,${b64}`);
  eq(inspectImage(buf).width, 1200, "width");
});

check("손상된 base64 거부", () => {
  throws(() => decodeBase64("!!!!not base64!!!!"), /base64/);
  throws(() => decodeBase64("QUJDR"), /base64/); // 길이가 4의 배수가 아님 = 잘린 전송
  throws(() => decodeBase64(""), /비어/);
  // 유효한 base64 지만 이미지가 아닌 경우는 디코드가 아니라 형식 판별에서 걸린다
  throws(() => inspectImage(decodeBase64("QUJD")), /PNG · JPEG · WebP/);
});

check("공백 섞인 base64 허용", () => {
  const b64 = png(1200, 800).toString("base64");
  const withWs = b64.replace(/(.{60})/g, "$1\n");
  eq(inspectImage(decodeBase64(withWs)).height, 800, "height");
});

check("한글 슬러그는 ASCII 로만 남는다", () => {
  eq(asciiSlug("어떤-커피를-원하시나요"), "", "한글 전량 제거");
  eq(asciiSlug("blog-ethiopia-kochere-danicho"), "blog-ethiopia-kochere-danicho", "ascii 유지");
  eq(asciiSlug("Ethiopia 코체레 Washed"), "ethiopia-washed", "혼합");
});

check("경로 조작 시도가 흡수된다", () => {
  eq(asciiSlug("../../etc/passwd"), "etc-passwd", "상위경로 제거");
  const p = buildAssetPath("mcp/blog/cover", asciiSlug("../../etc"), "a".repeat(64), "png");
  if (p.includes("..")) throw new Error(`'..' 가 남았다: ${p}`);
});

check("생성 경로가 DB 정규식을 만족한다", () => {
  const dbRe = /^mcp\/[A-Za-z0-9._/-]+$/; // mcp_asset_precheck 와 같은 식
  for (const name of ["blog-ethiopia-kochere-danicho", "cover", "a-b-c"]) {
    const p = buildAssetPath("mcp/blog/cover", name, "0123456789abcdef".repeat(4), "jpg");
    if (!dbRe.test(p)) throw new Error(`정규식 불일치: ${p}`);
    if (p.includes("..")) throw new Error(`'..' 포함: ${p}`);
  }
});

check("경로에 해시 앞 12자가 들어간다(멱등성 근거)", () => {
  const sha = "abcdef0123456789".repeat(4);
  const p = buildAssetPath("mcp/blog/cover", "cover", sha, "jpg");
  if (!p.endsWith(`-${sha.slice(0, 12)}.jpg`)) throw new Error(p);
  const q = buildAssetPath("mcp/blog/cover", "cover", sha, "jpg");
  eq(p, q, "같은 입력 → 같은 경로");
});

check("스토리지 중복 오류 판별", () => {
  eq(isAlreadyExists({ message: "x", statusCode: "409" }), true, "409");
  eq(isAlreadyExists({ message: "The resource already exists" }), true, "메시지");
  eq(isAlreadyExists({ message: "Payload too large", statusCode: "413" }), false, "413");
  eq(isAlreadyExists(null), false, "null");
});

check("PNG 본문 손상은 CRC 로 잡는다", () => {
  const good = png(1200, 800);
  const bad = Buffer.from(good);
  bad[bad.length - 30] ^= 0xff; // IDAT 안쪽 한 바이트 뒤집기
  throws(() => inspectImage(bad), /손상|CRC/);
});

check("PNG 잘림은 IEND 부재로 잡는다", () => {
  const good = png(1200, 800);
  throws(() => inspectImage(good.subarray(0, good.length - 40)), /잘렸|벗어|IEND/);
});

check("JPEG 잘림은 EOI 부재로 잡는다", () => {
  const good = jpeg(1600, 900);
  throws(() => inspectImage(good.subarray(0, good.length - 2)), /EOI|잘렸/);
});

check("WebP 길이 불일치는 RIFF 헤더로 잡는다", () => {
  const good = webpVp8x(1280, 720);
  const bad = Buffer.concat([good, Buffer.alloc(4)]);
  throws(() => inspectImage(bad), /불일치|잘렸/);
});

check("실측 사고 재현 — 중간에 블록이 중복 삽입된 PNG", () => {
  // 2026-08-06: 모델이 emit 한 base64 가 반복 구간에서 늘어나(3,161B → 4,061B)
  // IHDR 검사만 통과하고 열리지 않는 PNG 가 저장됐다. 같은 형태를 재현한다.
  const good = png(1200, 800);
  const cut = Math.floor(good.length / 2);
  const bad = Buffer.concat([
    good.subarray(0, cut),
    good.subarray(cut - 300, cut), // 앞 구간을 한 번 더 끼워 넣는다
    good.subarray(cut),
  ]);
  throws(() => inspectImage(bad), /손상|CRC|잘렸|벗어|IEND/);
});

console.log(`\nPASS ${pass} / FAIL ${fail}`);
if (fail > 0) process.exit(1);
