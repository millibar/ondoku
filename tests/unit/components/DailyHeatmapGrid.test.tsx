import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DailyHeatmapGrid } from "../../../src/components/DailyHeatmapGrid";

// 参照: docs/test-plan.md 5章、docs/spec.md 9.4節

describe("DailyHeatmapGrid", () => {
  it("渡された日数分だけマスを描画する", () => {
    const days = [
      { date: "2026-08-21", repeatingCount: 0, shadowingCount: 0 },
      { date: "2026-08-22", repeatingCount: 1, shadowingCount: 0 },
      { date: "2026-08-23", repeatingCount: 5, shadowingCount: 5 },
    ];
    const { container } = render(<DailyHeatmapGrid days={days} />);
    expect(container.querySelectorAll("[data-date]")).toHaveLength(3);
  });

  it("各マスの色区分（data-level）が日別の合計練習回数通りに反映される", () => {
    const days = [
      { date: "2026-08-22", repeatingCount: 0, shadowingCount: 0 },
      { date: "2026-08-23", repeatingCount: 6, shadowingCount: 5 },
    ];
    const { container } = render(<DailyHeatmapGrid days={days} />);
    expect(container.querySelector('[data-date="2026-08-22"]')).toHaveAttribute("data-level", "0");
    expect(container.querySelector('[data-date="2026-08-23"]')).toHaveAttribute("data-level", "4");
  });
});
