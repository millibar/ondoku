// Service WorkerのCache Storage・登録を完全にクリアし、最新のアプリシェル
// （JS/CSS/HTML等）を取得し直すための強制リフレッシュ。参照: docs/spec.md 4.2.1節
//
// IndexedDB（教材データ・練習履歴）・localStorage（Drive設定・練習状態）は
// Cache Storageとは別の仕組みのため、ここでは一切操作しない

export async function refreshAppCache(): Promise<void> {
  if (window.caches) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if (navigator.serviceWorker) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  window.location.reload();
}
