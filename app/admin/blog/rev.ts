/**
 * MCP 개선안 초안 슬러그 접미사.
 *
 * MCP(commerce_draft_post)는 발행된 글을 수정하지 못한다. 그래서 발행글 개선안은
 * `<원본slug>--rev` 형태의 별도 초안으로 들어오고, 관리자가 '원본에 반영' 버튼을
 * 눌러야만 원본에 옮겨진다. mcp/tools/content.ts 의 REV_SUFFIX 와 같은 값이어야 한다.
 *
 * ※ actions.ts 는 "use server" 파일이라 async 함수 외의 export 를 둘 수 없어
 *    상수를 이 파일로 분리한다.
 */
export const REV_SUFFIX = "--rev";
