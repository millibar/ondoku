import { describe, expect, it } from "vitest";

// WP0（プロジェクト初期セットアップ）の疎通確認用サンプルテスト。
// WP1でドメインロジックの実テストに置き換わる。
describe("sample", () => {
  it("Vitestが実行できる", () => {
    expect(1 + 1).toBe(2);
  });
});
