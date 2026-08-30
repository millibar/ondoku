# screens/

画面コンポーネント。データはpropsで受け取り、IO（認証・Drive通信・DB操作）は呼び出し元（`App.tsx`）に委ねる設計にしている。

- `LoginScreen.tsx`: ログイン画面
- `SetupScreen.tsx`: 初回セットアップ（Driveフォルダ設定）
- `ContentSelectionScreen.tsx`: 英文選択画面（タブ2。カテゴリ見出し・練習対象チェックボックス・絞り込み）
- `PracticeScreen.tsx`: 練習画面（タブ1・初期表示）
- `PracticeHistoryScreen.tsx`: 練習履歴画面（タブ3。ストリーク・7日間棒グラフ・196日ヒートマップ・全英文グリッド）
- `SettingsScreen.tsx`: 設定画面（英文選択画面から開くサブ画面。タブには含まない）

`App.tsx`側での実際の配線（下部タブナビゲーション・Google認証・IndexedDB/Driveとのデータの出し入れ・音声再生エンジン）はWP10で実装済み。

参照: [docs/implementation-plan.md](../../docs/implementation-plan.md) WP7〜WP10、[docs/spec.md](../../docs/spec.md) 4章
