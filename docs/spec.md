# 英語音読練習PWA 仕様書

- 作成日: 2026-08-23
- 前提: [docs/requirements.md](./requirements.md) の要件定義書に基づく

## 1. 技術スタック

| 分類                 | 選定                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------- |
| 言語                 | TypeScript                                                                             |
| UIフレームワーク     | React 19                                                                               |
| ビルドツール         | Vite 8                                                                                 |
| PWA                  | `vite-plugin-pwa`（Workbox、`generateSW`戦略）                                         |
| 単体テスト           | Vitest（+ Testing Library）                                                            |
| E2Eテスト            | Playwright（devcontainerにセットアップ済み）                                           |
| Lint/Format          | ESLint 10 + Prettier                                                                   |
| パッケージマネージャ | npm                                                                                    |
| Google Drive連携     | Google Identity Services（GIS）によるブラウザ完結OAuth + Drive API v3（REST, `fetch`） |
| ローカルデータ永続化 | IndexedDB（`idb`ライブラリ想定）＋ `localStorage`                                      |
| ホスティング         | GitHub Pages（静的ビルド成果物を配信）                                                 |

devcontainerの`postCreateCommand`が`npm install && npx playwright install --with-deps chromium`を実行する構成に合わせている。バージョンはWP0（プロジェクト初期セットアップ）着手時点（2026-08-23）の各ツールの最新安定版を採用した。

## 2. システム構成概要

```
[ブラウザ (PWA)]
  ├─ UI (React)
  ├─ 再生エンジン（HTMLAudioElement + 状態管理）
  ├─ IndexedDB（教材キャッシュ／練習履歴）
  ├─ localStorage（練習中の一時状態／Drive接続設定）
  ├─ Service Worker（アプリシェルのプリキャッシュ）
  └─ Google Identity Services（OAuthトークン取得、メモリ上のみ保持）
        │  (Authorization: Bearer <access token>)
        ▼
[Google Drive API v3]
  ├─ TSVファイル（英文・日本語訳・音声ファイル名等）
  └─ 音声ファイル（560件）
```

サーバーサイドは持たない。すべての処理はクライアント（ブラウザ）内で完結する。

## 3. ディレクトリ構成（提案）

```
ondoku/
├── docs/                       # 要件定義書・仕様書・計画書など
├── public/
│   ├── icons/                  # PWAアイコン各サイズ
│   └── manifest.webmanifest
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── screens/                # 画面コンポーネント
│   │   ├── SetupScreen.tsx     # 初回セットアップ（Drive設定）
│   │   ├── PracticeScreen.tsx          # タブ1: 練習画面
│   │   ├── ContentSelectionScreen.tsx  # タブ2: 英文選択画面（旧ContentListScreen）
│   │   ├── SettingsScreen.tsx          # 英文選択画面右上から開くサブ画面
│   │   └── PracticeHistoryScreen.tsx   # タブ3: 練習履歴画面
│   ├── components/             # 再利用UI部品
│   │   ├── BottomTabNav.tsx    # 下部タブナビゲーション
│   │   ├── FrequencyGrid.tsx   # 汎用の頻度グリッド（英文560マス／日別ヒートマップの両方に使用）
│   │   ├── WeeklyBarChart.tsx  # 直近7日間の棒グラフ
│   │   ├── ProgressBar.tsx
│   │   ├── PlaybackControls.tsx
│   │   └── ...
│   ├── domain/                 # ドメインロジック（純粋関数中心・単体テスト対象）
│   │   ├── playback/           # 再生順序・状態遷移ロジック
│   │   ├── streak.ts           # 連続学習日数の計算
│   │   ├── tsv.ts              # TSVパーサー
│   │   └── grid.ts             # 頻度グリッドの色計算
│   ├── data/
│   │   ├── db.ts               # IndexedDBラッパー
│   │   ├── localStorage.ts     # localStorageラッパー
│   │   └── driveClient.ts      # Google Drive API呼び出し
│   ├── auth/
│   │   └── googleAuth.ts       # GIS初期化・トークン管理
│   └── types/
│       └── index.ts            # 型定義
├── tests/
│   ├── unit/                   # Vitest
│   └── e2e/                    # Playwright
├── index.html
├── vite.config.ts
├── package.json
└── .claude/CLAUDE.md
```

