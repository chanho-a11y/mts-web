// 롯데택배 송장 연동 (D-142)
// 1) 파일접수용 업로드 양식(16열) 정의
// 2) 롯데 집하 상세 파일(PIDDLV013) 파싱
// 3) 송장 행과 자사몰 주문 매칭 점수 계산
//
// 롯데 파일접수는 '상품명' 이하 열만 읽는다(대표 확인, 2026-10-12). 그래서 롯데가 돌려주는 상세 파일에는
// 고객주문번호가 비어 있고 전화번호 열도 없다. 매칭은 수하인명, 주문자, 주소(시도, 시군구, 읍면동), 상품명으로 한다.
// 서버와 브라우저 양쪽에서 쓰는 순수 모듈이다(외부 의존 없음).

/** 파일접수 업로드 양식. 기존 수기 양식과 열 구성과 순서가 같아야 한다(D열은 빈 머리글). */
export const LOTTE_UPLOAD_HEADERS = [
  "일자", "쇼핑몰", "주문번호(사방넷)", "", "결제일시", "옵션", "상품명", "주문금액", "수량",
  "주문자명", "주문자 연락처", "수령자", "수령자 연락처", "우편번호", "주소", "배송메세지",
] as const;
export const LOTTE_UPLOAD_SHEET = "대한통운";

/** 롯데택배 배송조회 링크 (2026-10-12 실제 송장으로 조회 확인) */
export function lotteTrackingUrl(trackingNo: string): string {
  return `https://www.lotteglogis.com/mobile/reservation/tracking/linkView?InvNo=${trackingNo.replace(/\D/g, "")}`;
}

/** 운송장번호 표기 정규화: 숫자 12자리면 0000-0000-0000 형태 */
export function formatTrackingNo(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length === 12 ? `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}` : String(raw ?? "").trim();
}

// ───────────────────────── 상세 파일 파싱 ─────────────────────────

export interface LotteWaybill {
  tracking_no: string;   // 0000-0000-0000
  receiver: string;      // 수하인명
  orderer: string;       // 주문자
  address: string;       // 수하인주소 (지번 동까지)
  product: string;       // 상품명 (접수 파일 첫 품목)
  qty: number;           // 수량합계(박스)
  picked_at: string;     // 집하일자
  customer_order_no: string; // 고객주문번호 (현재 롯데 설정상 비어 옴)
  delivery_status: string;   // 배달여부
}

const REQUIRED = ["운송장번호", "수하인명"] as const;

/** sheet_to_json(header:1) 결과(2차원 배열)를 받아 송장 목록으로 변환. 형식이 다르면 error. */
export function parseLotteDetail(rows: unknown[][]): { waybills: LotteWaybill[]; error?: string } {
  const hIdx = rows.findIndex((r) => Array.isArray(r) && REQUIRED.every((k) => r.some((c) => String(c ?? "").trim() === k)));
  if (hIdx < 0) return { waybills: [], error: "롯데 집하 상세 파일이 아닙니다. '운송장번호'와 '수하인명' 열이 있는 파일을 올려 주세요." };
  const head = rows[hIdx].map((c) => String(c ?? "").trim());
  const col = (name: string) => head.indexOf(name);
  const get = (r: unknown[], name: string) => {
    const i = col(name);
    return i < 0 ? "" : String(r[i] ?? "").trim();
  };
  const seen = new Set<string>();
  const waybills: LotteWaybill[] = [];
  for (const r of rows.slice(hIdx + 1)) {
    if (!Array.isArray(r)) continue;
    const tn = formatTrackingNo(get(r, "운송장번호"));
    if (!/^\d{4}-\d{4}-\d{4}$/.test(tn) || seen.has(tn)) continue;
    seen.add(tn);
    waybills.push({
      tracking_no: tn,
      receiver: get(r, "수하인명"),
      orderer: get(r, "주문자"),
      address: get(r, "수하인주소"),
      product: get(r, "상품명"),
      qty: Number(get(r, "수량합계")) || 1,
      picked_at: get(r, "집하일자"),
      customer_order_no: get(r, "고객주문번호"),
      delivery_status: get(r, "배달여부"),
    });
  }
  if (waybills.length === 0) return { waybills, error: "운송장번호가 있는 행이 없습니다." };
  return { waybills };
}

// ───────────────────────── 매칭 ─────────────────────────

export interface MatchOrder {
  id: string;
  order_no: string;
  recipient: string;
  profile_name: string;
  company_name: string;
  addr1: string;
  addr2: string;
  items: string[];
}

const SIDO: Record<string, string> = {
  서울특별시: "서울", 서울시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천", 광주광역시: "광주",
  대전광역시: "대전", 울산광역시: "울산", 세종특별자치시: "세종", 경기도: "경기", 강원도: "강원", 강원특별자치도: "강원",
  충청북도: "충북", 충청남도: "충남", 전라북도: "전북", 전북특별자치도: "전북", 전라남도: "전남",
  경상북도: "경북", 경상남도: "경남", 제주특별자치도: "제주", 제주도: "제주",
};

/** 이름 비교용 정규화: 법인 표기, 공백, 숫자, 기호 제거, 소문자 */
export function normName(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/주식회사|유한회사|\(주\)|㈜|\(유\)/g, "")
    .replace(/[0-9]/g, "")
    .replace(/[^0-9a-z가-힣]/g, "");
}

