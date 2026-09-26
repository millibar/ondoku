import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklyBarChart } from "../../../src/components/WeeklyBarChart";
import type { WeeklyComparisonDay } from "../../../src/domain/dailyGrid";

// 参照: docs/test-plan.md 5章、docs/spec.md 9.4節

// 今週=2026-08-16（日）〜08-22（土）、今日=08-19（水）。前週=08-09（日）〜08-15（土）
const THIS_WEEK_COUNTS: [number, number][] = [
  [2, 0],
  [0, 4],
  [0, 0],
  [1, 1],
  [0, 0],
  [0, 0],
  [0, 0],
];
const LAST_WEEK_COUNTS: [number, number][] = [
  [1, 1],
  [3, 2],
  [0, 0],
  [8, 5],
  [2, 2],
  [0, 0],
  [4, 0],
];

const DAYS: WeeklyComparisonDay[] = THIS_WEEK_COUNTS.map(([r, s], i) => ({
  thisWeek: { date: `2026-08-${16 + i}`, repeatingCount: r, shadowingCount: s },
  lastWeek: {
    date: `2026-08-${String(9 + i).padStart(2, "0")}`,
    repeatingCount: LAST_WEEK_COUNTS[i][0],
    shadowingCount: LAST_WEEK_COUNTS[i][1],
  },
  isFuture: i > 3,
}));

function bar(container: HTMLElement, date: string, week: "this" | "last", series: string) {
  return container.querySelector(
    `[data-date="${date}"] [data-week="${week}"][data-series="${series}"]`,
  );
}

describe("WeeklyBarChart", () => {
  it("7日分（日曜〜土曜）の棒が描画される", () => {
    const { container } = render(<WeeklyBarChart days={DAYS} />);
    expect(container.querySelectorAll("[data-date]")).toHaveLength(7);
  });

  it("曜日はアルファベット3文字で、日曜始まりで表示される", () => {
    const { container } = render(<WeeklyBarChart days={DAYS} />);
    const labels = Array.from(container.querySelectorAll(".weekly-bar-chart__day-label")).map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("各日にリピーティング・シャドーイング2本の棒が描画され、回数がaria-labelに反映される", () => {
    render(<WeeklyBarChart days={DAYS} />);
    expect(screen.getByLabelText("2026-08-17 シャドーイング 4回")).toBeInTheDocument();
    expect(screen.getByLabelText("2026-08-19 リピーティング 1回")).toBeInTheDocument();
  });

  it("前週の同じ曜日の棒が、今週の棒と同じ位置の背面（前）に描画される", () => {
    const { container } = render(<WeeklyBarChart days={DAYS} />);
    const lastWeekBar = bar(container, "2026-08-19", "last", "repeating");
    const thisWeekBar = bar(container, "2026-08-19", "this", "repeating");
    expect(lastWeekBar).toHaveAttribute("aria-label", "2026-08-12 リピーティング 8回");
    expect(lastWeekBar?.parentElement).toBe(thisWeekBar?.parentElement);
    expect(lastWeekBar?.nextElementSibling).toBe(thisWeekBar);
  });

  it("今週・前週をあわせた最大値の棒が高さ100%になる", () => {
    const { container } = render(<WeeklyBarChart days={DAYS} />);
    expect(bar(container, "2026-08-19", "last", "repeating")).toHaveStyle({ height: "100%" });
    expect(bar(container, "2026-08-17", "this", "shadowing")).toHaveStyle({ height: "50%" });
  });

  it("回数が0の日は高さ0%の棒になる", () => {
    const { container } = render(<WeeklyBarChart days={DAYS} />);
    expect(bar(container, "2026-08-18", "this", "repeating")).toHaveStyle({ height: "0%" });
  });

  it("未来の日は今週の棒を描画せず、前週の棒のみを描画する", () => {
    const { container } = render(<WeeklyBarChart days={DAYS} />);
    expect(bar(container, "2026-08-20", "this", "repeating")).toBeNull();
    expect(bar(container, "2026-08-20", "this", "shadowing")).toBeNull();
    expect(bar(container, "2026-08-20", "last", "repeating")).toHaveAttribute(
      "aria-label",
      "2026-08-13 リピーティング 2回",
    );
  });

  it("凡例（Repeating・Shadowing・Last Week）が英語表記で表示される", () => {
    render(<WeeklyBarChart days={DAYS} />);
    expect(screen.getByText("Repeating")).toBeInTheDocument();
    expect(screen.getByText("Shadowing")).toBeInTheDocument();
    expect(screen.getByText("Last Week")).toBeInTheDocument();
  });

  it("全日0件の場合でもクラッシュせず高さ0%の棒になる", () => {
    const zeroDays = DAYS.map((d) => ({
      ...d,
      thisWeek: { ...d.thisWeek, repeatingCount: 0, shadowingCount: 0 },
      lastWeek: { ...d.lastWeek, repeatingCount: 0, shadowingCount: 0 },
    }));
    const { container } = render(<WeeklyBarChart days={zeroDays} />);
    expect(bar(container, "2026-08-16", "this", "repeating")).toHaveStyle({ height: "0%" });
    expect(bar(container, "2026-08-16", "last", "repeating")).toHaveStyle({ height: "0%" });
  });
});
