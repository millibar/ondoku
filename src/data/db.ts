import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AudioCacheEntry, Content, DailyLog, PracticeMode, PracticeRecord } from "../types";

// IndexedDBラッパー。参照: docs/spec.md 5.2節

const DB_NAME = "ondoku-db";
const DB_VERSION = 1;

interface OndokuDBSchema extends DBSchema {
  contents: { key: number; value: Content };
  practiceRecords: { key: number; value: PracticeRecord };
  dailyLogs: { key: string; value: DailyLog };
  audioBlobs: { key: number; value: AudioCacheEntry };
}

function openOndokuDb(): Promise<IDBPDatabase<OndokuDBSchema>> {
  return openDB<OndokuDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("contents", { keyPath: "id" });
      db.createObjectStore("practiceRecords", { keyPath: "contentId" });
      db.createObjectStore("dailyLogs", { keyPath: "date" });
      db.createObjectStore("audioBlobs", { keyPath: "contentId" });
    },
  });
}

// 呼び出しごとに接続を開き、処理後は必ずクローズする（接続リーク防止）
async function withDb<T>(fn: (db: IDBPDatabase<OndokuDBSchema>) => Promise<T>): Promise<T> {
  const db = await openOndokuDb();
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

// --- contents ---

export function upsertContents(contents: Content[]): Promise<void> {
  return withDb(async (db) => {
    const tx = db.transaction("contents", "readwrite");
    await Promise.all(contents.map((content) => tx.store.put(content)));
    await tx.done;
  });
}

export function getAllContents(): Promise<Content[]> {
  return withDb((db) => db.getAll("contents"));
}

export function getContent(id: number): Promise<Content | undefined> {
  return withDb((db) => db.get("contents", id));
}

// --- practiceRecords ---

function emptyPracticeRecord(contentId: number): PracticeRecord {
  return {
    contentId,
    repeatingCount: 0,
    shadowingCount: 0,
    lastPracticedAt: "",
    isFavorite: false,
  };
}

export function getPracticeRecord(contentId: number): Promise<PracticeRecord | undefined> {
  return withDb((db) => db.get("practiceRecords", contentId));
}

export function getAllPracticeRecords(): Promise<PracticeRecord[]> {
  return withDb((db) => db.getAll("practiceRecords"));
}

export function incrementPracticeCount(
  contentId: number,
  mode: PracticeMode,
  practicedAt: string,
): Promise<PracticeRecord> {
  return withDb(async (db) => {
    const existing = (await db.get("practiceRecords", contentId)) ?? emptyPracticeRecord(contentId);
    const updated: PracticeRecord = {
      ...existing,
      repeatingCount: existing.repeatingCount + (mode === "repeating" ? 1 : 0),
      shadowingCount: existing.shadowingCount + (mode === "shadowing" ? 1 : 0),
      lastPracticedAt: practicedAt,
    };
    await db.put("practiceRecords", updated);
    return updated;
  });
}

export function setFavorite(contentId: number, isFavorite: boolean): Promise<void> {
  return withDb(async (db) => {
    const existing = (await db.get("practiceRecords", contentId)) ?? emptyPracticeRecord(contentId);
    await db.put("practiceRecords", { ...existing, isFavorite });
  });
}

// --- dailyLogs ---

export function upsertDailyLog(date: string): Promise<void> {
  return withDb(async (db) => {
    await db.put("dailyLogs", { date });
  });
}

export function getAllDailyLogs(): Promise<DailyLog[]> {
  return withDb((db) => db.getAll("dailyLogs"));
}

// --- audioBlobs ---

export function saveAudioBlob(entry: AudioCacheEntry): Promise<void> {
  return withDb(async (db) => {
    await db.put("audioBlobs", entry);
  });
}

export function getAudioBlob(contentId: number): Promise<AudioCacheEntry | undefined> {
  return withDb((db) => db.get("audioBlobs", contentId));
}

export function hasAudioBlob(contentId: number): Promise<boolean> {
  return withDb(async (db) => (await db.getKey("audioBlobs", contentId)) !== undefined);
}
