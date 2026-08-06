/**
 * 이미지 바이트 처리 — 디코드 · 형식 판별 · 크기 측정 · 경로 생성.
 *
 * 원칙 두 가지
 *   ① 클라이언트가 선언한 형식을 믿지 않는다. MIME 인자를 받지 않고
 *      파일 내용(매직바이트)으로 판별한다. 공개 버킷이 nosniff 헤더를
 *      보내지 않으므로(2026-08-06 실측), 서버가 Content-Type 을 정해야 한다.
 *   ② 경로는 내용이 결정한다. 콘텐츠 해시가 파일명에 들어가므로
 *      같은 바이트는 항상 같은 경로가 되고, 재시도가 안전해진다.
 *
 * 외부 의존성을 쓰지 않는다(sharp·image-size 등). 순수 버퍼 연산이다.
 */
import { createHash } from "node:crypto";

export type ImageMime = "image/png" | "image/jpeg" | "image/webp";
export type ImageExt = "png" | "jpg" | "webp";

export interface ImageInfo {
  bytes: Buffer;
  size: number;
  mime: ImageMime;
  ext: ImageExt;
  width: number;
  height: number;
  sha256: string;
}

const EXT_OF: Record<ImageMime, ImageExt> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** 사용자에게 복구 경로를 알려주는 오류. 자동화가 스스로 회복할 수 있어야 한다. */
export class ImageError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(hint ? `${message} ${hint}` : message);
    this.name = "ImageError";
  }
}

/**
 * base64 → 바이트.
 * Buffer.from(x, "base64") 는 잘못된 문자를 조용히 무시하고 손상된 결과를 낸다.
 * 조용한 오답이 최악이므로 먼저 문자 집합과 길이를 검사한다.
 */
export function decodeBase64(input: string): Buffer {
  let s = String(input ?? "").trim();

  // 데이터 URI 접두사는 흔한 실수라 받아준다.
  const m = /^data:[a-z]+\/[a-z0-9.+-]+;base64,/i.exec(s);
  if (m) s = s.slice(m[0].length);

  s = s.replace(/\s+/g, "");
  if (!s) throw new ImageError("이미지 데이터가 비어 있습니다.");

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s) || s.length % 4 !== 0) {
    throw new ImageError(
      "base64 문자열이 손상됐습니다.",
      "잘리지 않은 온전한 base64 를 보내세요. 데이터 URI 접두사(data:image/png;base64,)는 있어도 됩니다.",
    );
  }

  const buf = Buffer.from(s, "base64");
  if (buf.length === 0) throw new ImageError("디코드 결과가 비어 있습니다.");
  return buf;
}

/** 매직바이트로 실제 형식을 판별한다. 확장자·선언 MIME 은 보지 않는다. */
function sniff(b: Buffer): ImageMime {
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  throw new ImageError(
    "PNG · JPEG · WebP 만 등록할 수 있습니다(선언한 형식이 아니라 파일 내용으로 판별합니다).",
    "SVG · GIF · PDF 는 받지 않습니다.",
  );
}

/**
 * CRC32 (IEEE). PNG 청크 검증용.
 * node:zlib 의 crc32 는 Node 20.15+ 에서만 있어 런타임 버전에 걸지 않고 직접 계산한다.
 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer, start: number, end: number): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * 페이로드 무결성 검사.
 *
 * 헤더만 보면 "앞부분은 멀쩡한데 본문이 깨진" 파일이 통과한다. 실제로 그런 사고가 있었다
 * (2026-08-06: 손상된 base64 가 IHDR 검사를 통과해 열리지 않는 PNG 가 저장됐다).
 * 삭제가 부재로 차단돼 있어 한 번 들어가면 못 지우므로, 저장 전에 반드시 막아야 한다.
 */
function verifyIntegrity(b: Buffer, mime: ImageMime): void {
  if (mime === "image/png") {
    // 모든 청크의 CRC 를 검증한다. 한 바이트만 틀어져도 잡힌다.
    let p = 8;
    let sawIEND = false;
    while (p + 8 <= b.length) {
      const len = b.readUInt32BE(p);
      const end = p + 8 + len; // length(4) + type(4) + data(len) ... 뒤에 crc(4)
      if (len > b.length || end + 4 > b.length) {
        throw new ImageError("PNG 청크 길이가 파일 크기를 벗어납니다. 전송 중 잘린 것 같습니다.");
      }
      const type = b.toString("ascii", p + 4, p + 8);
      const want = b.readUInt32BE(end);
      if (crc32(b, p + 4, end) !== want) {
        throw new ImageError(
          `PNG 데이터가 손상됐습니다(${type} 청크 CRC 불일치).`,
          "base64 가 전송 중 변형됐을 수 있습니다. 다시 인코딩해 보내거나 /admin/blog 에서 직접 올리세요.",
        );
      }
      if (type === "IEND") { sawIEND = true; break; }
      p = end + 4;
    }
    if (!sawIEND) throw new ImageError("PNG 가 IEND 로 끝나지 않습니다. 파일이 잘렸습니다.");
    return;
  }

  if (mime === "image/jpeg") {
    // JPEG 에는 체크섬이 없다. 최소한 EOI(FFD9) 로 끝나는지는 본다 — 잘림은 잡힌다.
    if (b.length < 4 || b[b.length - 2] !== 0xff || b[b.length - 1] !== 0xd9) {
      throw new ImageError(
        "JPEG 가 EOI 마커로 끝나지 않습니다. 파일이 잘렸습니다.",
        "다시 인코딩해 보내거나 /admin/blog 에서 직접 올리세요.",
      );
    }
    return;
  }

  // WebP: RIFF 헤더의 길이 필드가 실제 크기와 맞는지 본다.
  const declared = b.readUInt32LE(4);
  if (declared + 8 !== b.length) {
    throw new ImageError(
      `WebP 크기 불일치(선언 ${declared + 8}바이트 / 실제 ${b.length}바이트). 파일이 잘렸습니다.`,
    );
  }
}

