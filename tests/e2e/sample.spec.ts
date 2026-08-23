import { test, expect } from "@playwright/test";

// WP0（プロジェクト初期セットアップ）の疎通確認用サンプルテスト。
// WP3以降で実際の画面フローのE2Eテスト（docs/test-plan.md 6章）に置き換わる。
test("アプリのひな形が表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
});
