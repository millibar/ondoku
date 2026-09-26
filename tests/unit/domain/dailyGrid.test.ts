import { describe, expect, it } from "vitest";
import { buildDailySeries, buildWeeklyComparison } from "../../../src/domain/dailyGrid";

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

describe("buildWeeklyComparison", () => {
  // 2026-08-19は水曜日。今週=08-16（日）〜08-22（土）、前週=08-09（日）〜08-15（土）

  it("今日を含む週の日曜〜土曜の7日分を、前週の同じ曜日と対応させて返す", () => {
    const days = buildWeeklyComparison([], "2026-08-19");
    expect(days.map((d) => d.thisWeek.date)).toEqual([
      "2026-08-16",
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
    ]);
    expect(days.map((d) => d.lastWeek.date)).toEqual([
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
    ]);
  });

  it("今日が日曜日の場合、今日が先頭になる", () => {
    const days = buildWeeklyComparison([], "2026-08-16");
    expect(days[0].thisWeek.date).toBe("2026-08-16");
    expect(days[6].thisWeek.date).toBe("2026-08-22");
  });

  it("今日が土曜日の場合、今日が末尾になる", () => {
    const days = buildWeeklyComparison([], "2026-08-22");
    expect(days[0].thisWeek.date).toBe("2026-08-16");
    expect(days[6].thisWeek.date).toBe("2026-08-22");
  });

  it("今日より後の曜日だけが未来の日（isFuture=true）になる", () => {
    const days = buildWeeklyComparison([], "2026-08-19");
    expect(days.map((d) => d.isFuture)).toEqual([false, false, false, false, true, true, true]);
  });

  it("DailyLogがある日はその値が反映され、無い日は0件として埋められる（前週分も同様）", () => {
    const days = buildWeeklyComparison(
      [
        { date: "2026-08-17", repeatingCount: 3, shadowingCount: 1 },
        { date: "2026-08-10", repeatingCount: 2, shadowingCount: 5 },
        { date: "2026-08-08", repeatingCount: 9, shadowingCount: 9 }, // 前週より前は含まれない
      ],
      "2026-08-19",
    );
    expect(days[1].thisWeek).toEqual({ date: "2026-08-17", repeatingCount: 3, shadowingCount: 1 });
    expect(days[1].lastWeek).toEqual({ date: "2026-08-10", repeatingCount: 2, shadowingCount: 5 });
    expect(days[0].thisWeek).toEqual({ date: "2026-08-16", repeatingCount: 0, shadowingCount: 0 });
    expect(days[0].lastWeek).toEqual({ date: "2026-08-09", repeatingCount: 0, shadowingCount: 0 });
  });
});
