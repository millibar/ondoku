import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SetupScreen } from "../../../src/screens/SetupScreen";
import { getDriveSettings } from "../../../src/data/localStorage";

// 参照: docs/test-plan.md 5章、docs/spec.md 7.2節

beforeEach(() => {
  localStorage.clear();
});

describe("SetupScreen", () => {
  it("フォルダID未入力時は次へボタンが無効", () => {
    render(<SetupScreen onComplete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("フォルダIDを入力すると次へボタンが有効になる", () => {
    render(<SetupScreen onComplete={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Google DriveのフォルダID"), {
      target: { value: "folder-123" },
    });
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
  });

  it("次へボタンを押すとlocalStorageに保存され、onCompleteが呼ばれる", () => {
    const onComplete = vi.fn();
    render(<SetupScreen onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText("Google DriveのフォルダID"), {
      target: { value: "folder-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(getDriveSettings()).toEqual({ rootFolderId: "folder-123" });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
