import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"], // MUST be CommonJS - tsserver uses require()
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2020",
  outDir: "dist",
});
