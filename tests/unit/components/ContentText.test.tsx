import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContentText } from "../../../src/components/ContentText";

// 参照: docs/test-plan.md 5章、docs/spec.md 5.3節（英文・日本語訳のON/OFF切り替え）

function renderContentText() {
  return render(<ContentText englishText="Hello world." japaneseText="こんにちは世界。" />);
}

describe("ContentText", () => {
  it("初期状態では英文・日本語訳ともに表示される", () => {
    renderContentText();
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.getByText("こんにちは世界。")).toBeInTheDocument();
  });

  it("英文の目のアイコンを押すと英文のみ非表示になり、もう一度押すと再表示される", () => {
    renderContentText();
    const toggle = screen.getByRole("button", { name: "英文を隠す" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggle);
    expect(screen.queryByText("Hello world.")).not.toBeInTheDocument();
    expect(screen.getByText("こんにちは世界。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "英文を表示" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "英文を表示" }));
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
  });

  it("日本語訳の目のアイコンを押すと日本語訳のみ非表示になり、もう一度押すと再表示される", () => {
    renderContentText();
    const toggle = screen.getByRole("button", { name: "日本語訳を隠す" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggle);
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.queryByText("こんにちは世界。")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "日本語訳を表示" }));
    expect(screen.getByText("こんにちは世界。")).toBeInTheDocument();
  });

  it("両方隠すと何も表示されない", () => {
    renderContentText();
    fireEvent.click(screen.getByRole("button", { name: "英文を隠す" }));
    fireEvent.click(screen.getByRole("button", { name: "日本語訳を隠す" }));
    expect(screen.queryByText("Hello world.")).not.toBeInTheDocument();
    expect(screen.queryByText("こんにちは世界。")).not.toBeInTheDocument();
  });
});
