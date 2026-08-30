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
      currentIndex={1}
      totalCount={560}
      streak={3}
      favoritesOnly={false}
      onChangeFavoritesOnly={vi.fn()}
      onPlay={vi.fn()}
      onStop={vi.fn()}
      onNext={vi.fn()}
      onPrev={vi.fn()}
      onToggleFavorite={vi.fn()}
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

  it("モード切替・番号/総数・プログレスバー・再生コントロール・カテゴリ・通し番号・英文の順に並ぶ", () => {
    // 英文は文字数でカードの高さが変わるため、他の操作UIより下（末尾）に
    // 配置し、UIの位置が英文ごとに動かないようにする。参照: docs/spec.md 5.3節
    const { container } = renderScreen();
    const text = container.textContent ?? "";
    const modeToggleIndex = text.indexOf("リピーティング");
    const indexDisplayIndex = text.indexOf("1/560");
    const playbackControlsIndex = text.indexOf("前へ");
    const categoryIndex = text.indexOf("カテゴリ 01");
    const contentNumberIndex = text.indexOf("#1");
    const englishTextIndex = text.indexOf("Hello world.");

    expect(modeToggleIndex).toBeGreaterThanOrEqual(0);
    expect(modeToggleIndex).toBeLessThan(indexDisplayIndex);
    expect(indexDisplayIndex).toBeLessThan(playbackControlsIndex);
    expect(playbackControlsIndex).toBeLessThan(categoryIndex);
    expect(categoryIndex).toBeLessThan(contentNumberIndex);
    expect(contentNumberIndex).toBeLessThan(englishTextIndex);
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

  it("再生コントロール（PlaybackControls）が表示され、次へボタンでonNextが呼ばれる", () => {
    const onNext = vi.fn();
    renderScreen({ onNext });
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("現在の英文の通し番号・カテゴリが表示される", () => {
    renderScreen();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("カテゴリ 01")).toBeInTheDocument();
  });

  it("出題範囲内の総数と現在のインデックスが表示される", () => {
    renderScreen({ currentIndex: 3, totalCount: 560 });
    expect(screen.getByText("3/560")).toBeInTheDocument();
  });

  it("連続学習日数が表示される", () => {
    renderScreen({ streak: 5 });
    expect(screen.getByText(/5日/)).toBeInTheDocument();
  });

  it("お気に入りのみ表示チェックボックスの状態がfavoritesOnlyを反映する", () => {
    renderScreen({ favoritesOnly: true });
    expect(screen.getByLabelText("お気に入りのみ表示")).toBeChecked();
  });

  it("お気に入りのみ表示チェックボックスを操作するとonChangeFavoritesOnlyが呼ばれる", () => {
    const onChangeFavoritesOnly = vi.fn();
    renderScreen({ favoritesOnly: false, onChangeFavoritesOnly });
    fireEvent.click(screen.getByLabelText("お気に入りのみ表示"));
    expect(onChangeFavoritesOnly).toHaveBeenCalledWith(true);
  });

  describe("出題対象が無い場合（content=null）", () => {
    it("英文の代わりに案内メッセージが表示される", () => {
      renderScreen({ content: null });
      expect(
        screen.getByText(
          "練習対象の英文が選択されていません。英文選択画面で選択するか、「お気に入りのみ表示」のチェックを外してください。",
        ),
      ).toBeInTheDocument();
    });

    it("再生系ボタン（前へ・再生・停止・次へ・お気に入り）がすべて無効になる", () => {
      renderScreen({ content: null });
      expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "再生" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "停止" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "お気に入りに追加" })).toBeDisabled();
    });

    it("お気に入りのみ表示チェックボックスは操作できる（解除して復帰できるようにするため）", () => {
      const onChangeFavoritesOnly = vi.fn();
      renderScreen({ content: null, favoritesOnly: true, onChangeFavoritesOnly });
      const checkbox = screen.getByLabelText("お気に入りのみ表示");
      expect(checkbox).not.toBeDisabled();
      fireEvent.click(checkbox);
      expect(onChangeFavoritesOnly).toHaveBeenCalledWith(false);
    });

    it("通し番号・カテゴリは「-」表示になる", () => {
      renderScreen({ content: null, currentIndex: 0, totalCount: 0 });
      expect(screen.getAllByText("-")).toHaveLength(2);
      expect(screen.getByText("0/0")).toBeInTheDocument();
    });
  });
});
