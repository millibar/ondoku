import { describe, expect, it } from "vitest";
import { calculateStreak } from "../../../src/domain/streak";

// 参照: docs/test-plan.md 4.3節

describe("calculateStreak", () => {
  it("練習日が1日も無い場合は0", () => {
    expect(calculateStreak([], "2026-08-23")).toBe(0);
  });

  it("今日を含めて連続3日練習している場合、3を返す", () => {
    const dates = ["2026-08-21", "2026-08-22", "2026-08-23"];
    expect(calculateStreak(dates, "2026-08-23")).toBe(3);
  });

  it("今日はまだ練習していないが昨日まで2日連続の場合、2を返す", () => {
    const dates = ["2026-08-21", "2026-08-22"];
    expect(calculateStreak(dates, "2026-08-23")).toBe(2);
  });

  it("練習日の間に空白日がある場合、直近の連続区間のみをカウントする", () => {
    // 8/18, 8/19は連続しているが、8/21に飛んでいるので直近の区間（8/21〜8/23）のみ
    const dates = ["2026-08-18", "2026-08-19", "2026-08-21", "2026-08-22", "2026-08-23"];
    expect(calculateStreak(dates, "2026-08-23")).toBe(3);
  });

  it("今日・昨日ともに練習日が無い場合は0（ストリークが途切れている）", () => {
    const dates = ["2026-08-10", "2026-08-11"];
    expect(calculateStreak(dates, "2026-08-23")).toBe(0);
  });

  it("日付の重複や順不同があっても正しく計算できる", () => {
    const dates = ["2026-08-23", "2026-08-21", "2026-08-22", "2026-08-22"];
    expect(calculateStreak(dates, "2026-08-23")).toBe(3);
  });

  it("月をまたぐ連続日数も正しく計算できる", () => {
    const dates = ["2026-07-31", "2026-08-01", "2026-08-02"];
    expect(calculateStreak(dates, "2026-08-02")).toBe(3);
  });
});
