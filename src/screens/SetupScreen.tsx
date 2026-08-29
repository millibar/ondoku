import { useState, type FormEvent } from "react";
import { saveDriveSettings } from "../data/localStorage";

// 初回セットアップ画面（Driveフォルダ設定）。参照: docs/spec.md 4章、7.2節

export interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [folderId, setFolderId] = useState("");
  const trimmed = folderId.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (trimmed === "") return;
    saveDriveSettings({ rootFolderId: trimmed });
    onComplete();
  }

  return (
    <form className="setup-screen" onSubmit={handleSubmit}>
      <h1>初期設定</h1>
      <p>英文・日本語訳・音声ファイルを格納しているGoogle Driveのフォルダを指定してください。</p>
      <label htmlFor="rootFolderId">Google DriveのフォルダID</label>
      <input
        id="rootFolderId"
        type="text"
        value={folderId}
        onChange={(event) => setFolderId(event.target.value)}
      />
      <button type="submit" className="button--primary" disabled={trimmed === ""}>
        次へ
      </button>
    </form>
  );
}
