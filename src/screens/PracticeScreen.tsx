import { ContentText } from "../components/ContentText";
import { PlaybackControls } from "../components/PlaybackControls";
import { ProgressBar } from "../components/ProgressBar";
import type { PlaybackStatus } from "../domain/playback";
import type { Content, OrderSettings, PracticeMode } from "../types";

// 練習画面。参照: docs/spec.md 4章、5.3節、5.3.1節、5.3.2節
//
// 英文・日本語訳は文字数によってカードの高さが変わるため、他の操作UIより
// 下（末尾）に配置し、英文が変わってもUIの位置が動かないようにしている

export interface PracticeScreenProps {
  // 出題範囲が0件（練習対象チェックがすべてOFF、またはお気に入りのみ表示ONで
  // お気に入りが1件も無い場合等）はnullになる。参照: docs/spec.md 8.0節
  content: Content | null;
  practiceMode: PracticeMode;
  orderSettings: OrderSettings;
  onChangePracticeMode: (mode: PracticeMode) => void;
  onChangeOrderSettings: (settings: OrderSettings) => void;
  playbackStatus: PlaybackStatus;
  progress: number;
  isFavorite: boolean;
  // 出題範囲内での現在位置（1始まり）と総数。「n/総数」の表示に使う
  currentIndex: number;
  totalCount: number;
  streak: number;
  favoritesOnly: boolean;
  onChangeFavoritesOnly: (value: boolean) => void;
  onPlay: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFavorite: () => void;
}

export function PracticeScreen({
  content,
  practiceMode,
  orderSettings,
  onChangePracticeMode,
  onChangeOrderSettings,
  playbackStatus,
  progress,
  isFavorite,
  currentIndex,
  totalCount,
  streak,
  favoritesOnly,
  onChangeFavoritesOnly,
  onPlay,
  onStop,
  onNext,
  onPrev,
  onToggleFavorite,
}: PracticeScreenProps) {
  return (
    <div className="practice-screen">
      <header>
        <h1>練習</h1>
        <p className="practice-screen__streak">連続学習日数: {streak}日</p>
      </header>

      {/* 1. リピーティング／シャドーイング切り替え */}
      <div role="group" aria-label="練習モード" className="practice-screen__mode-toggle">
        <button
          type="button"
          aria-pressed={practiceMode === "repeating"}
          onClick={() => onChangePracticeMode("repeating")}
        >
          リピーティング
        </button>
        <button
          type="button"
          aria-pressed={practiceMode === "shadowing"}
          onClick={() => onChangePracticeMode("shadowing")}
        >
          シャドーイング
        </button>
      </div>

      {/* 2. 現在の番号/総数・ランダム再生・1リピート再生・お気に入りのみ表示 */}
      <div className="practice-screen__settings-row">
        <span className="practice-screen__index">
          {currentIndex}/{totalCount}
        </span>

        <label htmlFor="isRandom">
          <input
            id="isRandom"
            type="checkbox"
            checked={orderSettings.isRandom}
            onChange={(event) =>
              onChangeOrderSettings({ ...orderSettings, isRandom: event.target.checked })
            }
          />
          ランダム再生
        </label>

        <label htmlFor="isRepeatOne">
          <input
            id="isRepeatOne"
            type="checkbox"
            checked={orderSettings.isRepeatOne}
            onChange={(event) =>
              onChangeOrderSettings({ ...orderSettings, isRepeatOne: event.target.checked })
            }
          />
          1リピート再生
        </label>

        <label htmlFor="favoritesOnly">
          <input
            id="favoritesOnly"
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => onChangeFavoritesOnly(event.target.checked)}
          />
          お気に入りのみ表示
        </label>
      </div>

      {/* 3. プログレスバー */}
      <ProgressBar status={playbackStatus} progress={progress} />

      {/* 4. 前へ・再生・停止・次へボタン */}
      <PlaybackControls
        status={playbackStatus}
        disabled={content === null}
        onPlay={onPlay}
        onStop={onStop}
        onNext={onNext}
        onPrev={onPrev}
      />

      {/* 5. カテゴリ */}
      <p className="practice-screen__category">
        {content ? `カテゴリ ${content.categoryId}` : "-"}
      </p>

      {/* 6. 通し番号・お気に入りボタン */}
      <div className="practice-screen__content-meta">
        <span className="practice-screen__content-number">{content ? `#${content.id}` : "-"}</span>
        <button
          type="button"
          className="button--favorite"
          aria-pressed={isFavorite}
          disabled={content === null}
          onClick={onToggleFavorite}
        >
          {isFavorite ? "お気に入りから解除" : "お気に入りに追加"}
        </button>
      </div>

      {/* 7. 英文・日本語訳（文字数でカードの高さが変わるため最後に配置する） */}
      {content ? (
        <ContentText englishText={content.englishText} japaneseText={content.japaneseText} />
      ) : (
        <p className="practice-screen__empty-message">
          練習対象の英文が選択されていません。英文選択画面で選択するか、「お気に入りのみ表示」のチェックを外してください。
        </p>
      )}
    </div>
  );
}