/** "김인성 (잼잼)" → [김인성잼잼, 김인성, 잼잼] 처럼 괄호 안팎을 각각 토큰으로 */
export function nameTokens(s: string): string[] {
  const raw = String(s ?? "");
  const parts = [raw, raw.replace(/\(.*?\)/g, " "), ...Array.from(raw.matchAll(/\((.*?)\)/g)).map((m) => m[1]), ...raw.split(/\s+/)];
  return Array.from(new Set(parts.map(normName).filter((t) => t.length >= 2)));
}

function nameScore(w: LotteWaybill, o: MatchOrder): number {
  const a = [...nameTokens(w.receiver), ...nameTokens(w.orderer)];
  const b = [...nameTokens(o.recipient), ...nameTokens(o.profile_name), ...nameTokens(o.company_name)];
  if (a.some((x) => b.includes(x))) return 60;
  if (a.some((x) => b.some((y) => x.includes(y) || y.includes(x)))) return 40;
  return 0;
}

interface Region { sido: string; units: string[]; town: string[] }
/** 주소에서 시도, 시군구 단위, 읍면동리 이름을 뽑는다 */
export function region(addr: string): Region {
  const words = String(addr ?? "").replace(/[(),]/g, " ").split(/\s+/).filter(Boolean);
  const sido = words.length ? (SIDO[words[0]] ?? words[0]) : "";
  const units: string[] = [];
  const town: string[] = [];
  for (const w of words.slice(1)) {
    if (/^[가-힣]+(시|군|구)$/.test(w)) units.push(w);
    else if (/^[가-힣]+[0-9]*(가)?$/.test(w) && /(동|읍|면|리|가)$/.test(w)) town.push(w.replace(/[0-9]+가$/, "").replace(/[0-9]+(동)$/, "$1"));
  }
  return { sido, units, town };
}

function regionScore(w: LotteWaybill, o: MatchOrder): number {
  const lw = region(w.address);
  const lo = region(`${o.addr1} ${o.addr2}`);
  if (!lw.sido || lw.sido !== lo.sido) return 0;
  if (lw.units.length === 0 || !lw.units.every((u) => lo.units.includes(u))) return 0;
  let s = 25;
  // 도로명 주소라도 "(운중동)" 참고항목이나 상세주소에 읍면동이 있으면 가산
  const hay = `${o.addr1} ${o.addr2}`;
  if (lw.town.some((t) => t.length >= 2 && hay.includes(t))) s += 10;
  return s;
}

function productScore(w: LotteWaybill, o: MatchOrder): number {
  const key = normName(String(w.product ?? "").split(/\s+/)[0] ?? "");
  if (key.length < 2) return 0;
  return o.items.some((t) => normName(t).includes(key)) ? 15 : 0;
}

export interface Candidate { order_id: string; score: number; reasons: string[] }

export function scorePair(w: LotteWaybill, o: MatchOrder): Candidate {
  const reasons: string[] = [];
  let score = 0;
  if (w.customer_order_no && w.customer_order_no === o.order_no) {
    return { order_id: o.id, score: 100, reasons: ["주문번호 일치"] };
  }
  const n = nameScore(w, o); if (n) { score += n; reasons.push(n === 60 ? "이름 일치" : "이름 부분 일치"); }
  const r = regionScore(w, o); if (r) { score += r; reasons.push(r > 25 ? "주소(동) 일치" : "주소(시군구) 일치"); }
  const p = productScore(w, o); if (p) { score += p; reasons.push("상품 일치"); }
  return { order_id: o.id, score: Math.min(score, 99), reasons };
}

export const MIN_SCORE = 40;     // 이 미만은 후보로 보지 않는다
export const SURE_SCORE = 70;    // 이 이상이면 '확실'

export interface WaybillMatch {
  waybill: LotteWaybill;
  candidates: Candidate[];       // 점수순, MIN_SCORE 이상
  selected: string[];            // 기본 선택된 주문 id
  confidence: "sure" | "check" | "none";
}

/**
 * 상호 최선(mutual best) 규칙으로 기본 연결을 정한다.
 * 송장 w 와 주문 o 가 서로에게 최고점(동점 포함)이고 MIN_SCORE 이상이면 연결.
 * 그래서 한 주문에 송장 여러 개(박스 분할), 여러 주문에 송장 하나(합포장)가 모두 자연스럽게 묶인다.
 */
export function matchWaybills(waybills: LotteWaybill[], orders: MatchOrder[]): WaybillMatch[] {
  const S = waybills.map((w) => orders.map((o) => scorePair(w, o)));
  const orderBest = orders.map((_, j) => Math.max(0, ...waybills.map((_, i) => S[i][j].score)));
  return waybills.map((w, i) => {
    const cands = S[i].filter((c) => c.score >= MIN_SCORE).sort((a, b) => b.score - a.score);
    const top = cands[0]?.score ?? 0;
    const selected = cands
      .filter((c) => c.score === top)
      .filter((c) => orderBest[orders.findIndex((o) => o.id === c.order_id)] === c.score)
      .map((c) => c.order_id);
    const confidence: WaybillMatch["confidence"] =
      selected.length === 0 ? "none" : top >= SURE_SCORE && selected.length === 1 ? "sure" : "check";
    return { waybill: w, candidates: cands, selected, confidence };
  });
}
