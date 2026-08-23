# 英語音読練習PWA 実装計画書

- 作成日: 2026-08-23
- 前提: [docs/requirements.md](./requirements.md)、[docs/spec.md](./spec.md)

## 1. 開発の進め方（Git運用ルールの再掲）

`.claude/CLAUDE.md`に定めた通り、以下のルールで進める。

1. 実装に入る際は、必ず`main`ブランチから新しいブランチを作成する（`main`への直接コミットはしない）
2. 作業単位（後述のフェーズ／作業パッケージ）ごとにブランチを分ける
3. 実装後は単体テスト（Vitest）・可能な範囲でE2Eテスト（Playwright）を実行し、すべて通過することを確認する
4. テスト通過後、`main`へのマージ前に必ずユーザーの承認を得る（無断でマージしない）
5. 承認後、`main`にマージする（マージ方法はユーザーの指示に従う。特に指定がなければPRを作成し、承認後にマージする）

## 2. ユーザー側で事前に準備いただく事項（実装着手前の前提）

以下はブラウザでの対話的操作が必要、またはユーザーの秘密情報に関わるため、実装者（Claude Code）側では代行できない。着手前にご準備をお願いする。

| #   | 内容                                                                                             | 状況                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 1   | GitHubリポジトリの作成（`ondoku`、public）                                                       | ✅ 完了（2026-08-23、`gh repo create`で作成・push済み。 https://github.com/millibar/ondoku ）                 |
| 2   | Google Cloud ConsoleでOAuthクライアントID（Webアプリケーション種別）を作成                       | ✅ 完了（2026-08-23）。詳細は仕様書7.1節を参照                                                                |
| 2a  | ├ Google Drive APIの有効化（APIとサービス > ライブラリ）                                         | ✅ 完了（2026-08-23）。`drive.googleapis.com`、ステータス: 有効                                               |
| 2b  | └ OAuth同意画面へのテストユーザー登録（`millibarjp@gmail.com`）                                  | ✅ 完了（2026-08-23）。公開ステータス: テスト中、ユーザーの種類: 外部、テストユーザー: `millibarjp@gmail.com` |
| 3   | Google Drive上でTSVファイル・音声ファイル（560件）を格納するフォルダを用意し、フォルダIDを控える | 未着手                                                                                                        |
| 4   | （任意）GitHub PagesでのPWA公開設定                                                              | 未着手（Settings > Pages で`gh-pages`ブランチ or GitHub Actions経由の公開を有効化。デプロイ自動化は5章参照）  |

## 3. 技術基盤・依存パッケージ

仕様書1章の技術スタックに基づき、以下を導入する。

- `react`, `react-dom`
- `typescript`, `vite`, `@vitejs/plugin-react`
- `vite-plugin-pwa`
- `idb`（IndexedDBラッパー）
- `vitest`, `@testing-library/react`, `jsdom`
- `@playwright/test`（devcontainerにブラウザ導入済み）
- `eslint`, `prettier`, 関連プラグイン一式

**状態管理**: 追加ライブラリ（Redux/Zustand等）は導入せず、React標準の`Context` + `useReducer`で実装する（画面数・状態の複雑さから見て過剰と判断。将来的に複雑化した場合は再検討）。

**設定値の保持**: Google OAuthクライアントIDは秘匿情報ではないため、`src/config.ts`に定数として定義する（Viteの環境変数越しにする案も検討したが、ビルド構成をシンプルに保つため定数管理とする）。Driveの「ルートフォルダID」はユーザーごとに異なる個人情報のため、コードには含めず、初回セットアップ画面から`localStorage`に保存する（仕様書7.2節）。

## 4. 作業パッケージ（ブランチ単位）

依存関係を考慮した順序で並べる。各パッケージは1つの作業ブランチに対応する想定（`feature/xxx`）。パッケージ内の粒度が大きい場合はさらに分割してよい。

### WP0: プロジェクト初期セットアップ（`feature/project-setup`）

