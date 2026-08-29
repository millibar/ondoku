import type { PlaybackStatus } from "../domain/playback";

// 手本音声の再生進行度／リピーティングモードの待機時間を表すプログレスバー。
// 参照: docs/spec.md 8.4節

export interface ProgressBarProps {
  status: PlaybackStatus;
  progress: number; // 0..1
}

export function ProgressBar({ status, progress }: ProgressBarProps) {
  const percent = Math.round(progress * 100);

  return (
    <div
      className="progress-bar"
      data-status={status}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="progress-bar__fill"
        // progress=0への巻き戻り（次のコンテンツへの遷移・停止）はCSSの
        // トランジションを無効化し、右から左に縮むアニメーションを見せず
        // 瞬時にリセットする。0より大きい間は通常どおりCSS側のトランジション
        // （.progress-bar__fill）に任せ、なめらかに伸びるようにする
        style={{ width: `${percent}%`, transition: percent === 0 ? "none" : undefined }}
      />
    </div>
  );
}
