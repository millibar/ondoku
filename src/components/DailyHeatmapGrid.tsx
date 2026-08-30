import { frequencyLevel } from "../domain/grid";
import type { DailyLog } from "../types";

// 日別練習頻度ヒートマップ（GitHubのコントリビューショングラフのイメージ）。
// 参照: docs/spec.md 9.4節。7行×N列で列優先（古い日付が左上、新しい日付が右下）に配置する

const ROWS = 7;

export interface DailyHeatmapGridProps {
  days: DailyLog[]; // 古い→新しい順
}

export function DailyHeatmapGrid({ days }: DailyHeatmapGridProps) {
  return (
    <div
      className="daily-heatmap-grid"
      role="img"
      aria-label="日別練習頻度ヒートマップ"
      style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
    >
      {days.map((day) => (
        <span
          key={day.date}
          className="daily-heatmap-grid__cell"
          data-date={day.date}
          data-level={frequencyLevel(day.repeatingCount + day.shadowingCount)}
          title={`${day.date}: ${day.repeatingCount + day.shadowingCount}回`}
        />
      ))}
    </div>
  );
}
