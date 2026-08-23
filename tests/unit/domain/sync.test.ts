import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncAbortError, syncFromDrive } from "../../../src/domain/sync";
import { getAllContents, getAudioBlob } from "../../../src/data/db";

// 参照: docs/test-plan.md 4.8節、docs/spec.md 7.4節

const TSV = [
  "id\tcategoryId\tenglishText\tjapaneseText\taudioFileName",
  "1\t01\tHello world.\tこんにちは世界。\t001.opus",
  "2\t01\tGood morning.\tおはよう。\t002.opus",
].join("\n");

function fileListResponse(files: { id: string; name: string; mimeType: string }[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ files }),
    text: async () => "",
    arrayBuffer: async () => new ArrayBuffer(0),
  } as Response;
}

function textResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => text,
    arrayBuffer: async () => new ArrayBuffer(0),
  } as Response;
}

function binaryResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => "",
    arrayBuffer: async () => new ArrayBuffer(8),
  } as Response;
}

const ROOT_FILES = [
  { id: "tsv1", name: "contents.tsv", mimeType: "text/tab-separated-values" },
  { id: "a1", name: "001.opus", mimeType: "audio/ogg" },
  { id: "a2", name: "002.opus", mimeType: "audio/ogg" },
];

beforeEach(async () => {
  await indexedDB.deleteDatabase("ondoku-db");
});

describe("syncFromDrive", () => {
  it("全件成功時、進捗コールバックが0%→100%まで正しく呼ばれ、コンテンツと音声が保存される", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fileListResponse(ROOT_FILES)) // resolveDriveLayout: ルート一覧
      .mockResolvedValueOnce(textResponse(TSV)) // TSVダウンロード
      .mockResolvedValueOnce(binaryResponse()) // content 1の音声
      .mockResolvedValueOnce(binaryResponse()); // content 2の音声

    const onProgress = vi.fn();
    const result = await syncFromDrive({
      rootFolderId: "root",
      accessToken: "token",
      fetchImpl,
      onProgress,
      now: () => "2026-08-23T10:00:00.000Z",
    });

    expect(result.contentCount).toBe(2);
    expect(result.audioFailures).toEqual([]);
    expect(result.tsvParseErrors).toEqual([]);

    expect(onProgress).toHaveBeenCalledWith({ totalCount: 2, completedCount: 0 });
    expect(onProgress).toHaveBeenLastCalledWith({ totalCount: 2, completedCount: 2 });

    expect(await getAllContents()).toHaveLength(2);
    expect(await getAudioBlob(1)).toBeDefined();
    expect(await getAudioBlob(2)).toBeDefined();
  });

  it("一部の音声ファイル取得に失敗した場合、失敗をスキップして残りを継続し、失敗件数を返す", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fileListResponse(ROOT_FILES))
      .mockResolvedValueOnce(textResponse(TSV))
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response) // content 1の音声取得に失敗
      .mockResolvedValueOnce(binaryResponse()); // content 2は成功

    const result = await syncFromDrive({
      rootFolderId: "root",
      accessToken: "token",
      fetchImpl,
      now: () => "2026-08-23T10:00:00.000Z",
    });

    expect(result.contentCount).toBe(2);
    expect(result.audioFailures).toEqual([1]);
    expect(await getAudioBlob(1)).toBeUndefined();
    expect(await getAudioBlob(2)).toBeDefined();
  });

  it("TSV自体の取得に失敗した場合、同期処理全体を中断しSyncAbortErrorを投げる", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fileListResponse(ROOT_FILES))
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response); // TSVダウンロード失敗

    await expect(
      syncFromDrive({ rootFolderId: "root", accessToken: "token", fetchImpl }),
    ).rejects.toThrow(SyncAbortError);

    expect(await getAllContents()).toEqual([]);
  });
});