- `git init`、`.gitignore`作成
- Vite + React + TypeScriptプロジェクトの雛形作成
- ESLint / Prettier設定
- Vitest設定（`vitest.config.ts`、サンプルテスト1件で疎通確認）
- Playwright設定（`playwright.config.ts`、サンプルE2Eテスト1件で疎通確認）
- `vite-plugin-pwa`導入（`manifest.webmanifest`は仮設定でよい）
- Vite `base`をリポジトリ名に合わせて設定
- GitHub Actions: PR時に`lint` / `test`（Vitest）/ `build`を実行するCIワークフロー
- **完了条件**: `npm run dev`でひな形画面が表示できる、`npm run test`（Vitest）・`npm run build`・サンプルPlaywrightテストがいずれも成功する
- **状況**: ✅ 完了（2026-08-23、`feature/project-setup`ブランチ）。`npm run lint` / `npm run format:check` / `npm run test` / `npm run build` / `npm run test:e2e` すべて成功を確認済み。`main`へのマージはユーザー承認待ち

### WP1: ドメインロジック（`feature/domain-logic`）

UIに依存しない純粋関数群。テスト計画書フェーズで先にテストケースを設計し、テストコード作成後に実装する想定（5章「テスト計画書作成」以降のフェーズに対応）。

- 型定義一式（`src/types/index.ts`）
- TSVパーサー（`src/domain/tsv.ts`）
- 再生状態遷移・進行ロジック（`src/domain/playback/`）— 仕様書8章の状態機械
- ストリーク計算（`src/domain/streak.ts`）— 仕様書9.2節
- 頻度グリッドの色区分計算（`src/domain/grid.ts`）— 仕様書9.3節
- **完了条件**: 上記モジュールの単体テスト（Vitest）がすべて成功する
- **状況**: ✅ 完了（2026-08-23、`feature/domain-logic`ブランチ）。レッド・グリーン・リファクタリングで実装。単体テスト45件すべて成功、lint・buildも成功を確認済み。`main`へのマージはユーザー承認待ち

### WP2: データ層（`feature/data-layer`）

- IndexedDBラッパー（`src/data/db.ts`）— 仕様書5.2節のスキーマ（`contents` / `practiceRecords` / `dailyLogs` / `audioBlobs`）
- `localStorage`ラッパー（`src/data/localStorage.ts`）— 仕様書5.3節のキー
- Google認証（`src/auth/googleAuth.ts`）— GISトークン取得・サイレント再認証
- Google Driveクライアント（`src/data/driveClient.ts`）— 仕様書7章のフォルダ探索・ファイル取得・MIMEタイプ判定
- 同期処理（`src/domain/sync.ts`想定）— 仕様書7.4節の一括ダウンロード・進捗通知
- **完了条件**: IndexedDB / localStorageラッパーの単体テストが成功する（`fake-indexeddb`等でVitest上から検証）。Google認証・Driveクライアントは実APIに依存するため、フェッチ部分をモック化した単体テストで検証する
- **状況**: ✅ 完了（2026-08-23、`feature/data-layer`ブランチ）。レッド・グリーン・リファクタリングで実装（`domain/sync.ts`も含む）。単体テスト39件（累計83件）すべて成功、lint・buildも成功を確認済み。`main`へのマージはユーザー承認待ち

### WP3: 画面・UIコンポーネント（`feature/screens`）

