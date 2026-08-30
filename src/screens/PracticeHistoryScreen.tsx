import { DailyHeatmapGrid } from "../components/DailyHeatmapGrid";
import { FrequencyGrid, type FrequencyGridCell } from "../components/FrequencyGrid";
import { WeeklyBarChart } from "../components/WeeklyBarChart";
import type { DailyLog } from "../types";

// 練習履歴画面。参照: docs/spec.md 4.3節

export interface PracticeHistoryScreenProps {
  streak: number;
  weeklySeries: DailyLog[]; // 直近7日分（buildDailySeriesの結果を想定）
  yearlySeries: DailyLog[]; // 直近196日分（buildDailySeriesの結果を想定）
  contentCells: FrequencyGridCell[]; // 全英文560マス分
}

export function PracticeHistoryScreen({
  streak,
  weeklySeries,
  yearlySeries,
  contentCells,
}: PracticeHistoryScreenProps) {
  return (
    <div className="practice-history-screen">
      <header>
        <h1>練習履歴</h1>
        <p className="practice-history-screen__streak">連続学習日数: {streak}日</p>
      </header>

      <section>
        <h2>直近7日間</h2>
        <WeeklyBarChart series={weeklySeries} />
      </section>

      <section>
        <h2>直近196日間</h2>
        <DailyHeatmapGrid days={yearlySeries} />
      </section>

      <section>
        <h2>全英文</h2>
        <FrequencyGrid cells={contentCells} />
      </section>
    </div>
  );
}
