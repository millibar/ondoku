// 頻度グリッドの色区分計算。参照: docs/spec.md 9.3節

// 0=無色、1〜4=練習回数が多いほど濃い色
export type FrequencyLevel = 0 | 1 | 2 | 3 | 4;

// 区分の閾値（累積カウントがこの値以下ならそのレベル）
const THRESHOLDS: { max: number; level: FrequencyLevel }[] = [
  { max: 0, level: 0 },
  { max: 2, level: 1 },
  { max: 5, level: 2 },
  { max: 10, level: 3 },
];
const MAX_LEVEL: FrequencyLevel = 4;

export function frequencyLevel(practiceCount: number): FrequencyLevel {
  const found = THRESHOLDS.find((t) => practiceCount <= t.max);
  return found ? found.level : MAX_LEVEL;
}
