import type { PlaybackStatus } from "../domain/playback";

// 再生コントロール（再生／停止／次へ／前へ）。参照: docs/spec.md 5.3.1節
// お気に入りボタンは通し番号と並べて練習画面側（PracticeScreen）で表示する
//
// ボタンのラベルは記号（＜ ▶ ■ ＞）で表示し、スクリーンリーダー向けの名前は
// aria-labelで英語（Previous／Play／Stop／Next）を付ける。
// ▶（U+25B6）は、環境によってはカラーの絵文字として描画されてしまうため、
// 異体字選択子（U+FE0E）を付けて文字（テキスト表示）として描画させる

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
      <button type="button" aria-label="Previous" onClick={onPrev} disabled={disabled}>
        ＜
      </button>
      <button
        type="button"
        className="button--primary"
        aria-label="Play"
        onClick={onPlay}
        disabled={disabled || !isStopped}
      >
        ▶&#xFE0E;
      </button>
      <button
        type="button"
        className="button--primary"
        aria-label="Stop"
        onClick={onStop}
        disabled={disabled || isStopped}
      >
        ■
      </button>
      <button type="button" aria-label="Next" onClick={onNext} disabled={disabled}>
        ＞
      </button>
    </div>
  );
}
