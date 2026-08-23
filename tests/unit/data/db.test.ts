import { beforeEach, describe, expect, it } from "vitest";
import {
  getAllContents,
  getAllDailyLogs,
  getAllPracticeRecords,
  getAudioBlob,
  getContent,
  getPracticeRecord,
  hasAudioBlob,
  incrementPracticeCount,
  saveAudioBlob,
  setFavorite,
  upsertContents,
  upsertDailyLog,
} from "../../../src/data/db";

// 参照: docs/test-plan.md 4.5節

beforeEach(async () => {
  await indexedDB.deleteDatabase("ondoku-db");
});

const sampleContent = {
  id: 1,
  categoryId: "01",
  englishText: "Hello world.",
  japaneseText: "こんにちは世界。",
  audioFileName: "001.opus",
};

describe("contentsストア", () => {
  it("アップサートした内容を全件取得できる", async () => {
    await upsertContents([sampleContent]);
    expect(await getAllContents()).toEqual([sampleContent]);
  });

  it("IDを指定して1件取得できる", async () => {
    await upsertContents([sampleContent]);
    expect(await getContent(1)).toEqual(sampleContent);
  });

  it("存在しないIDを指定するとundefinedを返す", async () => {
    expect(await getContent(999)).toBeUndefined();
  });

  it("同じIDで再度アップサートすると上書きされる", async () => {
    await upsertContents([sampleContent]);
    const updated = { ...sampleContent, englishText: "Updated." };
    await upsertContents([updated]);
    expect(await getAllContents()).toEqual([updated]);
  });
});

describe("practiceRecordsストア", () => {
  it("初回incrementPracticeCount（repeating）でレコードが作成され、repeatingCountが1になる", async () => {
    const record = await incrementPracticeCount(1, "repeating", "2026-08-23T10:00:00.000Z");
    expect(record).toEqual({
      contentId: 1,
      repeatingCount: 1,
      shadowingCount: 0,
      lastPracticedAt: "2026-08-23T10:00:00.000Z",
      isFavorite: false,
    });
  });

  it("repeatingCountとshadowingCountはそれぞれ独立してカウントされる", async () => {
    await incrementPracticeCount(1, "repeating", "2026-08-23T10:00:00.000Z");
    await incrementPracticeCount(1, "repeating", "2026-08-23T10:01:00.000Z");
    const record = await incrementPracticeCount(1, "shadowing", "2026-08-23T10:02:00.000Z");
    expect(record.repeatingCount).toBe(2);
    expect(record.shadowingCount).toBe(1);
    expect(record.lastPracticedAt).toBe("2026-08-23T10:02:00.000Z");
  });

  it("お気に入りフラグを更新できる", async () => {
    await incrementPracticeCount(1, "repeating", "2026-08-23T10:00:00.000Z");
    await setFavorite(1, true);
    const record = await getPracticeRecord(1);
    expect(record?.isFavorite).toBe(true);
  });

  it("setFavoriteは既存レコードが無くても新規作成する", async () => {
    await setFavorite(5, true);
    const record = await getPracticeRecord(5);
    expect(record).toEqual({
      contentId: 5,
      repeatingCount: 0,
      shadowingCount: 0,
      lastPracticedAt: "",
      isFavorite: true,
    });
  });

  it("全件取得できる", async () => {
    await incrementPracticeCount(1, "repeating", "2026-08-23T10:00:00.000Z");
    await incrementPracticeCount(2, "shadowing", "2026-08-23T10:00:00.000Z");
    const records = await getAllPracticeRecords();
    expect(records).toHaveLength(2);
  });
});

describe("dailyLogsストア", () => {
  it("同じ日付で複数回Upsertしても1件のまま", async () => {
    await upsertDailyLog("2026-08-23");
    await upsertDailyLog("2026-08-23");
    const logs = await getAllDailyLogs();
    expect(logs).toEqual([{ date: "2026-08-23" }]);
  });

  it("異なる日付は別レコードとして保存される", async () => {
    await upsertDailyLog("2026-08-22");
    await upsertDailyLog("2026-08-23");
    const logs = await getAllDailyLogs();
    expect(logs.map((l) => l.date).sort()).toEqual(["2026-08-22", "2026-08-23"]);
  });
});

describe("audioBlobsストア", () => {
  it("保存したBlobを取得できる", async () => {
    const blob = new Blob(["dummy audio data"], { type: "audio/mpeg" });
    await saveAudioBlob({
      contentId: 1,
      blob,
      mimeType: "audio/mpeg",
      cachedAt: "2026-08-23T10:00:00.000Z",
    });

    const entry = await getAudioBlob(1);
    expect(entry?.contentId).toBe(1);
    expect(entry?.mimeType).toBe("audio/mpeg");
  });

  it("存在チェックができる", async () => {
    expect(await hasAudioBlob(1)).toBe(false);
    const blob = new Blob(["dummy"], { type: "audio/mpeg" });
    await saveAudioBlob({
      contentId: 1,
      blob,
      mimeType: "audio/mpeg",
      cachedAt: "2026-08-23T10:00:00.000Z",
    });
    expect(await hasAudioBlob(1)).toBe(true);
  });
});