- 共通コンポーネント: `ProgressBar` / `FrequencyGrid` / `PlaybackControls` / `ContentText`（英文・日本語訳のON/OFF表示） 等
- ルーティング（React Routerを想定。画面数が少ないため自前の簡易ルーティングでも可。実装時に決定）
- `SetupScreen`（初回セットアップ）
- `ContentListScreen`（一覧・絞り込み・頻度グリッド・ストリーク表示）
- `PracticeScreen`（再生コントロール・モード切り替え・お気に入り）
- `SettingsScreen`
- 練習状態の保存・復元（仕様書5.5節、`PracticeSessionState`との連携）
- **完了条件**: 各画面のコンポーネントテスト（Testing Library、主要な操作・表示分岐）が成功する
- **状況**: ✅ 完了（2026-08-23、`feature/screens`ブランチ）。共通コンポーネント4点・画面4点をレッド・グリーン・リファクタリングで実装。データはpropsで受け取り、IO（認証・Drive通信・DB操作）は呼び出し元に委ねる設計。単体テスト23件（累計122件）すべて成功、lint・buildも成功を確認済み。`main`へのマージはユーザー承認待ち
  - 「ルーティング」「練習状態の保存・復元」（`App.tsx`での実配線）は完了条件（画面単体のコンポーネントテスト）には含まれないため、WP3.5として切り出した（下記）

### WP3.5: 画面統合（`App.tsx`配線）

WP3で実装した画面・コンポーネントを、実際のGoogle認証・IndexedDB・Google Driveと結びつけ、アプリとして動作させる。

- 画面遷移（自前の簡易ルーティング。認証チェック→Drive設定チェック→一覧⇄練習⇄設定）
- Google認証（`auth/googleAuth.ts`）の実配線、サイレント再認証
- 一覧画面へのコンテンツ・練習履歴データの供給（`data/db.ts`）
- 練習画面の音声再生エンジン（`HTMLAudioElement`と`domain/playback`の状態機械を結びつける新規フック）
- 練習記録の保存（`db.incrementPracticeCount`等）
- 練習状態の保存・復元（`PracticeSessionState`、仕様書5.5節）
- **完了条件**: ローカル環境（`npm run dev`）で一連の操作が実際に行える。音声再生エンジンの単体テストはモック化した`HTMLAudioElement`で検証する
- **状況**: ✅ 完了（2026-08-23、`feature/screens`ブランチ継続）
  - `hooks/audioPlayer.ts`・`hooks/usePlaybackEngine.ts`: `AudioPlayer`抽象を挟むことでテスト容易性を確保し、レッド・グリーン・リファクタリングで実装（7テスト）
  - `screens/LoginScreen.tsx`: WP3で漏れていたログイン画面を追加（2テスト）
  - `App.tsx`: 画面遷移・Google認証・IndexedDBデータ供給・同期・音声再生エンジン・練習記録保存・練習状態の保存復元を配線。ルーティング骨格をモックで検証するテストを追加（3テスト）
  - `npm run dev`で実際に起動し、Playwright（`@playwright/test`のnode API）でスクリーンショット確認を実施
  - **手動確認で発見・修正した問題**: GISのサイレント再認証（`prompt: ''`）が、環境によってはコールバックが一切呼ばれずハングし「読み込み中...」から進まなくなることを実機確認で発見。5秒でタイムアウトしログイン画面へフォールバックする対策を追加（`App.tsx`の`SILENT_AUTH_TIMEOUT_MS`）
  - **既知の簡略化**: 練習状態の保存・復元（`PracticeSessionState`）は`practiceMode`・`orderSettings`・`currentContentId`のみ対応。出題範囲の絞り込み（カテゴリ／お気に入りフィルタ）はコンポーネント内ローカル状態のままで復元対象に含めていない（`ContentListScreen`の絞り込み状態をApp側に持ち上げる追加のリファクタリングが必要。将来対応）
  - 単体テスト合計134件すべて成功。lint・format・build・E2Eも成功を確認済み。`main`へのマージはユーザー承認待ち

### WP4: PWA仕上げ（`feature/pwa-finalize`）

