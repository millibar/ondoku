# domain/

UIに依存しないドメインロジック（純粋関数）を置く。WP1で実装する。

- `tsv.ts`: TSVパーサー（仕様書6章）
- `playback/`: 再生状態遷移・進行ロジック（仕様書8章）
- `streak.ts`: 連続学習日数の計算（仕様書9.2節）
- `grid.ts`: 頻度グリッドの色区分計算（仕様書9.3節）
- `sync.ts`: 同期処理のロジック（仕様書7.4節）

参照: [docs/implementation-plan.md](../../docs/implementation-plan.md) WP1、[docs/test-plan.md](../../docs/test-plan.md) 4章
