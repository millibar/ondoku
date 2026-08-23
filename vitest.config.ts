import { mergeConfig } from "vite";
import { defineConfig as defineVitestConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineVitestConfig({
    // tests/配下はsrcのtsconfig（jsx: "react-jsx"）の対象外でJSX変換方式を
    // 自動検出できないため、Vitestの変換（esbuild）にはJSXランタイムを明示的に指定する。
    // 実際のdev/buildパイプライン（oxc）とは別物なので、vite.config.tsには含めない。
    esbuild: {
      jsx: "automatic",
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/unit/**/*.test.{ts,tsx}"],
    },
  }),
);
