import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PracticeScreen } from "../../../src/screens/PracticeScreen";

// 参照: docs/test-plan.md 5章、docs/spec.md 4章、5.3節、5.3.2節

const CONTENT = {
  id: 1,
  categoryId: "01",
  englishText: "Hello world.",
  japaneseText: "こんにちは世界。",
  audioFileName: "001.opus",
};

function renderScreen(overrides: Partial<Parameters<typeof PracticeScreen>[0]> = {}) {
  return render(
    <PracticeScreen
      content={CONTENT}
      practiceMode="shadowing"
      orderSettings={{ isRandom: false, isRepeatOne: false }}
      onChangePracticeMode={vi.fn()}
      onChangeOrderSettings={vi.fn()}
      playbackStatus="stopped"
      progress={0}
      isFavorite={false}
      onPlay={vi.fn()}
      onStop={vi.fn()}
      onNext={vi.fn()}
      onPrev={vi.fn()}
      onToggleFavorite={vi.fn()}
      onBack={vi.fn()}
      {...overrides}
    />,
  );
}

describe("PracticeScreen", () => {
  it("英文・日本語訳が表示される", () => {
    renderScreen();
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.getByText("こんにちは世界。")).toBeInTheDocument();
  });

  it("日本語訳の表示切り替えボタンで日本語訳のみ非表示にできる", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "日本語訳を隠す" }));
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.queryByText("こんにちは世界。")).not.toBeInTheDocument();
  });

  it("英文の表示切り替えボタンで英文のみ非表示にできる", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "英文を隠す" }));
    expect(screen.queryByText("Hello world.")).not.toBeInTheDocument();
    expect(screen.getByText("こんにちは世界。")).toBeInTheDocument();
  });

  it("シャドーイングボタンを押すとonChangePracticeModeが'shadowing'で呼ばれる", () => {
    const onChangePracticeMode = vi.fn();
    renderScreen({ practiceMode: "repeating", onChangePracticeMode });
    fireEvent.click(screen.getByRole("button", { name: "シャドーイング" }));
    expect(onChangePracticeMode).toHaveBeenCalledWith("shadowing");
  });

  it("リピーティングボタンを押すとonChangePracticeModeが'repeating'で呼ばれる", () => {
    const onChangePracticeMode = vi.fn();
    renderScreen({ practiceMode: "shadowing", onChangePracticeMode });
    fireEvent.click(screen.getByRole("button", { name: "リピーティング" }));
    expect(onChangePracticeMode).toHaveBeenCalledWith("repeating");
  });

  it("ランダム再生スイッチを切り替えると、isRepeatOneは維持したままisRandomが反転してonChangeOrderSettingsが呼ばれる", () => {
    const onChangeOrderSettings = vi.fn();
    renderScreen({
      orderSettings: { isRandom: false, isRepeatOne: true },
      onChangeOrderSettings,
    });
    fireEvent.click(screen.getByLabelText("ランダム再生"));
    expect(onChangeOrderSettings).toHaveBeenCalledWith({ isRandom: true, isRepeatOne: true });
  });

  it("1リピート再生スイッチを切り替えると、isRandomは維持したままisRepeatOneが反転してonChangeOrderSettingsが呼ばれる", () => {
    const onChangeOrderSettings = vi.fn();
    renderScreen({
      orderSettings: { isRandom: true, isRepeatOne: false },
      onChangeOrderSettings,
    });
    fireEvent.click(screen.getByLabelText("1リピート再生"));
    expect(onChangeOrderSettings).toHaveBeenCalledWith({ isRandom: true, isRepeatOne: true });
  });

  it("戻るボタンでonBackが呼ばれる", () => {
    const onBack = vi.fn();
    renderScreen({ onBack });
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("再生コントロール（PlaybackControls）が表示され、次へボタンでonNextが呼ばれる", () => {
    const onNext = vi.fn();
    renderScreen({ onNext });
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
