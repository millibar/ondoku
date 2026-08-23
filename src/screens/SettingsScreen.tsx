import { useState, type FormEvent } from "react";

// 設定画面（Drive接続設定・ログアウト）。参照: docs/spec.md 4章

export interface SettingsScreenProps {
  currentFolderId: string;
  onSave: (folderId: string) => void;
  onLogout: () => void;
  onBack: () => void;
}

export function SettingsScreen({ currentFolderId, onSave, onLogout, onBack }: SettingsScreenProps) {
  const [folderId, setFolderId] = useState(currentFolderId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(folderId.trim());
  }

  return (
    <div className="settings-screen">
      <header>
        <button type="button" onClick={onBack}>
          戻る
        </button>
        <h1>設定</h1>
      </header>

      <form onSubmit={handleSubmit}>
        <label htmlFor="settingsRootFolderId">Google DriveのフォルダID</label>
        <input
          id="settingsRootFolderId"
          type="text"
          value={folderId}
          onChange={(event) => setFolderId(event.target.value)}
        />
        <button type="submit">保存</button>
      </form>

      <button type="button" onClick={onLogout}>
        ログアウト
      </button>
    </div>
  );
}
