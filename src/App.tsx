import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createGoogleAuthClient } from "./auth/googleAuth";
import { BottomTabNav, type TabId } from "./components/BottomTabNav";
import type { FrequencyGridCell } from "./components/FrequencyGrid";
import { GOOGLE_DRIVE_READONLY_SCOPE, GOOGLE_OAUTH_CLIENT_ID } from "./config";
import {
  getAllContents,
  getAllDailyLogs,
  getAllPracticeRecords,
  getAudioBlob,
  incrementDailyLog,
  incrementPracticeCount,
  setFavorite as setFavoriteRecord,
} from "./data/db";
import {
  getDriveSettings,
  getPracticeSessionState,
  getSelectionState,
  saveDriveSettings,
  savePracticeSessionState,
  saveSelectionState,
} from "./data/localStorage";
import { refreshAppCache } from "./data/serviceWorker";
import { buildDailySeries } from "./domain/dailyGrid";
import { frequencyLevel } from "./domain/grid";
import type { PlaybackStatus } from "./domain/playback";
import { buildPlaylist } from "./domain/selection";
import { calculateStreak } from "./domain/streak";
import { syncFromDrive, type SyncProgress } from "./domain/sync";
import {
  createHtmlAudioPlayer,
  createNoopAudioPlayer,
  type AudioPlayer,
} from "./hooks/audioPlayer";
import { usePlaybackEngine } from "./hooks/usePlaybackEngine";
import {
  ContentSelectionScreen,
  type ContentSelectionItem,
} from "./screens/ContentSelectionScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PracticeHistoryScreen } from "./screens/PracticeHistoryScreen";
import { PracticeScreen } from "./screens/PracticeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SetupScreen } from "./screens/SetupScreen";
import type {
  Content,
  DailyLog,
  OrderSettings,
  PracticeMode,
  PracticeRecord,
  SelectionState,
} from "./types";

// 画面遷移（自前の簡易ルーティング）。参照: docs/spec.md 4章
// 初期セットアップ完了後は「app」1状態にまとめ、タブ（activeTab）・
// 設定オーバーレイ（showSettings）は別stateで管理する
type Screen =
  | { name: "loading" }
  | { name: "login" }
  | { name: "setup" }
  | { name: "syncing" }
  | { name: "app" };

