# data/

データ永続化・外部連携層。

- `db.ts`: IndexedDBラッパー（仕様書5.2節）✅ WP2で実装済み
- `localStorage.ts`: localStorageラッパー（仕様書5.3節）✅ WP2で実装済み
- `driveClient.ts`: Google Drive API連携（仕様書7章）✅ WP2で実装済み

参照: [docs/implementation-plan.md](../../docs/implementation-plan.md) WP2、[docs/test-plan.md](../../docs/test-plan.md) 4章
