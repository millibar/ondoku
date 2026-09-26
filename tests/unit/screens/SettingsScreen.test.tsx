import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SettingsScreen } from "../../../src/screens/SettingsScreen";

// 参照: docs/spec.md 4.2.1節（設定画面: Drive接続設定、同期、閉じる）

function renderScreen(overrides: Partial<Parameters<typeof SettingsScreen>[0]> = {}) {
  return render(
    <SettingsScreen
      currentFolderId="folder-abc"
      onChangeFolder={vi.fn()}
      onSync={vi.fn()}
      onRefreshCache={vi.fn()}
      onBack={vi.fn()}
      {...overrides}
    />,
  );
}

describe("SettingsScreen", () => {
  it("見出しは「Settings」", () => {
    renderScreen();
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
  });

  it("現在保存されているフォルダIDが、入力欄ではなく表示のみで示される", () => {
    renderScreen();
    expect(screen.getByText("folder-abc")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("フォルダIDが未設定の場合は「未設定」と表示される", () => {
    renderScreen({ currentFolderId: "" });
    expect(screen.getByText("未設定")).toBeInTheDocument();
  });

  it("保存ボタンは無く、「教材を変更する...」ボタンが表示される", () => {
    renderScreen();
    expect(screen.queryByRole("button", { name: "保存" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "教材を変更する..." })).toBeInTheDocument();
  });

  describe("教材変更ポップアップ", () => {
    function openDialog(overrides: Partial<Parameters<typeof SettingsScreen>[0]> = {}) {
      renderScreen(overrides);
      fireEvent.click(screen.getByRole("button", { name: "教材を変更する..." }));
      return screen.getByRole("dialog");
    }

    it("最初はポップアップが表示されていない", () => {
      renderScreen();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("「教材を変更する...」でポップアップが開き、空の入力欄・変更して同期・キャンセルが表示される", () => {
      const dialog = openDialog();
      expect(within(dialog).getByLabelText("Google DriveのフォルダIDまたはURL")).toHaveValue("");
      expect(within(dialog).getByRole("button", { name: "変更して同期" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    });

    it("入力欄が空の間は「変更して同期」を押せない", () => {
      const dialog = openDialog();
      expect(within(dialog).getByRole("button", { name: "変更して同期" })).toBeDisabled();
      fireEvent.change(within(dialog).getByLabelText("Google DriveのフォルダIDまたはURL"), {
        target: { value: "   " },
      });
      expect(within(dialog).getByRole("button", { name: "変更して同期" })).toBeDisabled();
    });

    it("「変更して同期」でポップアップが閉じ、入力したIDでonChangeFolderが呼ばれる", () => {
      const onChangeFolder = vi.fn();
      const dialog = openDialog({ onChangeFolder });
      fireEvent.change(within(dialog).getByLabelText("Google DriveのフォルダIDまたはURL"), {
        target: { value: "folder-xyz" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "変更して同期" }));
      expect(onChangeFolder).toHaveBeenCalledWith("folder-xyz");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("フォルダURLを入力した場合は、抽出したIDでonChangeFolderが呼ばれる", () => {
      const onChangeFolder = vi.fn();
      const dialog = openDialog({ onChangeFolder });
      fireEvent.change(within(dialog).getByLabelText("Google DriveのフォルダIDまたはURL"), {
        target: {
          value: "https://drive.google.com/drive/folders/1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi",
        },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "変更して同期" }));
      expect(onChangeFolder).toHaveBeenCalledWith("1cjGHiZ-vRoPE9yNQOkIBs7ygY8d8JQbi");
    });

    it("「キャンセル」でポップアップが閉じ、onChangeFolderは呼ばれない", () => {
      const onChangeFolder = vi.fn();
      const dialog = openDialog({ onChangeFolder });
      fireEvent.change(within(dialog).getByLabelText("Google DriveのフォルダIDまたはURL"), {
        target: { value: "folder-xyz" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
      expect(onChangeFolder).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("folder-abc")).toBeInTheDocument();
    });

    it("Escキーでもポップアップが閉じ、onChangeFolderは呼ばれない", () => {
      const onChangeFolder = vi.fn();
      const dialog = openDialog({ onChangeFolder });
      fireEvent.keyDown(dialog, { key: "Escape" });
      expect(onChangeFolder).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("開き直すと入力欄は空に戻る", () => {
      const dialog = openDialog();
      fireEvent.change(within(dialog).getByLabelText("Google DriveのフォルダIDまたはURL"), {
        target: { value: "folder-xyz" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
      fireEvent.click(screen.getByRole("button", { name: "教材を変更する..." }));
      expect(screen.getByLabelText("Google DriveのフォルダIDまたはURL")).toHaveValue("");
    });
  });

  it("同期ボタンの上（前）に、同期の説明文が表示される", () => {
    renderScreen();
    const description = screen.getByText(
      "Google Drive上の教材（TSVファイルや音声）を更新した場合、現在のフォルダから教材を取り込み直せます（練習記録・お気に入りは削除されません）。すべての音声をダウンロードし直すため、Wi-Fi環境での実行をおすすめします。",
    );
    const button = screen.getByRole("button", { name: "同期" });
    expect(
      description.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it.each(["同期", "キャッシュを更新"])(
    "%sボタンは、ラベルの頭に装飾用のSVGアイコンが付く",
    (name) => {
      renderScreen();
      const button = screen.getByRole("button", { name });
      const icon = button.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(button.firstElementChild).toBe(icon);
      expect(button).toHaveTextContent(name);
    },
  );

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

  it("キャッシュを更新ボタンでonRefreshCacheが呼ばれる", () => {
    const onRefreshCache = vi.fn();
    renderScreen({ onRefreshCache });
    fireEvent.click(screen.getByRole("button", { name: "キャッシュを更新" }));
    expect(onRefreshCache).toHaveBeenCalledTimes(1);
  });

  it("ログアウトボタンは表示されない", () => {
    renderScreen();
    expect(screen.queryByRole("button", { name: "ログアウト" })).not.toBeInTheDocument();
  });

  it("閉じるボタンはアイコン（装飾用SVG）のみで表示され、ヘッダー内で見出しより前（左上）に置かれる", () => {
    renderScreen();
    const header = screen.getByRole("banner");
    const button = within(header).getByRole("button", { name: "閉じる" });
    const heading = within(header).getByRole("heading", { level: 1 });
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(button).toHaveTextContent("");
    expect(button.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("閉じるボタンでonBackが呼ばれる", () => {
    const onBack = vi.fn();
    renderScreen({ onBack });
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
