import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsScreen } from "../../../src/screens/SettingsScreen";

// 参照: docs/spec.md 4.2.1節（設定画面: Drive接続設定、同期、閉じる）

function renderScreen(overrides: Partial<Parameters<typeof SettingsScreen>[0]> = {}) {
  return render(
    <SettingsScreen
      currentFolderId="folder-abc"
      onSave={vi.fn()}
      onSync={vi.fn()}
      onLogout={vi.fn()}
      onBack={vi.fn()}
      {...overrides}
    />,
  );
}

describe("SettingsScreen", () => {
  it("現在のフォルダIDが初期値として表示される", () => {
    renderScreen();
    expect(screen.getByLabelText("Google DriveのフォルダID")).toHaveValue("folder-abc");
  });

  it("フォルダIDを変更して保存すると、onSaveが新しい値で呼ばれる", () => {
    const onSave = vi.fn();
    renderScreen({ onSave });
    fireEvent.change(screen.getByLabelText("Google DriveのフォルダID"), {
      target: { value: "folder-xyz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith("folder-xyz");
  });

  it("同期ボタンでonSyncが呼ばれる", () => {
    const onSync = vi.fn();
    renderScreen({ onSync });
    fireEvent.click(screen.getByRole("button", { name: "同期" }));
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it("syncErrorが渡されるとエラーメッセージが表示される", () => {
    renderScreen({ syncError: "同期に失敗しました。" });
    expect(screen.getByText("同期に失敗しました。")).toBeInTheDocument();
  });

  it("syncErrorがnull（既定）のときはエラーメッセージが表示されない", () => {
    renderScreen();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ログアウトボタンでonLogoutが呼ばれる", () => {
    const onLogout = vi.fn();
    renderScreen({ onLogout });
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("閉じるボタンでonBackが呼ばれる", () => {
    const onBack = vi.fn();
    renderScreen({ onBack });
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
