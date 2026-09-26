import type { DailyLog } from "../types";

// 日別頻度シリーズ（今週の棒グラフ・196日ヒートマップ）の算出。参照: docs/spec.md 9.4節

/**
 * 基準日（today）を含めて直近days日分の日別カウントを、古い日付→新しい日付の順で返す。
 * 該当日のDailyLogが無い日は0件として埋める。dailyLogsの並び順は問わない。
 */
export function buildDailySeries(dailyLogs: DailyLog[], today: string, days: number): DailyLog[] {
  const logsByDate = new Map(dailyLogs.map((log) => [log.date, log]));

  const series: DailyLog[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    series.push(logsByDate.get(date) ?? { date, repeatingCount: 0, shadowingCount: 0 });
  }
  return series;
}

// 今週の棒グラフの1曜日分。thisWeekとlastWeekは同じ曜日（7日違い）
export interface WeeklyComparisonDay {
  thisWeek: DailyLog; // 未来の日は0件
  lastWeek: DailyLog;
  isFuture: boolean; // 今日より後の日（今週のまだ来ていない日）
}

/**
 * 今日を含む週（日曜始まり）の日曜〜土曜の7日分を、前週の同じ曜日と対応させて返す。
 * 該当日のDailyLogが無い日は0件として埋める。
 */
export function buildWeeklyComparison(dailyLogs: DailyLog[], today: string): WeeklyComparisonDay[] {
  const logsByDate = new Map(dailyLogs.map((log) => [log.date, log]));
  const logOf = (date: string): DailyLog =>
    logsByDate.get(date) ?? { date, repeatingCount: 0, shadowingCount: 0 };

  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=日曜
  const sunday = addDays(today, -weekday);

  const days: WeeklyComparisonDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(sunday, i);
    const isFuture = i > weekday;
    days.push({
      thisWeek: isFuture ? { date, repeatingCount: 0, shadowingCount: 0 } : logOf(date),
      lastWeek: logOf(addDays(date, -7)),
      isFuture,
    });
  }
  return days;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