## 4. 画面構成・遷移

初期セットアップ完了後のアプリ本体は、画面下部のタブ型ナビゲーションを持つ3画面構成とする（要件定義書5.0節）。設定画面はタブに含めず、英文選択画面から開くサブ画面とする。

```
起動
  │
  ▼
[認証チェック] ──未ログイン──▶ [ログイン画面] ──ログイン成功──┐
  │ログイン済み                                                │
  ▼                                                            ▼
[Drive設定チェック] ──未設定──▶ [初回セットアップ画面（フォルダID入力）]
  │設定済み                                                     │
  ▼◀────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ アプリ本体（下部タブナビゲーション、初期表示は[練習画面]）    │
│                                                                │
│   [練習画面]   ⇄タブ⇄   [英文選択画面]   ⇄タブ⇄  [練習履歴画面] │
│    (タブ1)                (タブ2)                 (タブ3)      │
│                              │                                 │
│                        「設定」ボタン                          │
│                              ▼                                 │
│                        [設定画面]                              │
│                    （タブ外のサブ画面。                        │
│                    「閉じる」→ 英文選択画面に戻る）             │
└────────────────────────────────────────────────────────────┘
```

### 4.1 練習画面（タブ1・初期表示）

- 英文選択画面で選択した出題範囲のうち、現在の英文を表示する
- 表示要素: 英文／日本語訳（それぞれON/OFF切替）、現在の英文の通し番号・カテゴリ、出題範囲内の総数と現在のインデックス（例:「1/560」）、連続学習日数
- 練習モード（リピーティング／シャドーイング）切り替え
- 出題順序モード（ランダム再生スイッチ／1リピート再生スイッチ、それぞれON/OFF）切り替え
- 再生コントロール（再生／停止／次へ／前へ）＋プログレスバー
- お気に入り登録／解除、お気に入りのみ表示チェックボックス（ON時は出題範囲内のお気に入りのみを再生対象とする。練習画面固有の状態で、英文選択画面とは共有しない）
- 英文再生中（`playing`）・待機中（`waiting`）は、タブナビゲーション（英文選択タブ／練習履歴タブ）をdisabledにし、他画面へ遷移できないようにする（8.1節の状態と対応）

### 4.2 英文選択画面（タブ2）

- カテゴリ（セクション番号）ごとに見出しを設け、配下に英文カードを表示する
  - 英文カード: 通し番号、英文テキスト、リピーティング／シャドーイング回数、お気に入りボタン、練習対象チェックボックス
  - カテゴリ見出し: そのカテゴリ内を全選択／全解除するチェックボックス
- フィルター（表示の絞り込み。出題範囲そのものは変えない）
  - カテゴリ絞り込み: カテゴリごとのチェックボックスで表示ON/OFF（複数選択可）
- 画面右上「設定」ボタン → [設定画面]（4.2.1節）

#### 4.2.1 設定画面

- Google DriveフォルダIDの入力欄、保存ボタン
- 「同期」ボタン → Drive再取得
- 「閉じる」ボタン → 英文選択画面に戻る

### 4.3 練習履歴画面（タブ3）

- 連続学習日数（4.1節の練習画面と共通の値）
- 直近7日間の棒グラフ（日ごとのリピーティング／シャドーイング練習回数）
- 直近196日間（7×28マス）の練習頻度ヒートマップグリッド（GitHubのコントリビューショングラフ風、1マス＝1日）
- 全英文（560マス）の練習頻度グリッド（1マス＝1コンテンツ）

### 4.4 中断・再開

練習画面を離れる（アプリを閉じる／他タブに切り替える）際に現在の練習状態を`localStorage`に保存し、次回アプリを開いたときに同じ状態（モード・出題範囲・出題中コンテンツ）を復元する（5.4節参照）。

