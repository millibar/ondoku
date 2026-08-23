import type { Content } from "../types";

// TSVパーサー。参照: docs/spec.md 6章

export interface TsvParseError {
  line: number; // 1-indexed（ヘッダー行を含む元のTSV上の行番号）
  message: string;
}

export interface TsvParseResult {
  contents: Content[];
  errors: TsvParseError[];
}

const EXPECTED_COLUMN_COUNT = 5;

export function parseTsv(tsvText: string): TsvParseResult {
  const lines = tsvText.split(/\r\n|\r|\n/);
  const contents: Content[] = [];
  const errors: TsvParseError[] = [];
  const seenIds = new Set<number>();

  // 1行目はヘッダー行としてスキップする
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    if (line.trim() === "") {
      continue;
    }

    const columns = line.split("\t");
    if (columns.length !== EXPECTED_COLUMN_COUNT) {
      errors.push({
        line: lineNumber,
        message: `列数が不正です（期待: ${EXPECTED_COLUMN_COUNT}列、実際: ${columns.length}列）`,
      });
      continue;
    }

    const [idText, categoryId, englishText, japaneseText, audioFileName] = columns;
    const id = Number(idText);
    if (!Number.isFinite(id)) {
      errors.push({ line: lineNumber, message: `idが数値ではありません: "${idText}"` });
      continue;
    }

    if (seenIds.has(id)) {
      errors.push({ line: lineNumber, message: `idが重複しています: ${id}` });
      continue;
    }
    seenIds.add(id);

    contents.push({ id, categoryId, englishText, japaneseText, audioFileName });
  }

  return { contents, errors };
}
