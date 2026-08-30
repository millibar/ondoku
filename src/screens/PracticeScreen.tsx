import { useState } from "react";
import { ContentText } from "../components/ContentText";
import { PlaybackControls } from "../components/PlaybackControls";
import { ProgressBar } from "../components/ProgressBar";
import type { PlaybackStatus } from "../domain/playback";
import type { Content, OrderSettings, PracticeMode } from "../types";

// 練習画面。参照: docs/spec.md 4章、5.3節、5.3.1節、5.3.2節

export interface PracticeScreenProps {
  content: Content;
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
  // タブナビゲーション導入（WP10）までの暫定的な画面遷移。参照: docs/implementation-plan.md WP8
  onBack: () => void;
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
  onBack,
}: PracticeScreenProps) {
  const [showEnglish, setShowEnglish] = useState(true);
  const [showJapanese, setShowJapanese] = useState(true);

  return (
    <div className="practice-screen">
      <header>
        <button type="button" onClick={onBack}>
          戻る
        </button>
        <p className="practice-screen__streak">連続学習日数: {streak}日</p>
      </header>

      <div className="practice-screen__meta">
        <span>#{content.id}</span>
        <span>カテゴリ {content.categoryId}</span>
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

      <ContentText
        englishText={content.englishText}
        japaneseText={content.japaneseText}
        showEnglish={showEnglish}
        showJapanese={showJapanese}
      />

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
        onPlay={onPlay}
        onStop={onStop}
        onNext={onNext}
        onPrev={onPrev}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}