## 5. データモデル

### 5.1 型定義（TypeScript）

```typescript
// コンテンツ（TSV由来、IndexedDBにキャッシュ）
interface Content {
  id: number; // 通し番号（1〜560）
  categoryId: string; // セクション番号
  englishText: string;
  japaneseText: string;
  audioFileName: string; // 拡張子込み（例: "001.opus"）
}

// 練習履歴（コンテンツごと、IndexedDB）
interface PracticeRecord {
  contentId: number;
  repeatingCount: number; // リピーティングモードでの練習回数
  shadowingCount: number; // シャドーイングモードでの練習回数
  lastPracticedAt: string; // ISO 8601日時
  isFavorite: boolean;
}
// 合計練習回数（頻度グリッド等で使用）は repeatingCount + shadowingCount として都度算出する

// 日次練習ログ（連続学習日数の算出、練習履歴画面の7日間棒グラフ・日別ヒートマップ用、IndexedDB）
interface DailyLog {
  date: string; // "YYYY-MM-DD"（ローカルタイムゾーン基準）
  repeatingCount: number; // その日のリピーティングモードでの再生完了回数
  shadowingCount: number; // その日のシャドーイングモードでの再生完了回数
}
// 日別ヒートマップの合計値・ストリーク判定は repeatingCount + shadowingCount > 0 として都度算出する

// 音声キャッシュ（IndexedDB、Blobとして保持）
interface AudioCacheEntry {
  contentId: number;
  blob: Blob;
  mimeType: string;
  cachedAt: string;
}

// 練習モード関連の型
type PracticeMode = "repeating" | "shadowing";

// 出題順序は排他的なenumではなく、独立した2つのON/OFFスイッチで表現する
interface OrderSettings {
  isRandom: boolean; // OFF=順次再生、ON=ランダム再生
  isRepeatOne: boolean; // OFF=自動で次に進む、ON=1リピート再生（自動では進まない）
}

// 練習中の一時状態（localStorage）。練習セッション固有の状態のみを持つ
interface PracticeSessionState {
  practiceMode: PracticeMode;
  orderSettings: OrderSettings;
  currentContentId: number;
  shuffledHistory?: number[]; // isRandom=trueのときにこのセッションで再生したcontentIdの履歴（「前へ」で1つ戻るために使用）
}

// 出題範囲の選択状態（localStorage）。英文選択画面・練習画面の両方から参照・更新するため、
// 画面固有ではなくPracticeSessionStateとは別の型・別のlocalStorageキーで管理する
interface SelectionState {
  selectedContentIds: number[]; // 英文選択画面の「練習対象」チェックボックスでONの英文ID一覧（＝出題範囲）
  favoritesOnly: boolean; // 練習画面の「お気に入りのみ表示」チェックボックスの状態（練習画面固有の操作だが、値自体はSelectionStateとして永続化する）
}
// 出題範囲（プレイリスト）は selectedContentIds のうち、favoritesOnly=true の場合は
// さらに isFavorite=true のコンテンツのみに絞り込んだものとして都度算出する（8章参照）
// 英文選択画面のカテゴリ表示フィルターは「表示」のみに影響する画面ローカルな状態であり、
// 出題範囲・永続化の対象には含めない。英文選択画面には「お気に入りのみ表示」フィルターは設けず、
// 英文カードごとの「お気に入り」登録・解除ボタンのみを提供する

// Drive接続設定（localStorage）
interface DriveSettings {
  rootFolderId: string;
}
```

### 5.2 IndexedDBスキーマ

- DB名: `ondoku-db`、バージョン: 1
- オブジェクトストア:
  - `contents`（keyPath: `id`） — `Content[]`
  - `practiceRecords`（keyPath: `contentId`） — `PracticeRecord[]`
  - `dailyLogs`（keyPath: `date`） — `DailyLog[]`
  - `audioBlobs`（keyPath: `contentId`） — `AudioCacheEntry[]`

