// 비밀번호 재설정 정책 상수 (D-086).
// "use server" 파일은 async 함수만 export 할 수 있으므로 상수는 여기 둔다.
export const CODE_TTL_MIN = 10;        // 인증코드 유효시간(분)
export const MAX_ATTEMPTS = 5;         // 코드 오입력 허용 횟수
export const RESEND_COOLDOWN_SEC = 60; // 재발송 쿨다운(초)
