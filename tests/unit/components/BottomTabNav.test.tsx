import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BottomTabNav } from "../../../src/components/BottomTabNav";

// 参照: docs/test-plan.md 5章、docs/spec.md 4章

describe("BottomTabNav", () => {
  it("3つのタブ（練習／英文選択／練習履歴）が表示される", () => {
    render(<BottomTabNav active="practice" disabled={false} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "練習" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "英文選択" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "練習履歴" })).toBeInTheDocument();
  });

  it("activeで指定したタブがaria-pressed=trueになる", () => {
    render(<BottomTabNav active="selection" disabled={false} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "英文選択" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "練習" })).toHaveAttribute("aria-pressed", "false");
  });

  it("タブをクリックするとonSelectが呼ばれる", () => {
    const onSelect = vi.fn();
    render(<BottomTabNav active="practice" disabled={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "練習履歴" }));
    expect(onSelect).toHaveBeenCalledWith("history");
  });

  it("disabled=trueのとき、英文選択・練習履歴タブは無効になる", () => {
    render(<BottomTabNav active="practice" disabled={true} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "英文選択" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "練習履歴" })).toBeDisabled();
  });

  it("disabled=trueでも練習タブ自体は無効にならない", () => {
    render(<BottomTabNav active="selection" disabled={true} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "練習" })).not.toBeDisabled();
  });
});
