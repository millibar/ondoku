import type { WeeklyComparisonDay } from "../domain/dailyGrid";
import type { DailyLog } from "../types";

// 今週（日曜始まり）の練習回数（リピーティング／シャドーイング別）を表すグループ化棒グラフ。
// 前週の同じ曜日の回数を薄い棒で背面に重ね、比較できるようにする。参照: docs/spec.md 9.4節

export interface WeeklyBarChartProps {
  days: WeeklyComparisonDay[]; // 日曜→土曜の順（buildWeeklyComparisonの結果を想定）
}

type Series = "repeating" | "shadowing";

const SERIES: { id: Series; label: string; count: (log: DailyLog) => number }[] = [
  { id: "repeating", label: "リピーティング", count: (log) => log.repeatingCount },
  { id: "shadowing", label: "シャドーイング", count: (log) => log.shadowingCount },
];

export function WeeklyBarChart({ days }: WeeklyBarChartProps) {
  const maxCount = Math.max(
    1,
    ...days.flatMap((d) =>
      [d.thisWeek, d.lastWeek].flatMap((log) => [log.repeatingCount, log.shadowingCount]),
    ),
  );

  const renderBar = (log: DailyLog, week: "this" | "last", series: (typeof SERIES)[number]) => (
    <span
      className="weekly-bar-chart__bar"
      data-week={week}
      data-series={series.id}
      style={{ height: `${(series.count(log) / maxCount) * 100}%` }}
      aria-label={`${log.date} ${series.label} ${series.count(log)}回`}
    />
  );

  return (
    <div className="weekly-bar-chart">
      <ul className="weekly-bar-chart__legend">
        <li data-series="repeating">Repeating</li>
        <li data-series="shadowing">Shadowing</li>
        <li data-series="last-week">Last Week</li>
      </ul>

      <div className="weekly-bar-chart__bars">
        {days.map((day) => (
          <div
            key={day.thisWeek.date}
            className="weekly-bar-chart__day"
            data-date={day.thisWeek.date}
          >
            <div className="weekly-bar-chart__bar-group">
              {SERIES.map((series) => (
                // 前週の棒を先に置き、今週の棒を手前に重ねる
                <span key={series.id} className="weekly-bar-chart__bar-slot">
                  {renderBar(day.lastWeek, "last", series)}
                  {!day.isFuture && renderBar(day.thisWeek, "this", series)}
                </span>
              ))}
            </div>
            <span className="weekly-bar-chart__day-label">{weekdayLabel(day.thisWeek.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekdayLabel(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return WEEKDAY_LABELS[weekday];
}
