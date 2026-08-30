// 型定義一式。参照: docs/spec.md 5.1節

// コンテンツ（TSV由来、IndexedDBにキャッシュ）
export interface Content {
  id: number; // 通し番号（1〜560）
  categoryId: string; // セクション番号
  englishText: string;
  japaneseText: string;
  audioFileName: string; // 拡張子込み（例: "001.opus"）
}

// 練習履歴（コンテンツごと、IndexedDB）
export interface PracticeRecord {
  contentId: number;
  repeatingCount: number; // リピーティングモードでの練習回数
  shadowingCount: number; // シャドーイングモードでの練習回数
  lastPracticedAt: string; // ISO 8601日時
  isFavorite: boolean;
}

// 日次練習ログ（連続学習日数の算出、練習履歴画面の7日間棒グラフ・日別ヒートマップ用、IndexedDB）
export interface DailyLog {
  date: string; // "YYYY-MM-DD"（ローカルタイムゾーン基準）
  repeatingCount: number; // その日のリピーティングモードでの再生完了回数
  shadowingCount: number; // その日のシャドーイングモードでの再生完了回数
}

// 音声キャッシュ（IndexedDB、Blobとして保持）
export interface AudioCacheEntry {
  contentId: number;
  blob: Blob;
  mimeType: string;
  cachedAt: string;
}

// 練習モード関連の型
export type PracticeMode = "repeating" | "shadowing";

// 出題順序は排他的なenumではなく、独立した2つのON/OFFスイッチで表現する
export interface OrderSettings {
  isRandom: boolean; // OFF=順次再生、ON=ランダム再生
  isRepeatOne: boolean; // OFF=自動で次に進む、ON=1リピート再生（自動では進まない）
}

// 練習中の一時状態（localStorage）。練習セッション固有の状態のみを持つ
// （出題範囲の選択状態はSelectionStateとして別に管理する。参照: docs/spec.md 5.1節）
export interface PracticeSessionState {
  practiceMode: PracticeMode;
  orderSettings: OrderSettings;
  currentContentId: number;
}

// 出題範囲の選択状態（localStorage）。英文選択画面・練習画面の両方から参照・更新する
export interface SelectionState {
  selectedContentIds: number[]; // 英文選択画面の「練習対象」チェックボックスでONの英文ID一覧（＝出題範囲）
  favoritesOnly: boolean; // 練習画面の「お気に入りのみ表示」チェックボックスの状態
}

// Drive接続設定（localStorage）
export interface DriveSettings {
  rootFolderId: string;
}
