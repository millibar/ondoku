import type { DailyLog } from "../types";

// 直近N日間の練習回数（リピーティング／シャドーイング別）を表すグループ化棒グラフ。
// 参照: docs/spec.md 9.4節

export interface WeeklyBarChartProps {
  series: DailyLog[]; // 古い→新しい順
}

export function WeeklyBarChart({ series }: WeeklyBarChartProps) {
  const maxCount = Math.max(1, ...series.flatMap((d) => [d.repeatingCount, d.shadowingCount]));

  return (
    <div className="weekly-bar-chart">
      <ul className="weekly-bar-chart__legend">
        <li data-series="repeating">リピーティング</li>
        <li data-series="shadowing">シャドーイング</li>
      </ul>

      <div className="weekly-bar-chart__bars">
        {series.map((day) => (
          <div key={day.date} className="weekly-bar-chart__day" data-date={day.date}>
            <div className="weekly-bar-chart__bar-group">
              <span
                className="weekly-bar-chart__bar"
                data-series="repeating"
                style={{ height: `${(day.repeatingCount / maxCount) * 100}%` }}
                aria-label={`${day.date} リピーティング ${day.repeatingCount}回`}
              />
              <span
                className="weekly-bar-chart__bar"
                data-series="shadowing"
                style={{ height: `${(day.shadowingCount / maxCount) * 100}%` }}
                aria-label={`${day.date} シャドーイング ${day.shadowingCount}回`}
              />
            </div>
            <span className="weekly-bar-chart__day-label">{weekdayLabel(day.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function weekdayLabel(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return WEEKDAY_LABELS[weekday];
}
