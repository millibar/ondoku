import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App";
import { getAllContents } from "../../src/data/db";
import { saveDriveSettings } from "../../src/data/localStorage";
import { syncFromDrive } from "../../src/domain/sync";

// 参照: docs/spec.md 4章（画面遷移。3タブ構成＋設定サブ画面）
//
// App.tsxはGoogle認証・IndexedDB・Drive同期といった外部IOを実配線するため、
// それらをモック化した上で、画面遷移の骨格（ログイン→セットアップ→アプリ本体、
// タブ切り替え、設定画面の開閉）を検証する。
// 音声再生エンジン自体の詳細は tests/unit/hooks/usePlaybackEngine.test.ts で検証済み。

const { requestTokenMock } = vi.hoisted(() => ({ requestTokenMock: vi.fn() }));

vi.mock("../../src/auth/googleAuth", () => ({
  createGoogleAuthClient: () => ({ requestToken: requestTokenMock }),
}));

vi.mock("../../src/data/db", () => ({
  getAllContents: vi.fn().mockResolvedValue([]),
  getAllPracticeRecords: vi.fn().mockResolvedValue([]),
  getAllDailyLogs: vi.fn().mockResolvedValue([]),
  getAudioBlob: vi.fn(),
  incrementDailyLog: vi.fn(),
  incrementPracticeCount: vi.fn(),
  setFavorite: vi.fn(),
}));

vi.mock("../../src/domain/sync", () => ({
  syncFromDrive: vi.fn(),
}));

const SAMPLE_CONTENT = {
  id: 1,
  categoryId: "01",
  englishText: "Hello world.",
  japaneseText: "こんにちは世界。",
  audioFileName: "1.opus",
};

beforeEach(() => {
  localStorage.clear();
  requestTokenMock.mockReset();
  vi.mocked(getAllContents).mockReset().mockResolvedValue([]);
  vi.mocked(syncFromDrive)
    .mockReset()
    .mockResolvedValue({ contentCount: 0, audioFailures: [], tsvParseErrors: [] });
});

