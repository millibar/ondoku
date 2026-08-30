import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshAppCache } from "../../../src/data/serviceWorker";

// 参照: docs/spec.md 4.2.1節・10章（設定画面の「キャッシュを更新」ボタン）
//
// Cache Storage・Service Worker登録を削除して最新のアプリシェルを取得し直す。
// IndexedDB・localStorage（教材データ・練習履歴・設定）はここでは一切操作しない。

describe("refreshAppCache", () => {
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reloadMock = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Cache StorageのキーをすべてdeleteしてからService Workerの登録をすべてunregisterし、最後に再読み込みする", async () => {
    const cacheDelete = vi.fn().mockResolvedValue(true);
    const cachesKeys = vi.fn().mockResolvedValue(["workbox-precache-v1", "workbox-runtime"]);
    vi.stubGlobal("caches", { keys: cachesKeys, delete: cacheDelete });

    const unregister1 = vi.fn().mockResolvedValue(true);
    const unregister2 = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi
      .fn()
      .mockResolvedValue([{ unregister: unregister1 }, { unregister: unregister2 }]);
    vi.stubGlobal("navigator", { ...navigator, serviceWorker: { getRegistrations } });

    await refreshAppCache();

    expect(cacheDelete).toHaveBeenCalledWith("workbox-precache-v1");
    expect(cacheDelete).toHaveBeenCalledWith("workbox-runtime");
    expect(unregister1).toHaveBeenCalledTimes(1);
    expect(unregister2).toHaveBeenCalledTimes(1);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("Cache Storage・Service Workerが利用できない環境でもクラッシュせず再読み込みする", async () => {
    vi.stubGlobal("caches", undefined);
    vi.stubGlobal("navigator", { ...navigator, serviceWorker: undefined });

    await expect(refreshAppCache()).resolves.toBeUndefined();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
