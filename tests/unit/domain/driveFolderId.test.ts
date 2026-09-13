import { describe, expect, it } from "vitest";
import { extractDriveFolderId } from "../../../src/domain/driveFolderId";

describe("extractDriveFolderId", () => {
  it("フォルダID単体はそのまま返す", () => {
    expect(extractDriveFolderId("1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi")).toBe(
      "1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi",
    );
  });

  it("前後の空白を除去する", () => {
    expect(extractDriveFolderId("  1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi  ")).toBe(
      "1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi",
    );
  });

  it("標準的なフォルダURLからIDを抽出する", () => {
    expect(
      extractDriveFolderId("https://drive.google.com/drive/folders/1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi"),
    ).toBe("1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi");
  });

  it("クエリパラメータ付きのフォルダURLからIDを抽出する", () => {
    expect(
      extractDriveFolderId(
        "https://drive.google.com/drive/folders/1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi?usp=drive_link",
      ),
    ).toBe("1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi");
  });

  it("ユーザーアカウント切り替えを含むURLからIDを抽出する", () => {
    expect(
      extractDriveFolderId(
        "https://drive.google.com/drive/u/0/folders/1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi",
      ),
    ).toBe("1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi");
  });

  it("open?id= 形式のURLからIDを抽出する", () => {
    expect(
      extractDriveFolderId("https://drive.google.com/open?id=1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi"),
    ).toBe("1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi");
  });

  it("前後に空白を含むURLも処理できる", () => {
    expect(
      extractDriveFolderId(
        "  https://drive.google.com/drive/folders/1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi  ",
      ),
    ).toBe("1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi");
  });

  it("該当パターンがないただの文字列はそのまま返す", () => {
    expect(extractDriveFolderId("not-a-url")).toBe("not-a-url");
  });

  it("空文字はそのまま返す", () => {
    expect(extractDriveFolderId("")).toBe("");
  });
});
