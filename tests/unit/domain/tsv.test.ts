import { describe, expect, it } from "vitest";
import { parseTsv } from "../../../src/domain/tsv";

// 参照: docs/test-plan.md 4.1節

const HEADER = "id\tcategoryId\tenglishText\tjapaneseText\taudioFileName";

describe("parseTsv", () => {
  it("正常なTSV（ヘッダー行＋複数行）をContent[]に正しく変換できる", () => {
    const tsv = [
      HEADER,
      "1\t01\tHello world.\tこんにちは世界。\t001.opus",
      "2\t01\tGood morning.\tおはよう。\t002.opus",
    ].join("\n");

    const result = parseTsv(tsv);

    expect(result.errors).toEqual([]);
    expect(result.contents).toEqual([
      {
        id: 1,
        categoryId: "01",
        englishText: "Hello world.",
        japaneseText: "こんにちは世界。",
        audioFileName: "001.opus",
      },
      {
        id: 2,
        categoryId: "01",
        englishText: "Good morning.",
        japaneseText: "おはよう。",
        audioFileName: "002.opus",
      },
    ]);
  });

  it("空行はスキップされる", () => {
    const tsv = [
      HEADER,
      "1\t01\tHello world.\tこんにちは世界。\t001.opus",
      "",
      "2\t01\tGood morning.\tおはよう。\t002.opus",
      "",
    ].join("\n");

    const result = parseTsv(tsv);

    expect(result.errors).toEqual([]);
    expect(result.contents).toHaveLength(2);
  });

  it("列数が不足する行はエラーとして扱われ、該当行番号を含む", () => {
    const tsv = [
      HEADER,
      "1\t01\tHello world.\tこんにちは世界。\t001.opus",
      "2\t01\tGood morning.", // 列数不足（3列目まで）
    ].join("\n");

    const result = parseTsv(tsv);

    expect(result.contents).toHaveLength(1);
    expect(result.errors).toEqual([expect.objectContaining({ line: 3 })]);
  });

  it("id列が数値に変換できない場合はエラーになる", () => {
    const tsv = [HEADER, "abc\t01\tHello world.\tこんにちは世界。\t001.opus"].join("\n");

    const result = parseTsv(tsv);

    expect(result.contents).toHaveLength(0);
    expect(result.errors).toEqual([expect.objectContaining({ line: 2 })]);
  });

  it("同一idが重複する場合、最初の行を採用しエラーとして報告する", () => {
    const tsv = [
      HEADER,
      "1\t01\tHello world.\tこんにちは世界。\t001.opus",
      "1\t02\tDuplicate.\t重複。\t999.opus",
    ].join("\n");

    const result = parseTsv(tsv);

    expect(result.contents).toEqual([
      {
        id: 1,
        categoryId: "01",
        englishText: "Hello world.",
        japaneseText: "こんにちは世界。",
        audioFileName: "001.opus",
      },
    ]);
    expect(result.errors).toEqual([expect.objectContaining({ line: 3 })]);
  });
});
