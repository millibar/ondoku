import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { BackCircleSVG } from "../components/icons/Icons";
import { extractDriveFolderId } from "../domain/driveFolderId";

// 設定画面（Drive接続設定・同期・キャッシュ更新）。参照: docs/spec.md 4.2.1節
// 英文選択画面から開くサブ画面（タブナビゲーションには含めない）

export interface SettingsScreenProps {
  currentFolderId: string; // 未設定の場合は空文字
  // 同期に失敗した場合のエラーメッセージ（オフライン時など）。参照: docs/spec.md 11章
  syncError?: string | null;
  // 教材変更ポップアップの「変更して同期」。抽出済みのフォルダIDを受け取り、保存と同期を行う
  onChangeFolder: (folderId: string) => void;
  onSync: () => void;
  // Service WorkerのキャッシュをクリアしてアプリのJS/CSS等を最新化する。
  // IndexedDB・localStorageのデータは削除されない。参照: docs/spec.md 4.2.1節
  onRefreshCache: () => void;
  onBack: () => void;
}

export function SettingsScreen({
  currentFolderId,
  syncError = null,
  onChangeFolder,
  onSync,
  onRefreshCache,
  onBack,
}: SettingsScreenProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [folderInput, setFolderInput] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);

  // ポップアップを開いたら入力欄にフォーカスする
  useEffect(() => {
    if (isDialogOpen) folderInputRef.current?.focus();
  }, [isDialogOpen]);

  function openDialog() {
    setFolderInput("");
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
  }

  function handleDialogKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") closeDialog();
  }

  function handleChangeFolder(event: FormEvent) {
    event.preventDefault();
    const trimmed = folderInput.trim();
    if (trimmed === "") return;
    closeDialog();
    onChangeFolder(extractDriveFolderId(trimmed));
  }

  return (
    <div className="settings-screen">
      <header>
        <button
          type="button"
          className="settings-screen__back-button"
          aria-label="閉じる"
          onClick={onBack}
        >
          <BackCircleSVG />
        </button>
        <h1>Settings</h1>
      </header>

      <div className="settings-screen__folder">
        <p className="settings-screen__folder-label">現在のGoogle DriveフォルダID</p>
        <p className="settings-screen__folder-id">{currentFolderId || "未設定"}</p>
        <button type="button" className="button--primary" onClick={openDialog}>
          教材を変更する...
        </button>
      </div>

      <div className="settings-screen__sync">
        <p className="settings-screen__description">
          Google
          Drive上の教材（TSVファイルや音声）を更新した場合、現在のフォルダから教材を取り込み直せます（練習記録・お気に入りは削除されません）。すべての音声をダウンロードし直すため、Wi-Fi環境での実行をおすすめします。
        </p>
        <button type="button" onClick={onSync}>
          同期
        </button>
        {syncError && <p role="alert">{syncError}</p>}
      </div>

      <div className="settings-screen__cache">
        <p className="settings-screen__description">
          アプリの表示が古いままの場合、キャッシュされたファイルを更新できます（保存済みのデータは削除されません）。
        </p>
        <button type="button" onClick={onRefreshCache}>
          キャッシュを更新
        </button>
      </div>

      {isDialogOpen && (
        <div className="settings-dialog__backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="changeFolderDialogTitle"
            className="settings-dialog"
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id="changeFolderDialogTitle">教材を変更</h2>
            <form className="settings-dialog__form" onSubmit={handleChangeFolder}>
              <label htmlFor="changeFolderInput">Google DriveのフォルダIDまたはURL</label>
              <input
                ref={folderInputRef}
                id="changeFolderInput"
                type="text"
                value={folderInput}
                onChange={(event) => setFolderInput(event.target.value)}
              />
              <div className="settings-dialog__actions">
                <button type="button" onClick={closeDialog}>
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="button--primary"
                  disabled={folderInput.trim() === ""}
                >
                  変更して同期
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
