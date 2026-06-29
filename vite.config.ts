import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "frontend",
  build: {
    target: "es2022",
    minify: "esbuild",
    outDir: resolve(
      __dirname,
      "custom_components/smart_yardian/frontend",
    ),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "frontend/src/panel.ts"),
      formats: ["es"],
      fileName: () => "smart-yardian-panel.js",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
