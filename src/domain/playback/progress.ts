import type { PlaybackStatus } from "./types";

// プログレスバーの計算。参照: docs/spec.md 8.4節

export interface ProgressParams {
  currentTime?: number;
  duration?: number;
  waitElapsed?: number;
  waitDuration?: number;
}

export function calculateProgress(status: PlaybackStatus, params: ProgressParams): number {
  if (status === "playing") {
    return ratio(params.currentTime, params.duration);
  }
  if (status === "waiting") {
    return ratio(params.waitElapsed, params.waitDuration);
  }
  return 0;
}

function ratio(numerator = 0, denominator = 0): number {
  if (denominator <= 0) return 0;
  return Math.min(1, Math.max(0, numerator / denominator));
}