> **開発中のスキーマ変更方針**: 本アプリは開発中であり、現時点の利用者はローカル環境のみ（本番相当のユーザーデータは存在しない）。そのため、`DailyLog`へのフィールド追加（`repeatingCount`・`shadowingCount`、5.1節）のようなIndexedDBスキーマ変更が今後発生しても、後方互換の読み出し処理やバージョン管理・マイグレーション実装は行わない。スキーマを変更した場合は、ブラウザのIndexedDBを削除（またはDBバージョンを上げて`onupgradeneeded`で旧ストアを作り直す等、実装時にシンプルな方法で構わない）した上でDriveから再同期する運用とする。将来、実際のユーザー（家族・友人等）にデータが乗った状態で公開する段階になったら、その時点で正式なマイグレーション方針を検討する。

### 5.3 localStorageキー

| キー                          | 内容                   |
| ----------------------------- | ---------------------- |
| `ondoku:driveSettings`        | `DriveSettings`        |
| `ondoku:practiceSessionState` | `PracticeSessionState` |
| `ondoku:selectionState`       | `SelectionState`       |

> Googleの認証トークン（アクセストークン）はlocalStorageに保存せず、メモリ上でのみ保持する。アプリ再起動時はGISのサイレント再認証（`prompt: ''`）を試み、失敗した場合のみログイン画面を表示する。

## 6. TSVフォーマット仕様

- 区切り文字: タブ（`\t`）
- 文字コード: UTF-8
- 1行目: ヘッダー行（列名）。ヘッダーの実際の値は実装時にユーザーが用意している実データに合わせて確定する
- 列構成（要件定義書4.3節に対応）:

| 列順 | 論理名                       | `Content`のフィールド  |
| ---- | ---------------------------- | ---------------------- |
| 1    | 通し番号                     | `id`（数値）           |
| 2    | カテゴリ（セクション番号）   | `categoryId`（文字列） |
| 3    | 英文テキスト                 | `englishText`          |
| 4    | 日本語訳テキスト             | `japaneseText`         |
| 5    | 音声ファイル名（拡張子込み） | `audioFileName`        |

- パーサーは`src/domain/tsv.ts`に純粋関数として実装し、Vitestで単体テストする（不正行・空行のスキップ、列数不一致時のエラー等を扱う）

## 7. Google Drive連携仕様

### 7.1 認証（OAuth）

- Google Identity Services（GIS）の`google.accounts.oauth2.initTokenClient`を使用し、ブラウザ完結でアクセストークンを取得する
- スコープ: `https://www.googleapis.com/auth/drive.readonly`
- OAuthクライアントID（Web application種別）はGoogle Cloud Consoleで作成済み（2026-08-23、ユーザーにより準備完了）
  - クライアントID: `470110026121-jekddv45e9t7vfroliqufgf8tdl5v6te.apps.googleusercontent.com`（公開情報として`src/config.ts`に定数で保持する）
  - クライアントシークレットは本実装（GISトークンクライアント方式）では使用しない。コードには含めず、ユーザーの手元で保管する
  - 承認済みJavaScript生成元: `http://localhost:5173`（開発用）、`https://millibar.github.io`（本番用、GitHub Pagesのオリジン）
  - 承認済みリダイレクトURIは本実装では未使用（authorization codeフローに切り替える場合のみ必要）
- トークンはメモリ上にのみ保持し、有効期限切れ時は再取得（サイレント→失敗時はログインボタン表示）
- Google Cloud Consoleでの追加確認事項: 「Google Drive API」の有効化、OAuth同意画面（User Type: External、公開ステータス: テスト中）へのテストユーザー登録（`millibarjp@gmail.com`。将来共有する家族・友人のアカウントも同様に追加が必要）

### 7.2 初回セットアップ（Driveフォルダ設定）

