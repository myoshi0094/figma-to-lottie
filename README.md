# figma-to-lottie

Figmaのデザインを Lottie アニメーション（.lottie / .json）に変換するツールです。
Figma プラグインと Next.js Web アプリの2つのコンポーネントで構成されています。

## 概要

- **Figma プラグイン** — Figmaのデザインデータを取得し、Web アプリへ送信します
- **Web アプリ (Next.js)** — 受け取ったデータを Lottie 形式に変換し、プレビュー・ダウンロードができます

## 技術スタック

| カテゴリ         | 技術                                                  |
| ---------------- | ----------------------------------------------------- |
| フロントエンド   | Next.js 16, React 19, Tailwind CSS 4                  |
| アニメーション   | @dotlottie/dotlottie-js, @lottiefiles/dotlottie-react |
| ストレージ       | AWS S3                                                |
| Figma プラグイン | TypeScript, esbuild                                   |

## ディレクトリ構成

```
figma-to-lottie/
├── app/                  # Next.js App Router
│   ├── api/              # API Routes
│   ├── editor/           # エディター画面
│   ├── export/           # エクスポート画面
│   └── preview/          # プレビュー画面
├── components/           # 共通コンポーネント
├── figma-plugin/         # Figma プラグイン
│   ├── src/              # プラグインソースコード
│   └── manifest.json     # プラグインマニフェスト
├── lib/                  # ユーティリティ・ビジネスロジック
│   ├── figma/            # Figma データ処理
│   ├── lottie/           # Lottie 変換ロジック
│   └── storage/          # S3 ストレージ操作
└── types/                # 共通型定義
```

## セットアップ

### 必要環境

- Node.js 20+
- pnpm

### インストール

```bash
pnpm install
```

### 環境変数

`.env.local` を作成し、以下を設定してください：

```env
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
```

### 開発サーバー起動

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。

## Figma プラグイン

### ビルド

```bash
pnpm plugin:build
```

### 開発（ウォッチモード）

```bash
pnpm plugin:watch
```

ビルド後、Figma の「プラグインを開発」からローカルの `figma-plugin/manifest.json` を読み込んでください。
