import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsScreen } from "../../../src/screens/SettingsScreen";

// 参照: docs/spec.md 4章（設定画面: Drive接続設定、ログアウト、バージョン表示）

describe("SettingsScreen", () => {
  it("現在のフォルダIDが初期値として表示される", () => {
    render(
      <SettingsScreen
        currentFolderId="folder-abc"
        onSave={vi.fn()}
        onLogout={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Google DriveのフォルダID")).toHaveValue("folder-abc");
  });

  it("フォルダIDを変更して保存すると、onSaveが新しい値で呼ばれる", () => {
    const onSave = vi.fn();
    render(
      <SettingsScreen
        currentFolderId="folder-abc"
        onSave={onSave}
        onLogout={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Google DriveのフォルダID"), {
      target: { value: "folder-xyz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith("folder-xyz");
  });

  it("ログアウトボタンでonLogoutが呼ばれる", () => {
    const onLogout = vi.fn();
    render(
      <SettingsScreen
        currentFolderId="folder-abc"
        onSave={vi.fn()}
        onLogout={onLogout}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("戻るボタンでonBackが呼ばれる", () => {
    const onBack = vi.fn();
    render(
      <SettingsScreen
        currentFolderId="folder-abc"
        onSave={vi.fn()}
        onLogout={vi.fn()}
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
