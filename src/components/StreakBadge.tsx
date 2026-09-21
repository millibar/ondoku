// 連続学習日数のバッジ（「n-Day Streak」）。練習画面・練習履歴画面のヘッダー左上に共通で置く。
// 参照: docs/spec.md 4.1節・4.3節

export interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  return <p className="streak-badge">{streak}-Day Streak</p>;
}