/** PNG: 시그니처 8바이트 뒤 IHDR 청크에 가로·세로가 있다. */
function pngSize(b: Buffer): { width: number; height: number } {
  if (b.length < 24 || b.toString("ascii", 12, 16) !== "IHDR") {
    throw new ImageError("PNG 헤더를 읽지 못했습니다. 파일이 손상됐을 수 있습니다.");
  }
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** JPEG: SOF 마커를 찾을 때까지 세그먼트를 건너뛴다. */
function jpegSize(b: Buffer): { width: number; height: number } {
  let p = 2;
  while (p + 9 < b.length) {
    if (b[p] !== 0xff) {
      p++;
      continue;
    }
    let marker = b[p + 1];
    // 0xff 채움 바이트가 연속될 수 있다.
    while (marker === 0xff && p + 2 < b.length) {
      p++;
      marker = b[p + 1];
    }

    // 길이 필드가 없는 마커들
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      p += 2;
      continue;
    }

    const len = b.readUInt16BE(p + 2);
    if (len < 2) throw new ImageError("JPEG 세그먼트가 손상됐습니다.");

    // SOF0–SOF3 · SOF5–SOF7 · SOF9–SOF11 · SOF13–SOF15 (DHT·DAC 은 제외)
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof) {
      if (p + 9 > b.length) break;
      return { height: b.readUInt16BE(p + 5), width: b.readUInt16BE(p + 7) };
    }

    if (marker === 0xda) break; // SOS — 여기부터는 엔트로피 데이터다
    p += 2 + len;
  }
  throw new ImageError("JPEG 크기 정보를 찾지 못했습니다. 파일이 손상됐을 수 있습니다.");
}

/** WebP: VP8(손실) · VP8L(무손실) · VP8X(확장) 세 갈래를 모두 본다. */
function webpSize(b: Buffer): { width: number; height: number } {
  const fourcc = b.toString("ascii", 12, 16);

  if (fourcc === "VP8 ") {
    if (b.length < 30 || b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) {
      throw new ImageError("WebP(손실) 헤더를 읽지 못했습니다.");
    }
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }

  if (fourcc === "VP8L") {
    if (b.length < 25 || b[20] !== 0x2f) {
      throw new ImageError("WebP(무손실) 헤더를 읽지 못했습니다.");
    }
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }

  if (fourcc === "VP8X") {
    if (b.length < 30) throw new ImageError("WebP(확장) 헤더를 읽지 못했습니다.");
    const w = b[24] | (b[25] << 8) | (b[26] << 16);
    const h = b[27] | (b[28] << 8) | (b[29] << 16);
    return { width: w + 1, height: h + 1 };
  }

  throw new ImageError(`WebP 형식을 해석하지 못했습니다(청크 ${fourcc}).`);
}

/** 바이트를 받아 형식·크기·해시를 한 번에 낸다. */
export function inspectImage(bytes: Buffer): ImageInfo {
  const mime = sniff(bytes);
  verifyIntegrity(bytes, mime);
  const { width, height } =
    mime === "image/png" ? pngSize(bytes) : mime === "image/jpeg" ? jpegSize(bytes) : webpSize(bytes);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new ImageError("이미지 크기를 읽지 못했습니다.");
  }

  return {
    bytes,
    size: bytes.length,
    mime,
    ext: EXT_OF[mime],
    width,
    height,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

/**
 * 스토리지 키에 쓸 ASCII 전용 슬러그.
 *
 * markdown.ts 의 slugify 를 쓰지 않는다 — 그쪽은 [^a-z0-9가-힣\s-] 필터라
 * 한글을 보존한다. 한글이 스토리지 키에 들어가면 그 URL 이 og:image 로 나갈 때
 * 스크레이퍼마다 퍼센트 인코딩 처리가 달라 공유 썸네일이 채널별로 깨진다.
 *
 * 결과가 비면 빈 문자열을 돌려준다. 대체값은 호출부가 정한다.
 */
export function asciiSlug(input: string | null | undefined, max = 40): string {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

/**
 * 자산 경로. 반드시 DB 쪽 정규식 ^mcp/[A-Za-z0-9._/-]+$ 를 만족해야 한다.
 * 월 단위로 나누어 대장·정리 리포트가 다루기 쉽게 한다.
 */
export function buildAssetPath(
  prefix: string,
  name: string,
  sha256: string,
  ext: ImageExt,
  at: Date = new Date(),
): string {
  const yyyymm = `${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
  const cleanPrefix = String(prefix ?? "").replace(/^\/+|\/+$/g, "");
  const safeName = asciiSlug(name) || "asset";
  return `${cleanPrefix}/${yyyymm}/${safeName}-${sha256.slice(0, 12)}.${ext}`;
}

/**
 * 스토리지가 "이미 있다"고 답한 것인지 판별한다.
 * 우리는 경로가 내용의 해시라서 이 경우가 오류가 아니라 중복이다.
 * supabase-js 버전에 따라 오류 모양이 달라지므로 느슨하게 본다.
 */
export function isAlreadyExists(err: { message?: string; statusCode?: string | number } | null): boolean {
  if (!err) return false;
  const code = String(err.statusCode ?? "");
  if (code === "409") return true;
  return /already exists|duplicate|resource already/i.test(String(err.message ?? ""));
}
