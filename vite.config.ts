import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pagesでの公開パス（https://millibar.github.io/ondoku/）に合わせる
// 参照: docs/spec.md 10章
const base = "/ondoku/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      manifest: {
        name: "英語音読練習",
        short_name: "音読",
        description: "DUO3.0の英文でリピーティング・シャドーイングを練習するPWA",
        lang: "ja",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#4338ca",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // 本アプリはURLベースのクライアントサイドルーティングを持たない単一ページの
        // アプリなので、オフライン時の直接アクセス・再読み込みに備えてナビゲーション
        // リクエストは常にプリキャッシュ済みのindex.htmlにフォールバックする。
        // Google Drive API（googleapis.com）へのリクエストは別オリジンのため、
        // このナビゲーションフォールバックの対象にはならない（仕様書10章）。
        navigateFallback: "index.html",
      },
    }),
  ],
});
