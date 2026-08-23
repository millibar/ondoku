import type { OrderSettings, PracticeMode } from "../../types";

// 再生状態遷移・進行ロジックの型定義。参照: docs/spec.md 8章

export type PlaybackStatus = "stopped" | "playing" | "waiting";

export interface PlaybackState {
  status: PlaybackStatus;
  currentContentId: number;
  // isRandom=trueのときにこのセッションで再生したcontentIdの履歴（「前へ」で1つ戻るために使用）
  history: number[];
}

export interface PlaybackContext {
  // 出題範囲（フィルタ後）のコンテンツID一覧。通し番号順（順次再生の基準順序）
  playlist: number[];
  practiceMode: PracticeMode;
  orderSettings: OrderSettings;
}

export type PlaybackEvent =
  | { type: "PLAY" }
  | { type: "AUDIO_ENDED" }
  | { type: "WAIT_ENDED" }
  | { type: "STOP" }
  | { type: "NEXT" }
  | { type: "PREV" };
