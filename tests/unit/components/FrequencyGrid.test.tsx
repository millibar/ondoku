import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { FrequencyGrid } from "../../../src/components/FrequencyGrid";

// 参照: docs/test-plan.md 5章、docs/spec.md 9.3節

describe("FrequencyGrid", () => {
  it("渡されたセルの数だけマスを描画する", () => {
    const cells = [
      { contentId: 1, level: 0 as const },
      { contentId: 2, level: 2 as const },
      { contentId: 3, level: 4 as const },
    ];
    const { container } = render(<FrequencyGrid cells={cells} />);
    expect(container.querySelectorAll("[data-content-id]")).toHaveLength(3);
  });

  it("各マスの色区分（data-level）がデータ通りに反映される", () => {
    const cells = [
      { contentId: 1, level: 0 as const },
      { contentId: 2, level: 4 as const },
    ];
    const { container } = render(<FrequencyGrid cells={cells} />);
    expect(container.querySelector('[data-content-id="1"]')).toHaveAttribute("data-level", "0");
    expect(container.querySelector('[data-content-id="2"]')).toHaveAttribute("data-level", "4");
  });
});
