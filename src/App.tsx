import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createGoogleAuthClient } from "./auth/googleAuth";
import { GOOGLE_DRIVE_READONLY_SCOPE, GOOGLE_OAUTH_CLIENT_ID } from "./config";
import {
  getAllContents,
  getAllDailyLogs,
  getAllPracticeRecords,
  getAudioBlob,
  getPracticeRecord,
  incrementPracticeCount,
  setFavorite as setFavoriteRecord,
  upsertDailyLog,
} from "./data/db";
import {
  getDriveSettings,
  getPracticeSessionState,
  saveDriveSettings,
  savePracticeSessionState,
} from "./data/localStorage";
import { calculateStreak } from "./domain/streak";
import { syncFromDrive, type SyncProgress } from "./domain/sync";
import {
  createHtmlAudioPlayer,
  createNoopAudioPlayer,
  type AudioPlayer,
} from "./hooks/audioPlayer";
import { usePlaybackEngine } from "./hooks/usePlaybackEngine";
import { ContentListScreen, type ContentListItem } from "./screens/ContentListScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PracticeScreen } from "./screens/PracticeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SetupScreen } from "./screens/SetupScreen";
import type { Content, OrderSettings, PracticeMode, PracticeRecord } from "./types";

// 画面遷移（自前の簡易ルーティング）。参照: docs/spec.md 4章
type Screen =
  | { name: "loading" }
  | { name: "login" }
  | { name: "setup" }
  | { name: "syncing" }
  | { name: "list" }
  | { name: "practice"; contentId: number; playlist: number[] }
  | { name: "settings" };

const authClient = createGoogleAuthClient({
  clientId: GOOGLE_OAUTH_CLIENT_ID,
  scope: GOOGLE_DRIVE_READONLY_SCOPE,
});

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// GISのサイレント再認証（prompt: ''）がコールバックを一切呼ばずハングする
// ケースがあるため、一定時間で見切りをつけるためのタイムアウト。
const SILENT_AUTH_TIMEOUT_MS = 5000;

function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("silent auth timed out")), ms);
  });
}

