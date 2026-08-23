# data/

データ永続化・外部連携層。WP2で実装する。

- `db.ts`: IndexedDBラッパー（仕様書5.2節）
- `localStorage.ts`: localStorageラッパー（仕様書5.3節）
- `driveClient.ts`: Google Drive API連携（仕様書7章）

参照: [docs/implementation-plan.md](../../docs/implementation-plan.md) WP2、[docs/test-plan.md](../../docs/test-plan.md) 4章
