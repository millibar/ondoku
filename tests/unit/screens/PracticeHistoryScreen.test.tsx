import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PracticeHistoryScreen } from "../../../src/screens/PracticeHistoryScreen";

// 参照: docs/test-plan.md 5章、docs/spec.md 4.3節

const WEEKLY_SERIES = [
  { date: "2026-08-17", repeatingCount: 2, shadowingCount: 0 },
  { date: "2026-08-18", repeatingCount: 0, shadowingCount: 4 },
  { date: "2026-08-19", repeatingCount: 0, shadowingCount: 0 },
  { date: "2026-08-20", repeatingCount: 1, shadowingCount: 1 },
  { date: "2026-08-21", repeatingCount: 3, shadowingCount: 2 },
  { date: "2026-08-22", repeatingCount: 0, shadowingCount: 0 },
  { date: "2026-08-23", repeatingCount: 5, shadowingCount: 5 },
];

const YEARLY_SERIES = WEEKLY_SERIES;

const CONTENT_CELLS = [
  { contentId: 1, level: 0 as const },
  { contentId: 2, level: 4 as const },
];

function renderScreen(overrides: Partial<Parameters<typeof PracticeHistoryScreen>[0]> = {}) {
  return render(
    <PracticeHistoryScreen
      streak={7}
      weeklySeries={WEEKLY_SERIES}
      yearlySeries={YEARLY_SERIES}
      contentCells={CONTENT_CELLS}
      {...overrides}
    />,
  );
}

describe("PracticeHistoryScreen", () => {
  it("連続学習日数が表示される", () => {
    renderScreen({ streak: 7 });
    expect(screen.getByText("連続学習日数: 7日")).toBeInTheDocument();
  });

  it("直近7日間の棒グラフが表示される", () => {
    const { container } = renderScreen();
    expect(container.querySelector(".weekly-bar-chart")).toBeInTheDocument();
    expect(container.querySelectorAll(".weekly-bar-chart [data-date]")).toHaveLength(7);
  });

  it("日別ヒートマップグリッドが表示される", () => {
    const { container } = renderScreen();
    expect(container.querySelector(".daily-heatmap-grid")).toBeInTheDocument();
  });

  it("全英文の頻度グリッドが表示される", () => {
    const { container } = renderScreen();
    expect(container.querySelectorAll(".frequency-grid [data-content-id]")).toHaveLength(2);
  });
});
