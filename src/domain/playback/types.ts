import type { OrderSettings, PracticeMode } from "../../types";

// 再生状態遷移・進行ロジックの型定義。参照: docs/spec.md 8章

export type PlaybackStatus = "stopped" | "playing" | "waiting";

export interface PlaybackState {
  status: PlaybackStatus;
  currentContentId: number;
  // 現在のラウンドの出題順（順次再生ならplaylistそのもの、ランダム再生なら
  // シャッフル済みの並び）。1ラウンド（出題範囲の全件）を出題し終えると、
  // ランダム再生の場合のみ再シャッフルして次のラウンドに入る。
  // 参照: docs/spec.md 8.2節・8.3節
  playOrder: number[];
  // playOrder内での現在位置（0始まり）。表示上の「n/総数」は roundPosition + 1
  roundPosition: number;
  // playOrderがisRandom=true（ランダム再生）用に構築されたものかどうか。
  // isRandomの切り替えを検知してplayOrderを再構築するために使う
  isRandomOrder: boolean;
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