- 初回起動時、設定画面で「ルートフォルダID」をユーザーが入力する
- 入力値は`localStorage`（`ondoku:driveSettings`）に保存する（公開リポジトリのソースコードには含めない）
- ルートフォルダの配置は「TSVと音声ファイルが同一フォルダ」「音声ファイルがサブフォルダに分かれている」のどちらでも動作するよう、以下のロジックで探索する:
  1. ルートフォルダ直下のファイル一覧を取得する（`files.list`、`q: "'<rootFolderId>' in parents and trashed = false"`）
  2. 直下のファイルから拡張子`.tsv`のファイルを1件、コンテンツ定義TSVとして採用する（複数ある場合は最初の1件。将来的にファイル名指定できるよう設定拡張の余地を残す）
  3. 直下のサブフォルダ（`mimeType = 'application/vnd.google-apps.folder'`）についても同様に1階層だけ再帰的にファイル一覧を取得する
  4. 上記で集めた全ファイル（ルート直下＋直下サブフォルダ）から、TSVの`audioFileName`列と`name`が完全一致するファイルを音声ファイルとして紐付ける

### 7.3 データ取得API呼び出し

- ファイル一覧取得: `GET https://www.googleapis.com/drive/v3/files?q=...&fields=files(id,name,mimeType)&pageSize=1000`
- ファイル内容取得（TSV・音声共通）: `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media`（`Authorization: Bearer <token>`ヘッダー付与）
- 音声ファイルはバイナリ（`ArrayBuffer`）として取得し、拡張子に応じたMIMEタイプを付与して`Blob`化し、IndexedDBに保存する

MIMEタイプ対応表（初期実装分、拡張子は小文字化して判定）:

| 拡張子  | MIMEタイプ                                                         |
| ------- | ------------------------------------------------------------------ |
| `.opus` | `audio/ogg; codecs=opus`                                           |
| `.mp3`  | `audio/mpeg`                                                       |
| `.m4a`  | `audio/mp4`                                                        |
| `.wav`  | `audio/wav`                                                        |
| その他  | `application/octet-stream`（再生できない可能性がある旨をログ出力） |

> **リスク**: `.opus`単体ファイル（Ogg/WebMコンテナでない生のOpusストリーム）は、`<audio>`要素での再生がブラウザにより非対応の場合がある。実装フェーズで実データの実ファイル形式（Ogg-OpusコンテナかRaw Opusか）を確認し、必要であれば`audio/ogg; codecs=opus`以外のMIMEタイプや変換要否を検討する（9章「今後確定させる事項」参照）。

### 7.4 同期処理（一括ダウンロード／再同期）

- 「同期」ボタン押下時の処理フロー:
  1. TSVファイルを取得・パースし、`contents`ストアを全件洗い替え（アップサート）
  2. TSVに存在する`audioFileName`ごとに、Drive上のファイルIDを解決し、音声バイナリを取得して`audioBlobs`ストアに保存（既存キャッシュがある場合は上書き）
  3. 進捗（何件中何件ダウンロード済みか）を画面に表示する
  4. 失敗したファイルがあればスキップして継続し、完了後にエラー件数をユーザーに通知する（個別リトライは今回のスコープ外。再度「同期」を押すことで再試行可能）
- 初回利用時は自動的にこの同期処理を実行する（要件定義書4.4節）

## 8. 再生ロジック仕様

### 8.0 出題範囲（プレイリスト）の決定

- 出題範囲は `SelectionState.selectedContentIds`（英文選択画面の練習対象チェックボックスでONの英文ID一覧）を基準とする
- `favoritesOnly === true` の場合、さらに `isFavorite === true` の英文のみに絞り込む
- 英文選択画面の「カテゴリ絞り込み」（表示フィルター）は出題範囲に影響しない
- 出題範囲が0件になった場合（全チェックOFF、またはお気に入りが1件もない状態でfavoritesOnly=ONにした場合等）、練習画面のUI自体は維持したまま（練習モード切替・お気に入りのみ表示チェックボックス等は操作可能なまま）、英文を表示する箇所に「練習対象の英文が選択されていません」という案内メッセージを表示し、再生・前へ／次へ／お気に入りボタンをdisabledにする。特に「お気に入りのみ表示」チェックボックスは無効化せず、ユーザーがそこから直接チェックを外して復帰できるようにする（英文選択画面に移動しなくても回復できるようにするため）