- 本番用`manifest.webmanifest`（アイコン一式を`public/icons`に用意）
- Service Workerのプリキャッシュ対象・戦略の最終調整
- オフライン時の画面表示・エラーハンドリング（仕様書11章）
- GitHub Pagesへのビルド成果物デプロイ用GitHub Actionsワークフロー
- **完了条件**: ビルド成果物をローカルでホスティングし、Lighthouse等でPWA要件（インストール可能・オフライン起動）を満たすことを確認
- **状況**: ✅ 完了（2026-08-23、`feature/pwa-finalize`ブランチ）
  - PWAアイコン（192x192・512x512・512x512 maskable）をプレースホルダーとして生成し配置（`public/icons/`）。将来正式な素材に差し替え可能
  - `manifest.webmanifest`にアイコン・`description`・`lang: "ja"`・`theme_color`を設定
  - `favicon.svg`・`apple-touch-icon`もアイコンデザインに合わせて更新
  - Service Workerの`navigateFallback`を設定（従来`navigateFallbackDenylist`のみで`navigateFallback`自体が未設定という不備があったため修正）
  - **仕様との重要な差分の発見・修正**: オフライン時の挙動を実装中に、「認証に失敗すると常にログイン画面に飛ばされ、キャッシュ済みデータがあっても閲覧できない」という要件定義書3章・11章違反の実装になっていたことに気づき、`App.tsx`を「キャッシュ済みデータがあれば認証を待たずに一覧画面へ進む」設計に修正（WP3.5時点の実装の不備）
  - 「同期」ボタンのオフライン時エラー表示（`ContentListScreen`に`syncError`prop追加）
  - 音声再生エラー時に該当コンテンツをスキップする対応（`hooks/audioPlayer.ts`が`ended`/`error`両イベントを購読）
  - GitHub Actionsのデプロイワークフロー（`.github/workflows/deploy.yml`、`actions/deploy-pages`使用、`main`へのpushで自動実行）
  - 単体テスト合計142件すべて成功。lint・format・build・E2Eも成功を確認済み
  - `npm run build` + `npm run preview`（本番相当）でPlaywrightから実機確認:
    - Service Workerの登録・activate（`skipWaiting`・`clientsClaim`）を確認
    - Cache Storageにアプリシェル一式（index.html・JS・CSS・アイコン3種・manifest）が正しくプリキャッシュされていることを確認
    - manifestのインストール可能要件（name/short_name/icons 192・512/start_url）を確認
    - Lighthouse（12.8.2）はPWAカテゴリの監査自体が廃止されており使用不可だったため、上記の直接確認で代替した
    - Playwrightの`context.setOffline()`によるオフライン再読み込みの自動テストは、CDPレベルのオフラインエミュレーションがService Workerをバイパスする挙動のため実施できなかった（Cache Storageの中身自体は確認済みのため、実機（実ブラウザでの機内モード等）での最終確認はWP5に持ち越す）
  - `main`へのマージはユーザー承認待ち

### WP5: 結合・実データ確認（`feature/integration`、または各WPの延長で実施）

- 実際のGoogle Driveフォルダ・TSV・音声ファイルを用いた疎通確認
- `.opus`ファイルの実ブラウザ再生確認（仕様書7.3節のリスク項目の解消）
- スマートフォン実機での確認（オフライン・機内モードでの再読み込み・一覧/練習画面の動作確認を含む。WP4ではPlaywrightの制約により自動化できなかったため）
- E2E（Playwright）シナリオの拡充（仕様書12章）
- **完了条件**: テスト計画書に定めるシナリオがすべて成功し、実機で一連の練習フローが問題なく行える

## 5. GitHub Pagesへのデプロイ方針

- GitHub Actionsで`main`ブランチへのマージをトリガーに、`npm run build`の成果物をGitHub Pagesへ公開する
- ワークフローの追加自体もWP0またはWP4の中でブランチを切って実装し、通常のレビュー・承認フローに乗せる
- 本番公開（実際に`main`へマージしてデプロイが走る）は、ユーザーの承認を得たタイミングで行う

## 6. 未確定・実装時に確認する事項

- ルーティング方法（React Router導入 or 自前実装）はWP3着手時に決定する
- `.opus`ファイルの実際のコンテナ形式は、ユーザーの実データを確認できるWP2以降のタイミングで検証する（非対応だった場合の変換方針もその時点で相談する）
- GitHub Actionsのデプロイ方式（`gh-pages`ブランチ運用 or `actions/deploy-pages`）はWP4で決定する
