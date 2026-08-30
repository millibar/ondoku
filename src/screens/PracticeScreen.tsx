import { useState } from "react";
import { ContentText } from "../components/ContentText";
import { PlaybackControls } from "../components/PlaybackControls";
import { ProgressBar } from "../components/ProgressBar";
import type { PlaybackStatus } from "../domain/playback";
import type { Content, OrderSettings, PracticeMode } from "../types";

// 練習画面。参照: docs/spec.md 4章、5.3節、5.3.1節、5.3.2節

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
  const [showEnglish, setShowEnglish] = useState(true);
  const [showJapanese, setShowJapanese] = useState(true);

  return (
    <div className="practice-screen">
      <header>
        <h1>練習</h1>
        <p className="practice-screen__streak">連続学習日数: {streak}日</p>
      </header>

      <div className="practice-screen__meta">
        <span>{content ? `#${content.id}` : "-"}</span>
        <span>{content ? `カテゴリ ${content.categoryId}` : "-"}</span>
        <span>
          {currentIndex}/{totalCount}
        </span>
      </div>

      <div className="practice-screen__mode-settings">
        <div role="group" aria-label="練習モード">
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
      </div>

      <div className="practice-screen__display-toggles">
        <button type="button" onClick={() => setShowEnglish((v) => !v)}>
          {showEnglish ? "英文を隠す" : "英文を表示"}
        </button>
        <button type="button" onClick={() => setShowJapanese((v) => !v)}>
          {showJapanese ? "日本語訳を隠す" : "日本語訳を表示"}
        </button>
      </div>

      {content ? (
        <ContentText
          englishText={content.englishText}
          japaneseText={content.japaneseText}
          showEnglish={showEnglish}
          showJapanese={showJapanese}
        />
      ) : (
        <p className="practice-screen__empty-message">
          練習対象の英文が選択されていません。英文選択画面で選択するか、「お気に入りのみ表示」のチェックを外してください。
        </p>
      )}

      <label htmlFor="favoritesOnly">
        <input
          id="favoritesOnly"
          type="checkbox"
          checked={favoritesOnly}
          onChange={(event) => onChangeFavoritesOnly(event.target.checked)}
        />
        お気に入りのみ表示
      </label>

      <ProgressBar status={playbackStatus} progress={progress} />

      <PlaybackControls
        status={playbackStatus}
        isFavorite={isFavorite}
        disabled={content === null}
        onPlay={onPlay}
        onStop={onStop}
        onNext={onNext}
        onPrev={onPrev}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}