### 8.1 状態遷移

練習画面の再生状態を以下の3状態で管理する（`src/domain/playback`に状態機械として実装し、Vitestで単体テストする）。

- `stopped`: 停止中（初期状態、および「停止」ボタン押下後）
- `playing`: 手本音声を再生中
- `waiting`: 再生後の待機（ポーズ）中（リピーティングモードのみ発生。シャドーイングモードは待機時間0のため実質この状態を経由しない）

```
[stopped] --再生ボタン--> [playing]
[playing] --音声再生終了 & practiceMode=shadowing--> (進行ロジック実行) --> [playing]
[playing] --音声再生終了 & practiceMode=repeating--> [waiting]
[waiting] --待機時間経過(=音声長さ)--> (進行ロジック実行) --> [playing]
[playing/waiting] --停止ボタン--> [stopped]
[playing/waiting] --次へ/前へボタン--> (即座にindex変更) --> [playing]
[stopped] --次へ/前へボタン--> (indexのみ変更) --> [stopped]
```

### 8.2 進行ロジック（自動遷移時のインデックス更新）

`playing`→（再生終了）または`waiting`→（待機終了）した際の挙動は、`OrderSettings`の2つのスイッチで決まる:

1. `isRepeatOne === true`の場合: インデックスを更新せず、同じコンテンツを対象として`playing`へ戻る（8.1節の状態遷移図の通り）
2. `isRepeatOne === false`の場合: 「次のコンテンツ」を決定してから`playing`へ遷移する
   - `isRandom === false`（順次）: 出題範囲（フィルタ後のプレイリスト）内で次のインデックスへ進める（末尾なら先頭に戻る）
   - `isRandom === true`（ランダム）: 出題範囲内から次に再生するコンテンツをランダムに選出する（直前と同じコンテンツは連続で選ばない）。選出結果は`shuffledHistory`に追記する

### 8.3 次へ／前へボタンの挙動

次へ／前へボタンは、`isRandom`・`isRepeatOne`のON/OFFの組み合わせに関わらず共通のルールで動作する。「次に進む先のコンテンツ」の決め方は8.2節の進行ロジックと同一（`isRandom`に従う。`isRepeatOne`のON/OFFはこのボタン操作には影響しない＝ボタンを押せば1リピート再生中でも次・前のコンテンツに移動する）:

- 現在の状態が`playing`または`waiting`のとき: 直ちに現在の再生・待機をキャンセルし、次／前のコンテンツに切り替えて`playing`へ遷移する（自動再生を継続）
- 現在の状態が`stopped`のとき: 次／前のコンテンツへインデックスのみ変更する（自動再生はしない。ユーザーが改めて再生ボタンを押すまで`stopped`のまま）
- `isRandom === true`のときの「次へ」は、8.2節と同様に新規のランダム候補を選出する。「前へ」は`shuffledHistory`から直前に再生したコンテンツを1つ戻る（履歴がない場合は「前へ」を無効化する）

### 8.4 プログレスバーの計算

- `playing`中: `progress = audioElement.currentTime / audioElement.duration`（0〜1、%表示に変換）
- `waiting`中（リピーティングモードのみ）: `progress = 経過時間 / 待機時間`（待機時間 = 直前に再生した音声の`duration`）
- `stopped`中: プログレスバーは0（またはリセット表示）
- 「再生中」と「待機中」は色または表示スタイルを変えて区別する（詳細な配色はUI実装時に決定）

### 8.5 「再生」ボタンの挙動

- `stopped`状態から「再生」を押すと、現在のコンテンツの音声を先頭（0秒）から再生する（一時停止位置からの再開は行わない。1文あたりの再生時間が短いため、シンプルさを優先する）

## 9. 進捗管理ロジック

### 9.1 練習記録の更新タイミング

