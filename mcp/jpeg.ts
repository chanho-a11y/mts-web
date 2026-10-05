/**
 * PNG → JPEG 변환 (D-135).
 *
 * 왜 필요한가: Instagram Graph API 는 이미지 발행에 JPEG 만 확실히 받는다.
 * next/og(satori) 는 PNG 만 낸다. 둘 사이를 잇는 순수 JS 변환기다 —
 * sharp 같은 네이티브 의존성을 넣지 않는다(Vercel 번들·패키지 추출 모두 단순하게).
 *
 * 1080×1350 기준 수백 ms. 발행 빈도(하루 몇 장)를 생각하면 충분하다.
 */
import { PNG } from "pngjs";
import { encode as encodeJpeg } from "jpeg-js";

export function pngToJpeg(png: Buffer, quality = 90): Buffer {
  const decoded = PNG.sync.read(png);
  // pngjs 는 RGBA 를 준다. jpeg-js 도 RGBA 입력을 받는다(알파는 버린다).
  // 투명 영역이 검게 찍히지 않도록 흰색 위에 합성한다 — 커버 아트는 불투명이지만 base64 업로드는 모른다.
  const { width, height, data } = decoded;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3] / 255;
    out[i * 4] = Math.round(data[i * 4] * a + 255 * (1 - a));
    out[i * 4 + 1] = Math.round(data[i * 4 + 1] * a + 255 * (1 - a));
    out[i * 4 + 2] = Math.round(data[i * 4 + 2] * a + 255 * (1 - a));
    out[i * 4 + 3] = 255;
  }
  return encodeJpeg({ data: out, width, height }, quality).data;
}
