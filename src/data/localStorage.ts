import type { DriveSettings, PracticeSessionState, SelectionState } from "../types";

// localStorageラッパー。参照: docs/spec.md 5.3節

const KEYS = {
  driveSettings: "ondoku:driveSettings",
  practiceSessionState: "ondoku:practiceSessionState",
  selectionState: "ondoku:selectionState",
} as const;

function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getPracticeSessionState(): PracticeSessionState | null {
  return readJson<PracticeSessionState>(KEYS.practiceSessionState);
}

export function savePracticeSessionState(state: PracticeSessionState): void {
  writeJson(KEYS.practiceSessionState, state);
}

export function clearPracticeSessionState(): void {
  localStorage.removeItem(KEYS.practiceSessionState);
}

export function getSelectionState(): SelectionState | null {
  return readJson<SelectionState>(KEYS.selectionState);
}

export function saveSelectionState(state: SelectionState): void {
  writeJson(KEYS.selectionState, state);
}

export function getDriveSettings(): DriveSettings | null {
  return readJson<DriveSettings>(KEYS.driveSettings);
}

export function saveDriveSettings(settings: DriveSettings): void {
  writeJson(KEYS.driveSettings, settings);
}
