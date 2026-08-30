import type { PlaybackStatus } from "../domain/playback";

// 再生コントロール（再生／停止／次へ／前へ）。参照: docs/spec.md 5.3.1節
// お気に入りボタンは通し番号と並べて練習画面側（PracticeScreen）で表示する

export interface PlaybackControlsProps {
  status: PlaybackStatus;
  // 出題対象の英文が無い場合など、全ボタンを無効化する。参照: docs/spec.md 8.0節
  disabled?: boolean;
  onPlay: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function PlaybackControls({
  status,
  disabled = false,
  onPlay,
  onStop,
  onNext,
  onPrev,
}: PlaybackControlsProps) {
  const isStopped = status === "stopped";

  return (
    <div className="playback-controls">
      <button type="button" onClick={onPrev} disabled={disabled}>
        前へ
      </button>
      <button
        type="button"
        className="button--primary"
        onClick={onPlay}
        disabled={disabled || !isStopped}
      >
        再生
      </button>
      <button
        type="button"
        className="button--primary"
        onClick={onStop}
        disabled={disabled || isStopped}
      >
        停止
      </button>
      <button type="button" onClick={onNext} disabled={disabled}>
        次へ
      </button>
    </div>
  );
}
