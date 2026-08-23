import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App";
import { getAllContents } from "../../src/data/db";
import { saveDriveSettings } from "../../src/data/localStorage";

// 参照: docs/spec.md 4章（画面遷移）
//
// App.tsxはGoogle認証・IndexedDB・Drive同期といった外部IOを実配線するため、
// それらをモック化した上で、画面遷移の骨格（ログイン→セットアップ→一覧）を検証する。
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
  getPracticeRecord: vi.fn(),
  incrementPracticeCount: vi.fn(),
  setFavorite: vi.fn(),
  upsertDailyLog: vi.fn(),
}));

vi.mock("../../src/domain/sync", () => ({
  syncFromDrive: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  requestTokenMock.mockReset();
  vi.mocked(getAllContents).mockReset().mockResolvedValue([]);
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

  it("ログイン済み・Drive設定済みの場合、一覧画面が表示される", async () => {
    saveDriveSettings({ rootFolderId: "folder-1" });
    requestTokenMock.mockResolvedValue({ accessToken: "token", expiresInSeconds: 3600 });

    render(<App />);

    expect(await screen.findByText("英語音読練習")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同期" })).toBeInTheDocument();
  });

  it("サイレント再認証に失敗（オフライン等）しても、キャッシュ済みデータがあれば一覧画面が表示される（仕様書11章）", async () => {
    requestTokenMock.mockRejectedValue(new Error("offline"));
    // reloadFromDb内でも呼ばれるため、両方の呼び出しで同じ結果を返す
    vi.mocked(getAllContents).mockResolvedValue([
      {
        id: 1,
        categoryId: "01",
        englishText: "Cached content.",
        japaneseText: "キャッシュ済みコンテンツ。",
        audioFileName: "1.opus",
      },
    ]);

    render(<App />);

    expect(await screen.findByText("Cached content.")).toBeInTheDocument();
    // ログイン画面には遷移しない
    expect(screen.queryByRole("button", { name: "Googleでログイン" })).not.toBeInTheDocument();
  });
});
