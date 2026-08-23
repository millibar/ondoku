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

// 日次練習ログ（連続学習日数の算出用、IndexedDB）
export interface DailyLog {
  date: string; // "YYYY-MM-DD"（ローカルタイムゾーン基準）
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

// 練習中の一時状態（localStorage）
export interface PracticeSessionState {
  practiceMode: PracticeMode;
  orderSettings: OrderSettings;
  filter: {
    categoryId: string | null; // nullは絞り込みなし
    favoritesOnly: boolean;
  };
  currentContentId: number;
  shuffledHistory?: number[]; // isRandom=trueのときにこのセッションで再生したcontentIdの履歴
}

// Drive接続設定（localStorage）
export interface DriveSettings {
  rootFolderId: string;
}
