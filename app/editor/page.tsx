"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { DropZone } from "@/components/ui/DropZone";
import { LottiePreview } from "@/components/lottie/LottiePreview";
import { ColorList } from "@/components/lottie/ColorList";
import { SmartAnimatePanel } from "@/components/lottie/SmartAnimatePanel";
import { StorageConnector } from "@/components/storage/StorageConnector";
import { extractColors } from "@/lib/lottie/color-extractor";
import { applyColorSwaps, type ColorSwap } from "@/lib/lottie/color-swapper";
import { buildDotLottie } from "@/lib/lottie/builder";
import type { StorageConfig } from "@/types";

type Tab = "colors" | "animate" | "export";

// ── ユーティリティ ────────────────────────────────────────────────

function jsonToPreviewUrl(json: Record<string, unknown>): string {
  const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
  return URL.createObjectURL(blob);
}

// ── コンポーネント ────────────────────────────────────────────────

export default function EditorPage() {
  // 元の Lottie JSON（変更なし）
  const [sourceLottie, setSourceLottie] =
    useState<Record<string, unknown> | null>(null);
  // 編集済み Lottie JSON
  const [editedLottie, setEditedLottie] =
    useState<Record<string, unknown> | null>(null);
  // プレビュー用 URL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // ファイル名
  const [fileName, setFileName] = useState("animation");
  // アクティブタブ
  const [activeTab, setActiveTab] = useState<Tab>("colors");
  // ストレージ設定
  const [storageConfig, setStorageConfig] = useState<StorageConfig | null>(null);
  // エクスポート状態
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  // ── ファイル読み込み ──────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setExportMsg(null);
    const baseName = file.name.replace(/\.(json|lottie)$/, "");
    setFileName(baseName);

    if (file.name.endsWith(".lottie")) {
      // .lottie は直接プレビュー（JSON 解析は省略）
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSourceLottie(null);
      setEditedLottie(null);
      return;
    }

    const text = await file.text();
    const json = JSON.parse(text) as Record<string, unknown>;
    setSourceLottie(json);
    setEditedLottie(json);
    setPreviewUrl(jsonToPreviewUrl(json));
  }, []);

  // ── カラースワップ ────────────────────────────────────────────

  const handleSwapsChange = useCallback(
    (swaps: ColorSwap[]) => {
      if (!sourceLottie) return;
      const updated =
        swaps.length > 0 ? applyColorSwaps(sourceLottie, swaps) : sourceLottie;
      setEditedLottie(updated);
      setPreviewUrl(jsonToPreviewUrl(updated));
    },
    [sourceLottie]
  );

  // ── Smart Animate 生成 ────────────────────────────────────────

  const handleAnimGenerated = useCallback(
    (lottieJson: Record<string, unknown>) => {
      setEditedLottie(lottieJson);
      setPreviewUrl(jsonToPreviewUrl(lottieJson));
      setFileName("smart-animate");
    },
    []
  );

  // ── エクスポート ──────────────────────────────────────────────

  const handleExport = async () => {
    const json = editedLottie;
    if (!json) return;
    setExporting(true);
    setExportMsg(null);

    try {
      const bytes = await buildDotLottie(json, fileName);

      if (!storageConfig || storageConfig.provider === "local") {
        // ローカルダウンロード
        const blob = new Blob([bytes.buffer as ArrayBuffer], {
          type: "application/zip",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${fileName}.lottie`;
        a.click();
        setExportMsg(`${fileName}.lottie をダウンロードしました`);
        return;
      }

      // サーバー経由でエクスポート
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `${fileName}.lottie`,
          data: Array.from(bytes),
          storageConfig,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Export failed");
      }

      const { location } = (await res.json()) as { location: string };
      setExportMsg(`エクスポート完了: ${location}`);
    } catch (err) {
      setExportMsg(`エラー: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  // ── 描画 ──────────────────────────────────────────────────────

  const colors = sourceLottie ? extractColors(sourceLottie) : [];

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* ── サイドバー ──────────────────────────────────────── */}
      <aside className="flex w-80 flex-col border-r border-zinc-200 bg-white">
        {/* ヘッダー */}
        <div className="border-b border-zinc-100 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <span className="text-lg">◆</span>
            figma-to-lottie
          </Link>
        </div>

        {/* タブ */}
        <div className="flex border-b border-zinc-100">
          {(
            [
              { id: "colors", label: "Colors" },
              { id: "animate", label: "Animate" },
              { id: "export", label: "Export" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === id
                  ? "border-b-2 border-zinc-900 text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* パネル本体 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ── Colors タブ ── */}
          {activeTab === "colors" && (
            <div className="space-y-4">
              <DropZone onFile={handleFile} label="Lottie JSON / .lottie をドロップ" />
              {sourceLottie && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-500">
                      {colors.length} colors
                    </p>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">
                      {fileName}
                    </span>
                  </div>
                  <ColorList
                    colors={colors}
                    onSwapsChange={handleSwapsChange}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Animate タブ ── */}
          {activeTab === "animate" && (
            <SmartAnimatePanel onGenerated={handleAnimGenerated} />
          )}

          {/* ── Export タブ ── */}
          {activeTab === "export" && (
            <div className="space-y-4">
              <StorageConnector
                onConnect={(cfg) => setStorageConfig(cfg)}
              />
              {storageConfig && (
                <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                  接続先: {storageConfig.provider}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-zinc-500">
                  ファイル名
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                />
              </div>
              <button
                onClick={handleExport}
                disabled={!editedLottie || exporting}
                className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
              >
                {exporting ? "エクスポート中..." : `Export ${fileName}.lottie`}
              </button>
              {exportMsg && (
                <p
                  className={`rounded-lg px-3 py-2 text-xs ${
                    exportMsg.startsWith("エラー")
                      ? "bg-red-50 text-red-600"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {exportMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── プレビューエリア ──────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        {previewUrl ? (
          <>
            <LottiePreview
              src={previewUrl}
              className="h-full max-h-[560px] w-full max-w-[560px]"
            />
            <p className="text-sm text-zinc-400">{fileName}.lottie</p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-zinc-100 text-4xl text-zinc-300">
              ◆
            </div>
            <p className="text-sm text-zinc-400">
              左の Colors タブからファイルを読み込むか、<br />
              Animate タブでアニメーションを生成してください。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
