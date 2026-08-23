# screens/

画面コンポーネント。データはpropsで受け取り、IO（認証・Drive通信・DB操作）は呼び出し元（`App.tsx`）に委ねる設計にしている。

- `LoginScreen.tsx`: ログイン画面 ✅ WP3.5で追加・実装済み
- `SetupScreen.tsx`: 初回セットアップ（Driveフォルダ設定）✅ WP3で実装済み
- `ContentListScreen.tsx`: コンテンツ一覧・絞り込み・頻度グリッド ✅ WP3で実装済み
- `PracticeScreen.tsx`: 練習画面 ✅ WP3で実装済み
- `SettingsScreen.tsx`: 設定画面 ✅ WP3で実装済み

`App.tsx`側での実際の配線（画面遷移・Google認証・IndexedDB/Driveとのデータの出し入れ・音声再生エンジン）はWP3.5で実装済み。

参照: [docs/implementation-plan.md](../../docs/implementation-plan.md) WP3・WP3.5、[docs/spec.md](../../docs/spec.md) 4章
