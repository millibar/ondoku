import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContentText } from "../../../src/components/ContentText";

// 参照: docs/test-plan.md 5章、docs/spec.md 5.3節（英文・日本語訳のON/OFF切り替え）
//
// 非表示時はDOMから取り除く（display:none相当）のではなくvisibility:hiddenにして
// レイアウト（カードの高さ）を維持する仕様のため、非表示時も要素自体は
// ドキュメントに残る。表示・非表示の検証にはtoBeVisible/not.toBeVisibleを使う

function renderContentText() {
  return render(<ContentText englishText="Hello world." japaneseText="こんにちは世界。" />);
}

describe("ContentText", () => {
  it("初期状態では英文・日本語訳ともに表示される", () => {
    renderContentText();
    expect(screen.getByText("Hello world.")).toBeVisible();
    expect(screen.getByText("こんにちは世界。")).toBeVisible();
  });

  it("英文の目のアイコンを押すと英文のみ非表示（visibility:hidden）になり、もう一度押すと再表示される", () => {
    renderContentText();
    const toggle = screen.getByRole("button", { name: "英文を隠す" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggle);
    // 要素自体はDOMに残ったまま非表示になる（レイアウトを維持するため）
    expect(screen.getByText("Hello world.")).not.toBeVisible();
    expect(screen.getByText("こんにちは世界。")).toBeVisible();
    expect(screen.getByRole("button", { name: "英文を表示" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "英文を表示" }));
    expect(screen.getByText("Hello world.")).toBeVisible();
  });

  it("日本語訳の目のアイコンを押すと日本語訳のみ非表示になり、もう一度押すと再表示される", () => {
    renderContentText();
    const toggle = screen.getByRole("button", { name: "日本語訳を隠す" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggle);
    expect(screen.getByText("Hello world.")).toBeVisible();
    expect(screen.getByText("こんにちは世界。")).not.toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "日本語訳を表示" }));
    expect(screen.getByText("こんにちは世界。")).toBeVisible();
  });

  it("両方隠しても要素はDOMに残ったまま非表示になる（display:noneではなくvisibility:hidden）", () => {
    renderContentText();
    fireEvent.click(screen.getByRole("button", { name: "英文を隠す" }));
    fireEvent.click(screen.getByRole("button", { name: "日本語訳を隠す" }));
    // 要素自体はDOMに存在し続ける（見つかる）が、視覚的には非表示になる。
    // jsdomはレイアウト計算を行わないため、実際に高さが維持されることの確認は
    // 実機（ブラウザ）で行う
    expect(screen.getByText("Hello world.")).not.toBeVisible();
    expect(screen.getByText("こんにちは世界。")).not.toBeVisible();
  });
});