- あるコンテンツの手本音声の再生が1回完了する（`playing`状態から正常に再生終了する）たびに、その時点の`practiceMode`に応じて`PracticeRecord.repeatingCount`（リピーティングモード時）または`shadowingCount`（シャドーイングモード時）のいずれかをインクリメントし、`lastPracticedAt`を更新する
- 1リピート再生（`isRepeatOne === true`）で同じコンテンツを連続再生した場合も、再生完了のたびに1回としてカウントする（例: 1リピート再生で2回再生されれば、該当モードのカウントは2増える）
- 同時に、当日の`DailyLog`（日付をキーとしたUpsert）の`repeatingCount`／`shadowingCount`（該当する方）もインクリメントする（練習履歴画面の7日間棒グラフ・日別ヒートマップ用。9.4節参照）

### 9.2 連続学習日数（ストリーク）の算出

- `dailyLogs`ストアの日付一覧（`repeatingCount + shadowingCount > 0`の日）から、今日（または直近の練習日が昨日まで）から過去に向かって連続する日数をカウントする（`src/domain/streak.ts`に純粋関数として実装し、Vitestで単体テストする）
- 今日まだ練習していない場合は、「昨日までの連続日数」を表示し、今日中に練習すれば継続、練習しないまま日付が変わればリセットされる、という一般的なストリーク仕様とする
- この値は練習画面（4.1節）・練習履歴画面（4.3節）の両方で共通して表示する（算出処理は1箇所、値はアプリ全体で1つ）

### 9.3 全英文の頻度グリッド

- 560マスを、コンテンツの通し番号順（`id`昇順）に並べて表示する
- 各マスの色の濃淡は、そのコンテンツの合計練習回数（`repeatingCount + shadowingCount`）を段階分け（例: 0回=無色、1〜2回、3〜5回、6〜10回、11回以上、のような区分。具体的な閾値はUI実装時に調整する）して決定する（`src/domain/grid.ts`に純粋関数として実装）

### 9.4 練習履歴画面の日別表示

- **直近7日間の棒グラフ**: 今日を含む直近7日分の`DailyLog`（無い日は0件扱い）を日付順に並べ、日ごとに`repeatingCount`・`shadowingCount`を表示する（積み上げ棒または2本並列棒は、UI実装時に決定する）
- **直近196日間のヒートマップグリッド**: 7行（曜日）×28列（週）のグリッドで、1マス＝1日、列は週単位（GitHubのコントリビューショングラフと同様の並び）とする。マスの色の濃淡は、その日の合計練習回数（`repeatingCount + shadowingCount`）を9.3節と同様の区分で段階分けして決定する
  - 実データが196日に満たない期間（利用開始から日が浅い場合）は、データの無い日を0件（無色）のマスとして埋める
  - 上記の日別集計・色区分ロジックは`src/domain/grid.ts`（または新設する日別グリッド用モジュール）に純粋関数として実装し、9.3節の頻度グリッドと配色ロジックを共通化する

## 10. PWA仕様

- `vite-plugin-pwa`を`generateSW`戦略で使用し、ビルド成果物（JS/CSS/HTML/アイコン等のアプリシェル）をプリキャッシュする
- Google Drive APIへのリクエストはService Workerのランタイムキャッシュ対象**としない**（認証ヘッダー付きリクエストであり、実データのキャッシュはIndexedDBで明示的に管理するため）
- `manifest.webmanifest`:
  - `name`: "英語音読練習"
  - `short_name`: "音読"
  - `display`: `standalone`
  - `orientation`: `portrait`（スマートフォン中心のため）
  - `start_url` / `scope`: GitHub Pagesの公開パスに合わせる（下記参照）
  - アイコン: 複数サイズ（192x192, 512x512等）を`public/icons`に用意する
- GitHub Pagesはリポジトリ名のサブパス配信（例: `https://millibar.github.io/ondoku/`）となるため、Viteの`base`設定・manifestの`start_url`/`scope`を`/ondoku/`に固定している（WP0で確定）
- Service Workerの`navigateFallback`を`index.html`に設定し、URLベースのクライアントサイドルーティングを持たない本アプリの性質上、オフライン時のナビゲーション（直接アクセス・再読み込み）は常にプリキャッシュ済みの`index.html`にフォールバックする（WP4で実装）
- `main`ブランチへのマージをトリガーに、GitHub Actions（`.github/workflows/deploy.yml`）でビルド成果物をGitHub Pagesへ自動デプロイする（WP4で実装。`actions/deploy-pages`を使用）

