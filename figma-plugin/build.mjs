/**
 * Figma プラグインのビルドスクリプト
 * - src/code.ts  → dist/code.js  (esbuild でバンドル)
 * - src/ui.html  → dist/ui.html  (@dotlottie/dotlottie-js をインライン注入)
 *
 * Usage:
 *   node figma-plugin/build.mjs          # 1回ビルド
 *   node figma-plugin/build.mjs --watch  # ウォッチモード
 */

import esbuild from "esbuild";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "dist");
const watch = process.argv.includes("--watch");

await mkdir(distDir, { recursive: true });

// ── code.ts をバンドル ────────────────────────────────────────────
const ctx = await esbuild.context({
  entryPoints: [join(__dirname, "src/code.ts")],
  outfile: join(distDir, "code.js"),
  bundle: true,
  platform: "browser",
  target: "es2017",
  format: "iife",
  treeShaking: true,
});

if (watch) {
  await ctx.watch();
  console.log("[figma-plugin] watching src/code.ts ...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("[figma-plugin] code.js built");
}

// ── @dotlottie/dotlottie-js をブラウザ向けにバンドル ─────────────
const dotlottieResult = await esbuild.build({
  stdin: {
    contents: `import { DotLottie } from '@dotlottie/dotlottie-js'; window.DotLottie = DotLottie;`,
    resolveDir: join(__dirname, ".."),
    loader: "js",
  },
  bundle: true,
  platform: "browser",
  target: "es2017",
  format: "iife",
  write: false,
  minify: true,
});
const dotlottieCode = dotlottieResult.outputFiles[0].text;
console.log("[figma-plugin] dotlottie-js bundled");

// ── ui.html にバンドルを注入して dist へ ─────────────────────────
let html = await readFile(join(__dirname, "src/ui.html"), "utf-8");
html = html.replace(
  "<!-- DOTLOTTIE_BUNDLE_PLACEHOLDER -->",
  `<script>${dotlottieCode}</script>`
);
await writeFile(join(distDir, "ui.html"), html);
console.log("[figma-plugin] ui.html built");