describe("App", () => {
  it("サイレント再認証に失敗した場合、ログイン画面が表示される", async () => {
    requestTokenMock.mockRejectedValue(new Error("no session"));

    render(<App />);

    expect(await screen.findByRole("button", { name: "Googleでログイン" })).toBeInTheDocument();
  });

  it("ログイン済みだがDriveフォルダ未設定の場合、初期セットアップ画面が表示される", async () => {
    requestTokenMock.mockResolvedValue({ accessToken: "token", expiresInSeconds: 3600 });

    render(<App />);

    expect(await screen.findByLabelText("Google DriveのフォルダID")).toBeInTheDocument();
  });

  it("ログイン済み・Drive設定済みの場合、アプリ本体（練習タブ）が表示される", async () => {
    saveDriveSettings({ rootFolderId: "folder-1" });
    vi.mocked(getAllContents).mockResolvedValue([SAMPLE_CONTENT]);
    requestTokenMock.mockResolvedValue({ accessToken: "token", expiresInSeconds: 3600 });

    render(<App />);

    expect(await screen.findByText("Hello world.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "練習" })).toHaveAttribute("aria-pressed", "true");
  });

  it("サイレント再認証に失敗（オフライン等）しても、キャッシュ済みデータがあればアプリ本体が表示される（仕様書11章）", async () => {
    requestTokenMock.mockRejectedValue(new Error("offline"));
    // reloadFromDb内でも呼ばれるため、両方の呼び出しで同じ結果を返す
    vi.mocked(getAllContents).mockResolvedValue([SAMPLE_CONTENT]);

    render(<App />);

    expect(await screen.findByText("Hello world.")).toBeInTheDocument();
    // ログイン画面には遷移しない
    expect(screen.queryByRole("button", { name: "Googleでログイン" })).not.toBeInTheDocument();
  });

  it("初期セットアップ画面でフォルダIDを入力して次へを押すと、初回同期が実行される（回帰テスト）", async () => {
    requestTokenMock.mockResolvedValue({ accessToken: "token", expiresInSeconds: 3600 });

    render(<App />);

    fireEvent.change(await screen.findByLabelText("Google DriveのフォルダID"), {
      target: { value: "folder-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    // 同期完了後、アプリ本体（タブナビゲーション）に遷移する（モックのsyncFromDriveは
    // 即座に解決するため、"同期中"表示は一瞬で過ぎ去る可能性があり、最終状態で検証する）
    expect(await screen.findByRole("button", { name: "英文選択" })).toBeInTheDocument();
    expect(syncFromDrive).toHaveBeenCalledWith(
      expect.objectContaining({ rootFolderId: "folder-123", accessToken: "token" }),
    );
  });

  it("練習対象の英文が選択されていない場合、練習画面のUIは残したまま案内メッセージと再生系ボタンのdisabledを表示する", async () => {
    saveDriveSettings({ rootFolderId: "folder-1" });
    // getAllContentsが空のままなので、選択状態も空 → 出題範囲が0件になる
    requestTokenMock.mockResolvedValue({ accessToken: "token", expiresInSeconds: 3600 });

    render(<App />);

    expect(
      await screen.findByText(
        "練習対象の英文が選択されていません。英文選択画面で選択するか、「お気に入りのみ表示」のチェックを外してください。",
      ),
    ).toBeInTheDocument();
    // 練習画面のUI（モード切替・タブナビゲーション）自体は残る
    expect(screen.getByRole("button", { name: "リピーティング" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "英文選択" })).toBeInTheDocument();
    // 再生系ボタンはdisabledになる
    expect(screen.getByRole("button", { name: "再生" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("英文選択タブに切り替えると英文選択画面が表示される", async () => {
    saveDriveSettings({ rootFolderId: "folder-1" });
    vi.mocked(getAllContents).mockResolvedValue([SAMPLE_CONTENT]);
    requestTokenMock.mockResolvedValue({ accessToken: "token", expiresInSeconds: 3600 });

    render(<App />);
    await screen.findByText("Hello world.");

    fireEvent.click(screen.getByRole("button", { name: "英文選択" }));

    expect(await screen.findByRole("heading", { name: /カテゴリ 01/ })).toBeInTheDocument();
  });

  it("練習履歴タブに切り替えると練習履歴画面（連続学習日数）が表示される", async () => {
    saveDriveSettings({ rootFolderId: "folder-1" });
    vi.mocked(getAllContents).mockResolvedValue([SAMPLE_CONTENT]);
    requestTokenMock.mockResolvedValue({ accessToken: "token", expiresInSeconds: 3600 });

    render(<App />);
    await screen.findByText("Hello world.");

    fireEvent.click(screen.getByRole("button", { name: "練習履歴" }));

    expect(await screen.findByRole("heading", { name: "練習履歴" })).toBeInTheDocument();
  });

  it("英文選択画面の設定ボタンで設定画面が開き、閉じるボタンで英文選択画面に戻る", async () => {
    saveDriveSettings({ rootFolderId: "folder-1" });
    vi.mocked(getAllContents).mockResolvedValue([SAMPLE_CONTENT]);
    requestTokenMock.mockResolvedValue({ accessToken: "token", expiresInSeconds: 3600 });

    render(<App />);
    await screen.findByText("Hello world.");
    fireEvent.click(screen.getByRole("button", { name: "英文選択" }));
    await screen.findByRole("heading", { name: /カテゴリ 01/ });

    fireEvent.click(screen.getByRole("button", { name: "設定" }));
    expect(await screen.findByLabelText("Google DriveのフォルダID")).toBeInTheDocument();
    // 設定画面表示中はタブナビゲーションを隠す
    expect(screen.queryByRole("button", { name: "練習" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(await screen.findByRole("heading", { name: /カテゴリ 01/ })).toBeInTheDocument();
  });
});
