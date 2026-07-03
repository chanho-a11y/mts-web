"use client";
import { useState } from "react";

// 상세페이지 이미지 갤러리 — 대표 썸네일 + 추가 이미지. 클릭 시 라이트박스로 크게 보기.
export default function ProductGallery({ primary, images, alt }: {
  primary: string | null;
  images: { storage_path: string; alt?: string | null }[];
  alt: string;
}) {
  const all = [
    ...(primary ? [{ storage_path: primary, alt }] : []),
    ...images.filter((im) => im.storage_path !== primary),
  ];
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  if (!all.length) return <div className="imgslot" style={{ height: 264 }}><div className="tag">IMAGE · 1:1</div></div>;
  const cur = all[Math.min(active, all.length - 1)];

  return (
    <>
      <button type="button" className="imgslot" style={{ height: 264, cursor: "zoom-in", padding: 0, border: "none", width: "100%" }} onClick={() => setOpen(true)} aria-label="이미지 크게 보기">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.storage_path} alt={cur.alt ?? alt} />
      </button>
      {all.length > 1 && (
        <div className="thumbs">
          {all.slice(0, 6).map((im, i) => (
            <button type="button" className="t" key={i} onClick={() => setActive(i)} style={{ padding: 0, cursor: "pointer", boxShadow: i === active ? "0 0 0 2px var(--point)" : "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.storage_path} alt={im.alt ?? alt} />
            </button>
          ))}
        </div>
      )}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.storage_path} alt={cur.alt ?? alt} style={{ maxWidth: "92vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }} />
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-label="닫기"
            style={{ position: "absolute", top: 18, right: 22, background: "rgba(255,255,255,.15)", color: "#fff", border: "none", borderRadius: 999, width: 38, height: 38, fontSize: 20, cursor: "pointer" }}>×</button>
          {all.length > 1 && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: 20, display: "flex", gap: 8 }}>
              {all.map((im, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`이미지 ${i + 1}`}
                  style={{ width: 10, height: 10, borderRadius: 999, border: "none", background: i === active ? "#fff" : "rgba(255,255,255,.4)", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
