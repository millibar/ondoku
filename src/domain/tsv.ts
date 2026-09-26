import type { Content } from "../types";

// TSVパーサー。参照: docs/spec.md 6章

export interface TsvParseError {
  line: number; // 1-indexed（ヘッダー行を含む元のTSV上の行番号）
  message: string;
}

export interface TsvParseResult {
  contents: Content[];
  errors: TsvParseError[];
  // カテゴリの表示名（2列目のヘッダー。例: "SECTION"）。空、または従来の列名categoryIdの場合はnull
  categoryLabel: string | null;
}

const EXPECTED_COLUMN_COUNT = 5;

// 2列目のヘッダーがこの列名の場合は、表示名が指定されていないものとして扱う（大文字小文字を区別しない）
const DEFAULT_CATEGORY_COLUMN_NAME = "categoryid";

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

  return { contents, errors, categoryLabel: parseCategoryLabel(lines[0]) };
}

function parseCategoryLabel(headerLine: string): string | null {
  const label = (headerLine.split("\t")[1] ?? "").trim();
  if (label === "" || label.toLowerCase() === DEFAULT_CATEGORY_COLUMN_NAME) return null;
  return label;
}
