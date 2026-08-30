import type { DailyLog } from "../types";

// 日別頻度シリーズ（7日間棒グラフ・196日ヒートマップ共用）の算出。参照: docs/spec.md 9.4節

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

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