## 11. 非機能仕様

- 対応ブラウザ: スマートフォンのモダンブラウザ（Android Chrome優先）＋ 開発・確認用にPC Chrome
- オフライン時の挙動: Drive未接続時でも、IndexedDBにキャッシュ済みのコンテンツ・音声・履歴を用いて練習画面・英文選択画面・練習履歴画面が利用できる。「同期」ボタンはオフライン時はエラーメッセージを表示する（WP4で実装）
  - `App.tsx`の起動時、IndexedDBにキャッシュ済みコンテンツが1件でもあれば、Google認証の完了を待たずに即座にタブ付きアプリ本体（初期表示は練習画面）へ進む（認証はバックグラウンドで並行して試みる）。キャッシュが無い初回起動時のみ、ログイン・Drive設定・初回同期を要求する
  - GISのサイレント再認証がコールバックを一切呼ばずハングする場合があるため、5秒でタイムアウトしてログイン画面へフォールバックする（WP3.5で手動確認により発見・対応）
- エラーハンドリング方針:
  - Drive API呼び出し失敗（認証切れ・ネットワークエラー・ファイル未検出等）は、画面上にメッセージ表示し、アプリ全体をクラッシュさせない（WP4で英文選択画面の同期エラー表示として実装。本改訂でも踏襲する）
  - 音声再生エラー（未対応フォーマット等）が発生した場合、再生終了と同様に扱い自動的に次のコンテンツへ進む（該当コンテンツをスキップする）。`hooks/audioPlayer.ts`の`onEnded`が`ended`イベントと`error`イベントの両方を購読することで実現（WP4で実装）
- パフォーマンス: 560件・音声込みの一括ダウンロードは相当な通信量・時間がかかるため、進捗表示と、Wi-Fi環境での実行を推奨する旨の案内を表示する

## 12. テスト方針（概要）

詳細はテスト計画書（`docs/test-plan.md`）で定める。方針の概要のみ記載する。

- **単体テスト（Vitest）**: `src/domain/`配下の純粋ロジック（TSVパーサー、再生状態遷移・進行ロジック、ストリーク計算、出題範囲の算出、頻度グリッド・日別ヒートマップの色区分計算）を中心に、Reactに依存しない形でテストする
- **E2Eテスト（Playwright）**: 画面遷移・練習フロー（再生／停止／次へ／前へ、モード切り替え、お気に入り、状態復元）を、Google Drive APIをモック（ネットワークインターセプト）した上で検証する。実際のGoogle OAuthフローはE2E自動テストの対象外とする

## 13. 今後（実装計画書フェーズ）で確定させる事項

- Google Cloud ConsoleでのOAuthクライアントID作成手順、承認済みオリジンの設定
- 実際のTSVヘッダー名・実データでのパーサー動作確認
- `.opus`音声ファイルの実際のコンテナ形式の確認とブラウザ再生可否の検証（必要に応じてMIMEタイプ調整）
- GitHub Pages公開用のリポジトリ名確定とVite `base` / manifestの`scope`設定
- PWAアイコン素材の準備
- 頻度グリッドの色区分の具体的な閾値・配色（ライト/ダークテーマ対応要否含む）

### 13.1 ページ構成変更（本改訂）の実装で確定した事項

- 直近7日間棒グラフはグループ化棒グラフ（日ごとにリピーティング／シャドーイング2本を並べる）とした（9.4節）
- 出題範囲が0件の場合の練習画面UIは8.0節の通り、UIを維持したまま案内メッセージ・disabledで表現する
- 英文選択画面のカテゴリ全選択／全解除チェックボックスは、一部選択済みの場合indeterminate表示にする
- 下部タブナビゲーションのdisabled時はHTML標準の`disabled`属性による見た目（半透明化）で表現する
