import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContentText } from "../../../src/components/ContentText";

// 参照: docs/test-plan.md 5章、docs/spec.md 5.3節（英文・日本語訳のON/OFF切り替え）

describe("ContentText", () => {
  it("showEnglish/showJapanessともにtrueなら両方表示される", () => {
    render(
      <ContentText
        englishText="Hello world."
        japaneseText="こんにちは世界。"
        showEnglish
        showJapanese
      />,
    );
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.getByText("こんにちは世界。")).toBeInTheDocument();
  });

  it("showJapaneseがfalseなら日本語訳のみ非表示になる", () => {
    render(
      <ContentText
        englishText="Hello world."
        japaneseText="こんにちは世界。"
        showEnglish
        showJapanese={false}
      />,
    );
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.queryByText("こんにちは世界。")).not.toBeInTheDocument();
  });

  it("showEnglishがfalseなら英文のみ非表示になる", () => {
    render(
      <ContentText
        englishText="Hello world."
        japaneseText="こんにちは世界。"
        showEnglish={false}
        showJapanese
      />,
    );
    expect(screen.queryByText("Hello world.")).not.toBeInTheDocument();
    expect(screen.getByText("こんにちは世界。")).toBeInTheDocument();
  });

  it("両方falseなら何も表示されない", () => {
    render(
      <ContentText
        englishText="Hello world."
        japaneseText="こんにちは世界。"
        showEnglish={false}
        showJapanese={false}
      />,
    );
    expect(screen.queryByText("Hello world.")).not.toBeInTheDocument();
    expect(screen.queryByText("こんにちは世界。")).not.toBeInTheDocument();
  });
});
