import { DailyHeatmapGrid } from "../components/DailyHeatmapGrid";
import { FrequencyGrid, type FrequencyGridCell } from "../components/FrequencyGrid";
import { StreakBadge } from "../components/StreakBadge";
import { WeeklyBarChart } from "../components/WeeklyBarChart";
import type { WeeklyComparisonDay } from "../domain/dailyGrid";
import type { DailyLog } from "../types";

// 練習履歴画面。参照: docs/spec.md 4.3節

export interface PracticeHistoryScreenProps {
  streak: number;
  weeklyComparison: WeeklyComparisonDay[]; // 今週（日曜〜土曜）と前週（buildWeeklyComparisonの結果を想定）
  yearlySeries: DailyLog[]; // 直近196日分（buildDailySeriesの結果を想定）
  contentCells: FrequencyGridCell[]; // 全英文560マス分
}

export function PracticeHistoryScreen({
  streak,
  weeklyComparison,
  yearlySeries,
  contentCells,
}: PracticeHistoryScreenProps) {
  return (
    <div className="practice-history-screen">
      <header>
        <StreakBadge streak={streak} />
        <h1>History</h1>
      </header>

      <section>
        <h2>This Week</h2>
        <WeeklyBarChart days={weeklyComparison} />
      </section>

      <section>
        <h2>Last 28 Weeks</h2>
        <DailyHeatmapGrid days={yearlySeries} />
      </section>

      <section>
        <h2>All Sentences</h2>
        <FrequencyGrid cells={contentCells} />
      </section>
    </div>
  );
}
