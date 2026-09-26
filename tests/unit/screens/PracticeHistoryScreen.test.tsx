import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PracticeHistoryScreen } from "../../../src/screens/PracticeHistoryScreen";

// 参照: docs/test-plan.md 5章、docs/spec.md 4.3節

const YEARLY_SERIES = [
  { date: "2026-08-17", repeatingCount: 2, shadowingCount: 0 },
  { date: "2026-08-18", repeatingCount: 0, shadowingCount: 4 },
  { date: "2026-08-19", repeatingCount: 0, shadowingCount: 0 },
  { date: "2026-08-20", repeatingCount: 1, shadowingCount: 1 },
  { date: "2026-08-21", repeatingCount: 3, shadowingCount: 2 },
  { date: "2026-08-22", repeatingCount: 0, shadowingCount: 0 },
  { date: "2026-08-23", repeatingCount: 5, shadowingCount: 5 },
];

// 今週=2026-08-16（日）〜08-22（土）、前週=08-09（日）〜08-15（土）
const WEEKLY_COMPARISON = YEARLY_SERIES.map((day, i) => ({
  thisWeek: { ...day, date: `2026-08-${16 + i}` },
  lastWeek: {
    date: `2026-08-${String(9 + i).padStart(2, "0")}`,
    repeatingCount: 1,
    shadowingCount: 1,
  },
  isFuture: false,
}));

const CONTENT_CELLS = [
  { contentId: 1, level: 0 as const },
  { contentId: 2, level: 4 as const },
];

function renderScreen(overrides: Partial<Parameters<typeof PracticeHistoryScreen>[0]> = {}) {
  return render(
    <PracticeHistoryScreen
      streak={7}
      weeklyComparison={WEEKLY_COMPARISON}
      yearlySeries={YEARLY_SERIES}
      contentCells={CONTENT_CELLS}
      {...overrides}
    />,
  );
}

describe("PracticeHistoryScreen", () => {
  it("見出しは「History」で、各セクションの見出しも英語表記になる", () => {
    renderScreen();
    expect(screen.getByRole("heading", { level: 1, name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "This Week" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Last 28 Weeks" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "All Sentences" })).toBeInTheDocument();
  });

  it("連続学習日数が「n-Day Streak」の英語表記でヘッダー内に表示され、見出しより前（左上）に置かれる", () => {
    renderScreen({ streak: 7 });
    const header = screen.getByRole("banner");
    const streak = within(header).getByText("7-Day Streak");
    const heading = within(header).getByRole("heading", { level: 1 });
    expect(streak.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("今週（日曜始まり）の棒グラフが表示される", () => {
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
