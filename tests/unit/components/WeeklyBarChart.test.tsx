import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklyBarChart } from "../../../src/components/WeeklyBarChart";

// 参照: docs/test-plan.md 5章、docs/spec.md 9.4節

const SERIES = [
  { date: "2026-08-17", repeatingCount: 2, shadowingCount: 0 },
  { date: "2026-08-18", repeatingCount: 0, shadowingCount: 4 },
  { date: "2026-08-19", repeatingCount: 0, shadowingCount: 0 },
  { date: "2026-08-20", repeatingCount: 1, shadowingCount: 1 },
  { date: "2026-08-21", repeatingCount: 3, shadowingCount: 2 },
  { date: "2026-08-22", repeatingCount: 0, shadowingCount: 0 },
  { date: "2026-08-23", repeatingCount: 5, shadowingCount: 5 },
];

describe("WeeklyBarChart", () => {
  it("渡した日数分の棒（日）が描画される", () => {
    const { container } = render(<WeeklyBarChart series={SERIES} />);
    expect(container.querySelectorAll("[data-date]")).toHaveLength(7);
  });

  it("各日にリピーティング・シャドーイング2本の棒が描画され、回数がaria-labelに反映される", () => {
    render(<WeeklyBarChart series={SERIES} />);
    expect(
      screen.getByLabelText("2026-08-23 リピーティング 5回", { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("2026-08-23 シャドーイング 5回", { exact: false }),
    ).toBeInTheDocument();
  });

  it("回数が0の日は高さ0%の棒になる", () => {
    const { container } = render(<WeeklyBarChart series={SERIES} />);
    const bar = container.querySelector('[data-date="2026-08-19"] [data-series="repeating"]');
    expect(bar).toHaveStyle({ height: "0%" });
  });

  it("最大値の日は高さ100%の棒になる", () => {
    const { container } = render(<WeeklyBarChart series={SERIES} />);
    const bar = container.querySelector('[data-date="2026-08-23"] [data-series="repeating"]');
    expect(bar).toHaveStyle({ height: "100%" });
  });

  it("凡例（Repeating・Shadowing）が英語表記で表示される", () => {
    render(<WeeklyBarChart series={SERIES} />);
    expect(screen.getByText("Repeating")).toBeInTheDocument();
    expect(screen.getByText("Shadowing")).toBeInTheDocument();
  });

  it("曜日はアルファベット3文字（Sun〜Sat）で表示される", () => {
    // SERIESは2026-08-17（月）から7日分
    const { container } = render(<WeeklyBarChart series={SERIES} />);
    const labels = Array.from(container.querySelectorAll(".weekly-bar-chart__day-label")).map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("全日0件の場合でもクラッシュせず高さ0%の棒になる", () => {
    const zeroSeries = SERIES.map((d) => ({ ...d, repeatingCount: 0, shadowingCount: 0 }));
    const { container } = render(<WeeklyBarChart series={zeroSeries} />);
    const bar = container.querySelector('[data-date="2026-08-23"] [data-series="repeating"]');
    expect(bar).toHaveStyle({ height: "0%" });
  });
});
