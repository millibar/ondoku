import { useState, type FormEvent } from "react";
import { BackCircleSVG } from "../components/icons/Icons";
import { extractDriveFolderId } from "../domain/driveFolderId";

// 設定画面（Drive接続設定・同期・キャッシュ更新）。参照: docs/spec.md 4.2.1節
// 英文選択画面から開くサブ画面（タブナビゲーションには含めない）

export interface SettingsScreenProps {
  currentFolderId: string;
  // 同期に失敗した場合のエラーメッセージ（オフライン時など）。参照: docs/spec.md 11章
  syncError?: string | null;
  onSave: (folderId: string) => void;
  onSync: () => void;
  // Service WorkerのキャッシュをクリアしてアプリのJS/CSS等を最新化する。
  // IndexedDB・localStorageのデータは削除されない。参照: docs/spec.md 4.2.1節
  onRefreshCache: () => void;
  onBack: () => void;
}

export function SettingsScreen({
  currentFolderId,
  syncError = null,
  onSave,
  onSync,
  onRefreshCache,
  onBack,
}: SettingsScreenProps) {
  const [folderId, setFolderId] = useState(currentFolderId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(extractDriveFolderId(folderId));
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

      <form className="settings-screen__form" onSubmit={handleSubmit}>
        <label htmlFor="settingsRootFolderId">Google DriveのフォルダIDまたはURL</label>
        <input
          id="settingsRootFolderId"
          type="text"
          value={folderId}
          onChange={(event) => setFolderId(event.target.value)}
        />
        <button type="submit" className="button--primary">
          保存
        </button>
      </form>

      <button type="button" onClick={onSync}>
        同期
      </button>
      {syncError && <p role="alert">{syncError}</p>}

      <div className="settings-screen__cache">
        <p className="settings-screen__cache-description">
          アプリの表示が古いままの場合、キャッシュされたファイルを更新できます（保存済みのデータは削除されません）。
        </p>
        <button type="button" onClick={onRefreshCache}>
          キャッシュを更新
        </button>
      </div>
    </div>
  );
}
