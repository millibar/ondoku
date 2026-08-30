import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PlaybackControls } from "../../../src/components/PlaybackControls";

// 参照: docs/test-plan.md 5章、docs/spec.md 5.3.1節

describe("PlaybackControls", () => {
  it("各ボタン押下で対応するコールバックが呼ばれる", () => {
    const onPlay = vi.fn();
    const onStop = vi.fn();
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const onToggleFavorite = vi.fn();

    render(
      <PlaybackControls
        status="stopped"
        isFavorite={false}
        onPlay={onPlay}
        onStop={onStop}
        onNext={onNext}
        onPrev={onPrev}
        onToggleFavorite={onToggleFavorite}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "再生" }));
    expect(onPlay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(onNext).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "前へ" }));
    expect(onPrev).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "お気に入りに追加" }));
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("status='stopped'のとき、再生ボタンが有効、停止ボタンが無効になる", () => {
    render(
      <PlaybackControls
        status="stopped"
        isFavorite={false}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "再生" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "停止" })).toBeDisabled();
  });

  it("status='playing'のとき、再生ボタンが無効、停止ボタンが有効になる", () => {
    render(
      <PlaybackControls
        status="playing"
        isFavorite={false}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "再生" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "停止" })).toBeEnabled();
  });

  it("status='waiting'のときも、再生ボタンが無効、停止ボタンが有効になる", () => {
    render(
      <PlaybackControls
        status="waiting"
        isFavorite={false}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "再生" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "停止" })).toBeEnabled();
  });

  it("次へ・前へボタンはどの状態でも常に有効", () => {
    render(
      <PlaybackControls
        status="playing"
        isFavorite={false}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "前へ" })).toBeEnabled();
  });

  it("disabled=trueのとき、全ボタンが無効になる（出題対象が無い場合など）", () => {
    render(
      <PlaybackControls
        status="stopped"
        isFavorite={false}
        disabled={true}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "再生" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "停止" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "お気に入りに追加" })).toBeDisabled();
  });

  it("isFavorite=trueのとき、お気に入り解除ボタンとして表示される", () => {
    render(
      <PlaybackControls
        status="stopped"
        isFavorite={true}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "お気に入りから解除" })).toBeInTheDocument();
  });
});
