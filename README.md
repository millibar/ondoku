# 英語音読練習PWA（ondoku）

DUO3.0の英文を教材として、リピーティング／シャドーイングによる音読練習を行うPWA（Progressive Web App）です。

## ドキュメント

- [要件定義書](docs/requirements.md)
- [仕様書](docs/spec.md)
- [実装計画書](docs/implementation-plan.md)
- [テスト計画書](docs/test-plan.md)

## セットアップ

```sh
npm install
npm run dev
```

## 主なコマンド

| コマンド           | 内容                       |
| ------------------ | -------------------------- |
| `npm run dev`      | 開発サーバー起動           |
| `npm run build`    | ビルド                     |
| `npm run lint`     | ESLintによる静的解析       |
| `npm run format`   | Prettierによるフォーマット |
| `npm run test`     | 単体テスト（Vitest）       |
| `npm run test:e2e` | E2Eテスト（Playwright）    |
