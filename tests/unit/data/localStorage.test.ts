import { beforeEach, describe, expect, it } from "vitest";
import {
  getDriveSettings,
  getPracticeSessionState,
  saveDriveSettings,
  savePracticeSessionState,
} from "../../../src/data/localStorage";

// 参照: docs/test-plan.md 4.6節

beforeEach(() => {
  localStorage.clear();
});

describe("PracticeSessionState", () => {
  it("保存・復元で往復してもオブジェクトが一致する", () => {
    const state = {
      practiceMode: "repeating" as const,
      orderSettings: { isRandom: true, isRepeatOne: false },
      filter: { categoryId: "01", favoritesOnly: false },
      currentContentId: 42,
      shuffledHistory: [1, 2, 3],
    };

    savePracticeSessionState(state);

    expect(getPracticeSessionState()).toEqual(state);
  });

  it("値が存在しない場合はnullを返す", () => {
    expect(getPracticeSessionState()).toBeNull();
  });

  it("不正なJSONが入っていた場合はクラッシュせずnullを返す", () => {
    localStorage.setItem("ondoku:practiceSessionState", "{not valid json");
    expect(getPracticeSessionState()).toBeNull();
  });
});

describe("DriveSettings", () => {
  it("保存・復元で往復してもオブジェクトが一致する", () => {
    const settings = { rootFolderId: "folder-123" };

    saveDriveSettings(settings);

    expect(getDriveSettings()).toEqual(settings);
  });

  it("値が存在しない場合はnullを返す", () => {
    expect(getDriveSettings()).toBeNull();
  });

  it("不正なJSONが入っていた場合はクラッシュせずnullを返す", () => {
    localStorage.setItem("ondoku:driveSettings", "{not valid json");
    expect(getDriveSettings()).toBeNull();
  });
});
