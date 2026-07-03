// 클라이언트 이미지 축소 — 업로드 전 큰 이미지를 리사이즈/압축해 서버리스 본문 한도(≈4.5MB) 초과를 방지.
// png/jpeg/webp만 처리(svg/gif는 원본 유지). 브라우저 전용(canvas).

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지 로드 실패")); };
    img.src = url;
  });
}

// maxDim: 긴 변 최대 픽셀, quality: JPEG 품질. 결과가 원본보다 크면 원본 반환.
export async function shrinkImage(file: File, maxDim = 2200, quality = 0.85): Promise<File> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return file;
  let img: HTMLImageElement;
  try { img = await loadImage(file); } catch { return file; }
  const { width, height } = img;
  const longest = Math.max(width, height);
  // 이미 충분히 작으면(치수·용량 모두) 그대로
  if (longest <= maxDim && file.size < 3.5 * 1024 * 1024) return file;
  const scale = Math.min(1, maxDim / longest);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

// 업로드 응답 안전 파싱 — 413 등 비-JSON 응답을 친절한 메시지로.
export async function readUploadJson(res: Response): Promise<{ url?: string; error?: string }> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await res.json(); } catch { /* fallthrough */ }
  }
  const text = await res.text().catch(() => "");
  if (res.status === 413 || /too large|entity too large/i.test(text)) {
    return { error: "이미지 용량이 너무 큽니다. 더 작은 이미지를 사용하거나 잠시 후 다시 시도하세요." };
  }
  return { error: text.slice(0, 120) || `업로드 실패 (${res.status})` };
}