const WEEKLY_DAYS = 7;
const YEARLY_DAYS = 196;

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
  const [authFailed, setAuthFailed] = useState(false);
  // 初回起動（キャッシュ済みデータが無い）時のログイン/セットアップ/同期フローが
  // 完了したかどうか。キャッシュ済みデータがあれば、これを待たずにアプリ本体へ進む
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [contents, setContents] = useState<Content[]>([]);
  const [records, setRecords] = useState<Map<number, PracticeRecord>>(new Map());
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [streak, setStreak] = useState(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // アプリ本体（タブ）側の状態。参照: docs/spec.md 4章
  const [activeTab, setActiveTab] = useState<TabId>("practice");
  const [showSettings, setShowSettings] = useState(false);
  const [practiceStatus, setPracticeStatus] = useState<PlaybackStatus>("stopped");
  // localStorageの読み出しは初回マウント時の1回だけにする（useStateの遅延初期化）。
  // 起動時点でSelectionStateが既に保存されていたか（＝初回同期直後の
  // 「全件選択をデフォルトにする」処理を行うべきかの判定）にも使う。参照: docs/spec.md 5.2節
  const [initialSelectionState] = useState<SelectionState | null>(() => getSelectionState());
  const [selectionState, setSelectionState] = useState<SelectionState>(
    () => initialSelectionState ?? { selectedContentIds: [], favoritesOnly: false },
  );
  const hadPersistedSelectionRef = useRef(initialSelectionState !== null);
  // コンテンツが1件も読み込まれていない段階でselectionStateをlocalStorageへ
  // 書き込んでしまうと、後から「未保存」と判定できなくなり上記の初期化処理が
  // 誤って無効化される。そのため、実際にコンテンツが読み込まれるまでは保存を
  // 保留する（初回起動でDrive設定・同期が完了する前に書き込まれるのを防ぐ）
  const selectionReadyRef = useRef(initialSelectionState !== null);

  const reloadFromDb = useCallback(async () => {
    const [allContents, allRecords, allDailyLogs] = await Promise.all([
      getAllContents(),
      getAllPracticeRecords(),
      getAllDailyLogs(),
    ]);
    setContents(allContents);
    setRecords(new Map(allRecords.map((r) => [r.contentId, r])));
    setDailyLogs(allDailyLogs);
    setStreak(
      calculateStreak(
        allDailyLogs.map((d) => d.date),
        todayString(),
      ),
    );
    if (allContents.length > 0) {
      selectionReadyRef.current = true;
      // 初回同期直後（SelectionStateが未保存）のみ、全件選択をデフォルトにする。
      // 2回目以降の同期・再読み込みでは、ユーザーが選択した状態を上書きしない
      if (!hadPersistedSelectionRef.current) {
        hadPersistedSelectionRef.current = true;
        setSelectionState((prev) => ({
          ...prev,
          selectedContentIds: allContents.map((c) => c.id),
        }));
      }
    }
  }, []);

  useEffect(() => {
    if (!selectionReadyRef.current) return;
    saveSelectionState(selectionState);
  }, [selectionState]);

  const runSync = useCallback(
    async (rootFolderId: string) => {
      if (accessToken === null) {
        // オフライン（未ログイン）時は同期できない旨を伝える（仕様書11章）
        setSyncError(
          "同期にはログインが必要です。ネットワーク接続とログイン状態を確認してください。",
        );
        return;
      }
      setSyncError(null);
      setScreen({ name: "syncing" });
      setSyncProgress(null);
      try {
        await syncFromDrive({ rootFolderId, accessToken, onProgress: setSyncProgress });
      } catch (error) {
        // 同期に失敗しても、キャッシュ済みデータでアプリ本体は表示できるようにする
        console.error("同期に失敗しました", error);
        setSyncError("同期に失敗しました。ネットワーク接続を確認してもう一度お試しください。");
      }
      await reloadFromDb();
      setBootstrapped(true);
      setScreen({ name: "app" });
    },
    [accessToken, reloadFromDb],
  );

  // キャッシュ済みデータが1件でもあれば、認証を待たずに即座にアプリ本体へ進む
  // （オフラインでもキャッシュ済みデータで練習・閲覧ができるようにする。仕様書3章・11章）
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const existing = await getAllContents();
        if (cancelled || existing.length === 0) return;
        await reloadFromDb();
        if (!cancelled) {
          setBootstrapped(true);
          setScreen({ name: "app" });
        }
      } catch (error) {
        console.error("キャッシュ済みデータの読み込みに失敗しました", error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // サイレント再認証を試みる（バックグラウンドで常に実行し、成功すればトークンを得る）。
  // GISのサイレント再認証（prompt: ''）は、サードパーティCookie制限等の環境によっては
  // コールバックが一切呼ばれずハングすることがあるため、タイムアウトで打ち切る。
  useEffect(() => {
    let cancelled = false;
    Promise.race([authClient.requestToken({ silent: true }), rejectAfter(SILENT_AUTH_TIMEOUT_MS)])
      .then((result) => {
        if (!cancelled) setAccessToken(result.accessToken);
      })
      .catch(() => {
        if (!cancelled) setAuthFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 初回起動（キャッシュ済みデータが無い）の場合のみ、認証結果に応じて
  // 初期セットアップ・初回同期・ログイン画面のいずれかへ進む
  useEffect(() => {
    if (bootstrapped) return;
    // setStateをeffect本体で直接呼ばず、マイクロタスク経由にする
    queueMicrotask(() => {
      if (accessToken !== null) {
        const driveSettings = getDriveSettings();
        if (driveSettings === null) {
          setBootstrapped(true);
          setScreen({ name: "setup" });
        } else {
          void runSync(driveSettings.rootFolderId);
        }
      } else if (authFailed) {
        setBootstrapped(true);
        setScreen({ name: "login" });
      }
    });
    // 認証がまだ確定していない間はloading画面のまま待つ
  }, [bootstrapped, accessToken, authFailed, settingsVersion, runSync]);

  function handleLogin() {
    setLoginError(null);
    authClient
      .requestToken({ silent: false })
      .then((result) => {
        setAccessToken(result.accessToken);
        // ログイン画面まで来たのはブートストラップ判定でauthFailedになったため。
        // 明示ログイン成功を受けて、ブートストラップ判定（Drive設定チェック・初回同期）をやり直す
        setAuthFailed(false);
        setBootstrapped(false);
      })
      .catch(() => setLoginError("ログインに失敗しました。もう一度お試しください。"));
  }

  function handleLogout() {
    setAccessToken(null);
    setContents([]);
    setRecords(new Map());
    setActiveTab("practice");
    setShowSettings(false);
    setScreen({ name: "login" });
  }

  // 一覧画面・設定画面の両方から呼ばれる「同期」ボタンの共通ハンドラ
  function handleSync() {
    const driveSettings = getDriveSettings();
    if (driveSettings) {
      void runSync(driveSettings.rootFolderId);
    } else {
      setSyncError("Driveフォルダが設定されていません。設定画面から設定してください。");
    }
  }

  async function handleToggleFavorite(id: number) {
    const current = records.get(id);
    await setFavoriteRecord(id, !(current?.isFavorite ?? false));
    await reloadFromDb();
  }

  function handleToggleContentSelection(id: number) {
    setSelectionState((prev) => {
      const next = new Set(prev.selectedContentIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { ...prev, selectedContentIds: Array.from(next) };
    });
  }

  function handleToggleCategorySelection(categoryId: string, selected: boolean) {
    const categoryIds = contents.filter((c) => c.categoryId === categoryId).map((c) => c.id);
    setSelectionState((prev) => {
      const next = new Set(prev.selectedContentIds);
      for (const id of categoryIds) {
        if (selected) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return { ...prev, selectedContentIds: Array.from(next) };
    });
  }

  function handleToggleAllSelection(selected: boolean) {
    setSelectionState((prev) => ({
      ...prev,
      selectedContentIds: selected ? contents.map((c) => c.id) : [],
    }));
  }

  function handleChangeFavoritesOnly(value: boolean) {
    setSelectionState((prev) => ({ ...prev, favoritesOnly: value }));
  }

  // 練習タブから離れる際は、練習中に更新された練習回数・お気に入り・練習履歴を
  // 他タブへ反映するため再読み込みする（旧「戻る」ボタンの役割を引き継ぐ）
  function handleSelectTab(tab: TabId) {
    if (activeTab === "practice" && tab !== "practice") {
      void reloadFromDb();
    }
    setActiveTab(tab);
  }

  const playlist = useMemo(
    () =>
      buildPlaylist(
        contents,
        selectionState.selectedContentIds,
        selectionState.favoritesOnly,
        (id) => records.get(id)?.isFavorite ?? false,
      ),
    [contents, selectionState, records],
  );

  const selectionItems: ContentSelectionItem[] = useMemo(
    () =>
      contents.map((c) => {
        const r = records.get(c.id);
        return {
          id: c.id,
          categoryId: c.categoryId,
          englishText: c.englishText,
          repeatingCount: r?.repeatingCount ?? 0,
          shadowingCount: r?.shadowingCount ?? 0,
          isFavorite: r?.isFavorite ?? false,
        };
      }),
    [contents, records],
  );

  const weeklySeries = useMemo(
    () => buildDailySeries(dailyLogs, todayString(), WEEKLY_DAYS),
    [dailyLogs],
  );
  const yearlySeries = useMemo(
    () => buildDailySeries(dailyLogs, todayString(), YEARLY_DAYS),
    [dailyLogs],
  );
  const contentCells: FrequencyGridCell[] = useMemo(
    () =>
      contents.map((c) => {
        const r = records.get(c.id);
        return {
          contentId: c.id,
          level: frequencyLevel((r?.repeatingCount ?? 0) + (r?.shadowingCount ?? 0)),
        };
      }),
    [contents, records],
  );

  switch (screen.name) {
    case "loading":
      return <p className="app-status-message">読み込み中...</p>;

    case "login":
      return <LoginScreen onLogin={handleLogin} errorMessage={loginError} />;

    case "setup":
      return (
        <SetupScreen
          onComplete={() => {
            // bootstrappedをリセットしてブートストラップ判定（初回同期）をやり直す。
            // これが無いと、setup画面表示時点で既にbootstrapped=trueのため
            // 「次へ」を押しても同期が始まらない（本バグの原因）
            setBootstrapped(false);
            setSettingsVersion((v) => v + 1);
          }}
        />
      );

    case "syncing":
      return (
        <p className="app-status-message">
          同期中...
          {syncProgress ? ` ${syncProgress.completedCount}/${syncProgress.totalCount}` : ""}
        </p>
      );

    case "app":
      return (
        <div className="app-shell">
          <div className="app-shell__content">
            {showSettings ? (
              <SettingsScreen
                currentFolderId={getDriveSettings()?.rootFolderId ?? ""}
                onSave={(folderId) => {
                  saveDriveSettings({ rootFolderId: folderId });
                  setSettingsVersion((v) => v + 1);
                  setShowSettings(false);
                }}
                syncError={syncError}
                onSync={handleSync}
                onRefreshCache={() => void refreshAppCache()}
                onLogout={handleLogout}
                onBack={() => setShowSettings(false)}
              />
            ) : activeTab === "selection" ? (
              <ContentSelectionScreen
                items={selectionItems}
                selectedContentIds={selectionState.selectedContentIds}
                onToggleContentSelection={handleToggleContentSelection}
                onToggleCategorySelection={handleToggleCategorySelection}
                onToggleAllSelection={handleToggleAllSelection}
                onToggleFavorite={(id) => void handleToggleFavorite(id)}
                onOpenSettings={() => setShowSettings(true)}
              />
            ) : activeTab === "history" ? (
              <PracticeHistoryScreen
                streak={streak}
                weeklySeries={weeklySeries}
                yearlySeries={yearlySeries}
                contentCells={contentCells}
              />
            ) : (
              <PracticeContainer
                contents={contents}
                records={records}
                playlist={playlist}
                streak={streak}
                favoritesOnly={selectionState.favoritesOnly}
                onChangeFavoritesOnly={handleChangeFavoritesOnly}
                onToggleFavorite={(id) => void handleToggleFavorite(id)}
                onStatusChange={setPracticeStatus}
              />
            )}
          </div>
          {!showSettings && (
            <BottomTabNav
              active={activeTab}
              disabled={practiceStatus !== "stopped"}
              onSelect={handleSelectTab}
            />
          )}
        </div>
      );

    default:
      return null;
  }
}

// 練習画面の実配線（音声再生エンジン・練習記録の保存・練習状態の保存復元）。
// App.tsx専用の内部コンポーネントのためexportしない。
function PracticeContainer({
  contents,
  records,
  playlist,
  streak,
  favoritesOnly,
  onChangeFavoritesOnly,
  onToggleFavorite,
  onStatusChange,
}: {
  contents: Content[];
  records: Map<number, PracticeRecord>;
  playlist: number[];
  streak: number;
  favoritesOnly: boolean;
  onChangeFavoritesOnly: (value: boolean) => void;
  onToggleFavorite: (id: number) => void;
  onStatusChange: (status: PlaybackStatus) => void;
}) {
  // 練習状態の復元（仕様書5.6節）
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(
    () => getPracticeSessionState()?.practiceMode ?? "shadowing",
  );
  const [orderSettings, setOrderSettings] = useState<OrderSettings>(
    () => getPracticeSessionState()?.orderSettings ?? { isRandom: false, isRepeatOne: false },
  );
  // 出題範囲内に無ければ（選択が変わった等）先頭にフォールバックする。
  // usePlaybackEngineのinitialContentIdは初回マウント時のみ有効なため、一度だけ計算する
  const [initialContentId] = useState(() => {
    const persisted = getPracticeSessionState()?.currentContentId;
    if (persisted !== undefined && playlist.includes(persisted)) return persisted;
    return playlist[0] ?? 0;
  });
  const [audioReady, setAudioReady] = useState(false);
  const [player, setPlayer] = useState<AudioPlayer>(() => createNoopAudioPlayer());

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const urlMapRef = useRef<Map<number, string>>(new Map());

  const contentsById = useMemo(() => new Map(contents.map((c) => [c.id, c])), [contents]);

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
        await incrementDailyLog(now.slice(0, 10), practiceMode);
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
    onStatusChange(engine.status);
  }, [engine.status, onStatusChange]);

  useEffect(() => {
    savePracticeSessionState({
      practiceMode,
      orderSettings,
      currentContentId: engine.currentContentId,
    });
  }, [practiceMode, orderSettings, engine.currentContentId]);

  // 出題範囲が0件（練習対象チェックがすべてOFF、またはお気に入りのみ表示ONで
  // お気に入りが1件も無い場合）はcontent=nullとなり、PracticeScreen側で
  // 案内メッセージ・再生系ボタンのdisabled表示を行う。参照: docs/spec.md 8.0節
  const currentContent = contentsById.get(engine.currentContentId) ?? null;
  const currentIndex = playlist.length === 0 ? 0 : playlist.indexOf(engine.currentContentId) + 1;
  const isFavorite = currentContent ? (records.get(currentContent.id)?.isFavorite ?? false) : false;

  return (
    <>
      {/* 再生用の非表示audio要素 */}
      <audio ref={audioElRef} style={{ display: "none" }} />
      {!audioReady ? (
        <p className="inline-status-message">音声を準備中...</p>
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
          currentIndex={currentIndex}
          totalCount={playlist.length}
          streak={streak}
          favoritesOnly={favoritesOnly}
          onChangeFavoritesOnly={onChangeFavoritesOnly}
          onPlay={engine.play}
          onStop={engine.stop}
          onNext={engine.next}
          onPrev={engine.prev}
          onToggleFavorite={() => {
            if (currentContent) onToggleFavorite(currentContent.id);
          }}
        />
      )}
    </>
  );
}

export default App;