function App() {
  const [screen, setScreen] = useState<Screen>({ name: "loading" });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [contents, setContents] = useState<Content[]>([]);
  const [records, setRecords] = useState<Map<number, PracticeRecord>>(new Map());
  const [streak, setStreak] = useState(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const reloadFromDb = useCallback(async () => {
    const [allContents, allRecords, dailyLogs] = await Promise.all([
      getAllContents(),
      getAllPracticeRecords(),
      getAllDailyLogs(),
    ]);
    setContents(allContents);
    setRecords(new Map(allRecords.map((r) => [r.contentId, r])));
    setStreak(
      calculateStreak(
        dailyLogs.map((d) => d.date),
        todayString(),
      ),
    );
  }, []);

  const runSync = useCallback(
    async (rootFolderId: string) => {
      if (accessToken === null) return;
      setScreen({ name: "syncing" });
      setSyncProgress(null);
      try {
        await syncFromDrive({ rootFolderId, accessToken, onProgress: setSyncProgress });
      } catch (error) {
        // 同期に失敗しても、キャッシュ済みデータで一覧画面は表示できるようにする
        console.error("同期に失敗しました", error);
      }
      await reloadFromDb();
      setScreen({ name: "list" });
    },
    [accessToken, reloadFromDb],
  );

  // 初回起動時、サイレント再認証を試みる（失敗・タイムアウトしたらログイン画面へ）。
  // GISのサイレント再認証（prompt: ''）は、サードパーティCookie制限等の環境によっては
  // コールバックが一切呼ばれずハングすることがあるため、タイムアウトで打ち切る。
  useEffect(() => {
    let cancelled = false;
    Promise.race([authClient.requestToken({ silent: true }), rejectAfter(SILENT_AUTH_TIMEOUT_MS)])
      .then((result) => {
        if (!cancelled) setAccessToken(result.accessToken);
      })
      .catch(() => {
        if (!cancelled) setScreen({ name: "login" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ログイン済みになったら、Drive設定の有無に応じて初期セットアップ or 一覧（初回同期含む）へ
  useEffect(() => {
    if (accessToken === null) return;
    let cancelled = false;
    void (async () => {
      const driveSettings = getDriveSettings();
      if (driveSettings === null) {
        if (!cancelled) setScreen({ name: "setup" });
        return;
      }
      const existing = await getAllContents();
      if (cancelled) return;
      if (existing.length === 0) {
        await runSync(driveSettings.rootFolderId);
      } else {
        await reloadFromDb();
        if (!cancelled) setScreen({ name: "list" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, settingsVersion]);

  function handleLogin() {
    setLoginError(null);
    authClient
      .requestToken({ silent: false })
      .then((result) => setAccessToken(result.accessToken))
      .catch(() => setLoginError("ログインに失敗しました。もう一度お試しください。"));
  }

  function handleLogout() {
    setAccessToken(null);
    setContents([]);
    setRecords(new Map());
    setScreen({ name: "login" });
  }

  async function handleToggleFavorite(id: number) {
    const current = records.get(id);
    await setFavoriteRecord(id, !(current?.isFavorite ?? false));
    await reloadFromDb();
  }

  const listItems: ContentListItem[] = useMemo(
    () =>
      contents.map((c) => {
        const r = records.get(c.id);
        return {
          id: c.id,
          categoryId: c.categoryId,
          englishText: c.englishText,
          repeatingCount: r?.repeatingCount ?? 0,
          shadowingCount: r?.shadowingCount ?? 0,
          lastPracticedAt: r?.lastPracticedAt ?? "",
          isFavorite: r?.isFavorite ?? false,
        };
      }),
    [contents, records],
  );

  switch (screen.name) {
    case "loading":
      return <p>読み込み中...</p>;

    case "login":
      return <LoginScreen onLogin={handleLogin} errorMessage={loginError} />;

    case "setup":
      return <SetupScreen onComplete={() => setSettingsVersion((v) => v + 1)} />;

    case "syncing":
      return (
        <p>
          同期中...
          {syncProgress ? ` ${syncProgress.completedCount}/${syncProgress.totalCount}` : ""}
        </p>
      );

    case "list":
      return (
        <ContentListScreen
          items={listItems}
          streak={streak}
          onSelect={(id) =>
            setScreen({ name: "practice", contentId: id, playlist: contents.map((c) => c.id) })
          }
          onToggleFavorite={(id) => void handleToggleFavorite(id)}
          onSync={() => {
            const driveSettings = getDriveSettings();
            if (driveSettings) void runSync(driveSettings.rootFolderId);
          }}
          onOpenSettings={() => setScreen({ name: "settings" })}
        />
      );

    case "practice":
      return (
        <PracticeContainer
          contents={contents}
          initialContentId={screen.contentId}
          playlist={screen.playlist}
          onBack={() => {
            setScreen({ name: "list" });
            void reloadFromDb();
          }}
        />
      );

    case "settings":
      return (
        <SettingsScreen
          currentFolderId={getDriveSettings()?.rootFolderId ?? ""}
          onSave={(folderId) => {
            saveDriveSettings({ rootFolderId: folderId });
            setSettingsVersion((v) => v + 1);
            setScreen({ name: "list" });
          }}
          onLogout={handleLogout}
          onBack={() => setScreen({ name: "list" })}
        />
      );

    default:
      return null;
  }
}

// 練習画面の実配線（音声再生エンジン・練習記録の保存・練習状態の保存復元）。
// App.tsx専用の内部コンポーネントのためexportしない。
function PracticeContainer({
  contents,
  initialContentId,
  playlist,
  onBack,
}: {
  contents: Content[];
  initialContentId: number;
  playlist: number[];
  onBack: () => void;
}) {
  // 練習状態の復元（仕様書5.5節）。ここでは簡略化し、フィルタ（出題範囲）の復元は行わない
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(
    () => getPracticeSessionState()?.practiceMode ?? "shadowing",
  );
  const [orderSettings, setOrderSettings] = useState<OrderSettings>(
    () => getPracticeSessionState()?.orderSettings ?? { isRandom: false, isRepeatOne: false },
  );
  const [isFavorite, setIsFavoriteState] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [player, setPlayer] = useState<AudioPlayer>(() => createNoopAudioPlayer());

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const urlMapRef = useRef<Map<number, string>>(new Map());

  const contentsById = useMemo(() => new Map(contents.map((c) => [c.id, c])), [contents]);

  useEffect(() => {
    void getPracticeRecord(initialContentId).then((record) =>
      setIsFavoriteState(record?.isFavorite ?? false),
    );
  }, [initialContentId]);

  // <audio>要素のrefが確定してから実プレイヤーへ差し替える
  useEffect(() => {
    if (audioElRef.current) {
      setPlayer(createHtmlAudioPlayer(audioElRef.current));
    }
  }, []);

  // 出題範囲の音声Blobを取得し、Object URLを準備する
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setAudioReady(false);
      const entries = await Promise.all(
        playlist.map(async (id) => {
          const entry = await getAudioBlob(id);
          return entry ? ([id, URL.createObjectURL(entry.blob)] as const) : null;
        }),
      );
      if (cancelled) return;
      urlMapRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlMapRef.current = new Map(entries.filter((e): e is [number, string] => e !== null));
      setAudioReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [playlist]);

  // アンマウント時にObject URLを解放する
  useEffect(() => {
    const map = urlMapRef.current;
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handlePlaybackCompleted = useCallback(
    (contentId: number) => {
      void (async () => {
        const now = new Date().toISOString();
        await incrementPracticeCount(contentId, practiceMode, now);
        await upsertDailyLog(now.slice(0, 10));
      })();
    },
    [practiceMode],
  );

  const engine = usePlaybackEngine({
    playlist,
    practiceMode,
    orderSettings,
    initialContentId,
    player,
    getAudioUrl: (id) => urlMapRef.current.get(id) ?? "",
    onPlaybackCompleted: handlePlaybackCompleted,
  });

  useEffect(() => {
    savePracticeSessionState({
      practiceMode,
      orderSettings,
      filter: { categoryId: null, favoritesOnly: false },
      currentContentId: engine.currentContentId,
    });
  }, [practiceMode, orderSettings, engine.currentContentId]);

  async function handleToggleFavorite() {
    const next = !isFavorite;
    setIsFavoriteState(next);
    await setFavoriteRecord(engine.currentContentId, next);
  }

  const currentContent = contentsById.get(engine.currentContentId);

  return (
    <>
      {/* 再生用の非表示audio要素 */}
      <audio ref={audioElRef} style={{ display: "none" }} />
      {!audioReady || !currentContent ? (
        <p>音声を準備中...</p>
      ) : (
        <PracticeScreen
          content={currentContent}
          practiceMode={practiceMode}
          orderSettings={orderSettings}
          onChangePracticeMode={setPracticeMode}
          onChangeOrderSettings={setOrderSettings}
          playbackStatus={engine.status}
          progress={engine.progress}
          isFavorite={isFavorite}
          onPlay={engine.play}
          onStop={engine.stop}
          onNext={engine.next}
          onPrev={engine.prev}
          onToggleFavorite={() => void handleToggleFavorite()}
          onBack={onBack}
        />
      )}
    </>
  );
}

export default App;
