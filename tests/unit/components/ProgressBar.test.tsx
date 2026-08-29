import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "../../../src/components/ProgressBar";

// 参照: docs/test-plan.md 5章、docs/spec.md 8.4節

describe("ProgressBar", () => {
  it("progress=0.5のとき、aria-valuenowが50になる", () => {
    render(<ProgressBar status="playing" progress={0.5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("playing状態のとき、data-status='playing'を持つ", () => {
    render(<ProgressBar status="playing" progress={0.2} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-status", "playing");
  });

  it("waiting状態のとき、data-status='waiting'を持つ（再生中と見た目が区別される）", () => {
    render(<ProgressBar status="waiting" progress={0.2} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-status", "waiting");
  });

  it("stopped状態のとき、進捗は0として表示される", () => {
    render(<ProgressBar status="stopped" progress={0} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-status", "stopped");
  });

  // 参照: 次のコンテンツへの遷移時、進捗バーが右から左に縮むアニメーションを
  // 見せず瞬時にリセットされるようにするための回帰テスト
  it("progress=0のとき、バーのトランジションが無効化され瞬時にリセットされる", () => {
    render(<ProgressBar status="playing" progress={0} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.transition).toBe("none");
  });

  it("progress>0のとき、バーのトランジションは無効化されず、CSS側の設定（なめらかに伸びる）が適用される", () => {
    render(<ProgressBar status="playing" progress={0.5} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.transition).toBe("");
  });
});
