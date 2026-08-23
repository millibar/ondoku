# domain/

UIに依存しないドメインロジック（純粋関数）を置く。

- `tsv.ts`: TSVパーサー（仕様書6章）✅ WP1で実装済み
- `playback/`: 再生状態遷移・進行ロジック（仕様書8章）✅ WP1で実装済み
- `streak.ts`: 連続学習日数の計算（仕様書9.2節）✅ WP1で実装済み
- `grid.ts`: 頻度グリッドの色区分計算（仕様書9.3節）✅ WP1で実装済み
- `sync.ts`: 同期処理のロジック（仕様書7.4節）✅ WP2で実装済み

参照: [docs/implementation-plan.md](../../docs/implementation-plan.md) WP1、[docs/test-plan.md](../../docs/test-plan.md) 4章
