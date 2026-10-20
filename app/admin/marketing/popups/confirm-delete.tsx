"use client";
import { deletePopupAction } from "./actions";

// 완전 삭제는 되돌릴 수 없으므로 브라우저 확인을 한 번 더 받는다.
export default function ConfirmDelete({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deletePopupAction}
      onSubmit={(e) => {
        if (!window.confirm(`「${title}」을(를) 완전히 삭제합니다. 되돌릴 수 없습니다. 계속할까요?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="confirm" value="yes" />
      <button className="text-xs text-red-600 underline">완전 삭제</button>
    </form>
  );
}
