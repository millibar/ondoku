import type { PlaybackStatus } from "../domain/playback";

// 再生コントロール（再生／停止／次へ／前へ／お気に入り）。参照: docs/spec.md 5.3.1節

export interface PlaybackControlsProps {
  status: PlaybackStatus;
  isFavorite: boolean;
  onPlay: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFavorite: () => void;
}

export function PlaybackControls({
  status,
  isFavorite,
  onPlay,
  onStop,
  onNext,
  onPrev,
  onToggleFavorite,
}: PlaybackControlsProps) {
  const isStopped = status === "stopped";

  return (
    <div className="playback-controls">
      <button type="button" onClick={onPrev}>
        前へ
      </button>
      <button type="button" onClick={onPlay} disabled={!isStopped}>
        再生
      </button>
      <button type="button" onClick={onStop} disabled={isStopped}>
        停止
      </button>
      <button type="button" onClick={onNext}>
        次へ
      </button>
      <button type="button" onClick={onToggleFavorite} aria-pressed={isFavorite}>
        {isFavorite ? "お気に入りから解除" : "お気に入りに追加"}
      </button>
    </div>
  );
}
