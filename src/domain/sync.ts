import { saveAudioBlob, upsertContents } from "../data/db";
import {
  downloadFileBinary,
  downloadFileText,
  mimeTypeForFileName,
  resolveAudioFiles,
  resolveDriveLayout,
} from "../data/driveClient";
import { parseTsv, type TsvParseError } from "./tsv";

// 同期処理（一括ダウンロード・進捗通知）。参照: docs/spec.md 7.4節

export interface SyncProgress {
  totalCount: number;
  completedCount: number;
}

export interface SyncResult {
  contentCount: number;
  audioFailures: number[]; // 取得できなかったコンテンツのID一覧
  tsvParseErrors: TsvParseError[];
}

export interface SyncOptions {
  rootFolderId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
  onProgress?: (progress: SyncProgress) => void;
  // 音声キャッシュのタイムスタンプ生成（テスト時に固定値を注入できるようにする）
  now?: () => string;
}

// TSV自体の取得・パースに失敗するなど、同期処理を続行できない場合に投げるエラー
export class SyncAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncAbortError";
  }
}

export async function syncFromDrive(options: SyncOptions): Promise<SyncResult> {
  const {
    rootFolderId,
    accessToken,
    fetchImpl = fetch,
    onProgress,
    now = () => new Date().toISOString(),
  } = options;

  const layout = await resolveDriveLayout(rootFolderId, accessToken, fetchImpl);
  if (!layout.tsvFile) {
    throw new SyncAbortError("Google Drive上にTSVファイルが見つかりません");
  }

  let tsvText: string;
  try {
    tsvText = await downloadFileText(layout.tsvFile.id, accessToken, fetchImpl);
  } catch (error) {
    throw new SyncAbortError(`TSVファイルの取得に失敗しました: ${(error as Error).message}`);
  }

  const { contents, errors: tsvParseErrors } = parseTsv(tsvText);
  if (contents.length === 0) {
    throw new SyncAbortError("TSVから有効なコンテンツを1件も読み取れませんでした");
  }

  await upsertContents(contents);

  const { resolved, missing } = resolveAudioFiles(contents, layout.audioFilesByName);
  const audioFailures: number[] = [...missing];

  const totalCount = contents.length;
  let completedCount = 0;
  onProgress?.({ totalCount, completedCount });

  for (const content of contents) {
    const file = resolved.get(content.id);
    if (file) {
      try {
        const binary = await downloadFileBinary(file.id, accessToken, fetchImpl);
        const mimeType = mimeTypeForFileName(content.audioFileName);
        await saveAudioBlob({
          contentId: content.id,
          blob: new Blob([binary], { type: mimeType }),
          mimeType,
          cachedAt: now(),
        });
      } catch {
        audioFailures.push(content.id);
      }
    }
    completedCount++;
    onProgress?.({ totalCount, completedCount });
  }

  return { contentCount: contents.length, audioFailures, tsvParseErrors };
}
