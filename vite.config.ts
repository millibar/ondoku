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
      // manifestの詳細（アイコン等）はWP4（PWA仕上げ）で確定する。
      // 参照: docs/implementation-plan.md WP4
      manifest: {
        name: "英語音読練習",
        short_name: "音読",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [],
      },
      workbox: {
        // Google Drive APIへのリクエストはランタイムキャッシュの対象としない（仕様書10章）
        navigateFallbackDenylist: [/^\/oauth\//],
      },
    }),
  ],
});
