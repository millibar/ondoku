import { describe, expect, it } from "vitest";
import { buildDailySeries } from "../../../src/domain/dailyGrid";

// 参照: docs/test-plan.md 4.10節、docs/spec.md 9.4節

describe("buildDailySeries", () => {
  it("指定した日数分、古い日付→新しい日付の順で返す", () => {
    const series = buildDailySeries([], "2026-08-23", 3);
    expect(series.map((d) => d.date)).toEqual(["2026-08-21", "2026-08-22", "2026-08-23"]);
  });

  it("基準日（今日）が最後の要素として含まれる", () => {
    const series = buildDailySeries([], "2026-08-23", 3);
    expect(series[series.length - 1].date).toBe("2026-08-23");
  });

  it("該当日のDailyLogが無い日は0件として埋められる", () => {
    const series = buildDailySeries([], "2026-08-23", 3);
    for (const day of series) {
      expect(day.repeatingCount).toBe(0);
      expect(day.shadowingCount).toBe(0);
    }
  });

  it("DailyLogがある日はその値が反映される", () => {
    const series = buildDailySeries(
      [{ date: "2026-08-22", repeatingCount: 3, shadowingCount: 1 }],
      "2026-08-23",
      3,
    );
    const day = series.find((d) => d.date === "2026-08-22");
    expect(day).toEqual({ date: "2026-08-22", repeatingCount: 3, shadowingCount: 1 });
  });

  it("指定期間の範囲外のDailyLogは結果に含まれない", () => {
    const series = buildDailySeries(
      [{ date: "2026-08-01", repeatingCount: 5, shadowingCount: 5 }],
      "2026-08-23",
      3,
    );
    expect(series.map((d) => d.date)).not.toContain("2026-08-01");
  });

  it("入力のDailyLogが日付順でなくても正しく処理される", () => {
    const series = buildDailySeries(
      [
        { date: "2026-08-23", repeatingCount: 1, shadowingCount: 0 },
        { date: "2026-08-21", repeatingCount: 2, shadowingCount: 0 },
        { date: "2026-08-22", repeatingCount: 3, shadowingCount: 0 },
      ],
      "2026-08-23",
      3,
    );
    expect(series.map((d) => d.repeatingCount)).toEqual([2, 3, 1]);
  });
});
