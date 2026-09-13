// Google DriveのフォルダURLからフォルダIDを抽出する。参照: docs/spec.md 7.2節
//
// 対応する入力例:
//   - フォルダID単体: "1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi"
//   - https://drive.google.com/drive/folders/1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi
//   - https://drive.google.com/drive/folders/1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi?usp=drive_link
//   - https://drive.google.com/drive/u/0/folders/1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi
//   - https://drive.google.com/open?id=1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi
//
// URL形式に一致しない入力は、フォルダIDそのものとみなしてそのまま返す。

const FOLDERS_PATH_PATTERN = /\/folders\/([a-zA-Z0-9_-]+)/;
const ID_QUERY_PARAM_PATTERN = /[?&]id=([a-zA-Z0-9_-]+)/;

export function extractDriveFolderId(input: string): string {
  const trimmed = input.trim();

  const pathMatch = trimmed.match(FOLDERS_PATH_PATTERN);
  if (pathMatch) {
    return pathMatch[1];
  }

  const queryMatch = trimmed.match(ID_QUERY_PARAM_PATTERN);
  if (queryMatch) {
    return queryMatch[1];
  }

  return trimmed;
}
