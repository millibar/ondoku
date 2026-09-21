import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakBadge } from "../../../src/components/StreakBadge";

// 参照: docs/test-plan.md 5章、docs/spec.md 4.1節・4.3節

describe("StreakBadge", () => {
  it("連続学習日数が「n-Day Streak」の英語表記で表示される", () => {
    render(<StreakBadge streak={12} />);
    expect(screen.getByText("12-Day Streak")).toBeInTheDocument();
  });

  it("0日の場合も「0-Day Streak」と表示される", () => {
    render(<StreakBadge streak={0} />);
    expect(screen.getByText("0-Day Streak")).toBeInTheDocument();
  });
});
