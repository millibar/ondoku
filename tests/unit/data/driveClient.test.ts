import { describe, expect, it, vi } from "vitest";
import {
  DriveApiError,
  downloadFileText,
  listFilesInFolder,
  mimeTypeForFileName,
  resolveAudioFiles,
  resolveDriveLayout,
} from "../../../src/data/driveClient";

// 参照: docs/test-plan.md 4.7節、docs/spec.md 7章

const FOLDER_MIME = "application/vnd.google-apps.folder";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("mimeTypeForFileName", () => {
  it.each([
    ["001.opus", "audio/ogg; codecs=opus"],
    ["001.mp3", "audio/mpeg"],
    ["001.m4a", "audio/mp4"],
    ["001.wav", "audio/wav"],
    ["001.xyz", "application/octet-stream"],
  ])("%sのMIMEタイプは%s", (fileName, expected) => {
    expect(mimeTypeForFileName(fileName)).toBe(expected);
  });
});

describe("listFilesInFolder", () => {
  it("ファイル一覧を取得できる", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ files: [{ id: "f1", name: "001.opus", mimeType: "audio/ogg" }] }),
      );
    const files = await listFilesInFolder("root", "token", fetchImpl);
    expect(files).toEqual([{ id: "f1", name: "001.opus", mimeType: "audio/ogg" }]);
  });

  it("認証エラー（401）発生時、DriveApiErrorとして上位に通知される", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 401));
    await expect(listFilesInFolder("root", "token", fetchImpl)).rejects.toThrow(DriveApiError);
  });
});

describe("resolveDriveLayout", () => {
  it("ルート直下のみにTSV・音声がある場合に正しく解決できる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        files: [
          { id: "tsv1", name: "contents.tsv", mimeType: "text/tab-separated-values" },
          { id: "a1", name: "001.opus", mimeType: "audio/ogg" },
          { id: "a2", name: "002.opus", mimeType: "audio/ogg" },
        ],
      }),
    );

    const result = await resolveDriveLayout("root", "token", fetchImpl);

    expect(result.tsvFile).toEqual({
      id: "tsv1",
      name: "contents.tsv",
      mimeType: "text/tab-separated-values",
    });
    expect(result.audioFilesByName.get("001.opus")).toEqual({
      id: "a1",
      name: "001.opus",
      mimeType: "audio/ogg",
    });
    expect(result.audioFilesByName.get("002.opus")).toBeDefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("直下サブフォルダに音声がある場合も、1階層再帰探索で解決できる", async () => {
    const fetchImpl = vi
      .fn()
      // 1回目: ルート直下（TSV + サブフォルダ）
      .mockResolvedValueOnce(
        jsonResponse({
          files: [
            { id: "tsv1", name: "contents.tsv", mimeType: "text/tab-separated-values" },
            { id: "sub1", name: "audio", mimeType: FOLDER_MIME },
          ],
        }),
      )
      // 2回目: サブフォルダ直下（音声ファイル）
      .mockResolvedValueOnce(
        jsonResponse({
          files: [{ id: "a1", name: "001.opus", mimeType: "audio/ogg" }],
        }),
      );

    const result = await resolveDriveLayout("root", "token", fetchImpl);

    expect(result.tsvFile?.id).toBe("tsv1");
    expect(result.audioFilesByName.get("001.opus")?.id).toBe("a1");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("resolveAudioFiles", () => {
  it("TSVのaudioFileNameと一致しないコンテンツはmissingとして記録され、処理全体は継続する", () => {
    const contents = [
      { id: 1, categoryId: "01", englishText: "a", japaneseText: "あ", audioFileName: "001.opus" },
      {
        id: 2,
        categoryId: "01",
        englishText: "b",
        japaneseText: "い",
        audioFileName: "missing.opus",
      },
    ];
    const audioFilesByName = new Map([
      ["001.opus", { id: "a1", name: "001.opus", mimeType: "audio/ogg" }],
    ]);

    const result = resolveAudioFiles(contents, audioFilesByName);

    expect(result.resolved.get(1)?.id).toBe("a1");
    expect(result.resolved.has(2)).toBe(false);
    expect(result.missing).toEqual([2]);
  });
});

describe("downloadFileText", () => {
  it("ファイル内容をテキストとして取得できる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "id\tcategoryId\n1\t01",
    } as Response);
    const text = await downloadFileText("file1", "token", fetchImpl);
    expect(text).toBe("id\tcategoryId\n1\t01");
  });

  it("認証エラー（401）発生時、DriveApiErrorとして上位に通知される", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 401));
    await expect(downloadFileText("file1", "token", fetchImpl)).rejects.toThrow(DriveApiError);
  });
});
