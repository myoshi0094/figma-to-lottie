"use client";

import { useState, useCallback } from "react";
import { DropZone } from "@/components/ui/DropZone";
import { LottiePreview } from "@/components/lottie/LottiePreview";
import { StorageConnector } from "@/components/storage/StorageConnector";
import { buildDotLottie } from "@/lib/lottie/builder";
import type { StorageConfig } from "@/types";

type Step = "upload" | "preview" | "export";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [lottieSrc, setLottieSrc] = useState<string | null>(null);
  const [dotLottieBytes, setDotLottieBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("animation");
  const [storageConfig, setStorageConfig] = useState<StorageConfig | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name.replace(/\.(json|lottie)$/, ""));

    if (file.name.endsWith(".lottie")) {
      const url = URL.createObjectURL(file);
      setLottieSrc(url);
      setDotLottieBytes(new Uint8Array(await file.arrayBuffer()));
    } else {
      const text = await file.text();
      const json = JSON.parse(text);
      const bytes = await buildDotLottie(json, file.name.replace(".json", ""));
      const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/zip" }));
      setLottieSrc(url);
      setDotLottieBytes(bytes);
    }

    setStep("preview");
  }, []);

  const handleExport = async () => {
    if (!dotLottieBytes) return;
    setExporting(true);

    try {
      if (!storageConfig || storageConfig.provider === "local") {
        const blob = new Blob([dotLottieBytes.buffer as ArrayBuffer], { type: "application/zip" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${fileName}.lottie`;
        a.click();
      } else {
        const res = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: `${fileName}.lottie`,
            data: Array.from(dotLottieBytes),
            storageConfig,
          }),
        });
        if (!res.ok) throw new Error("Export failed");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900">
            figma-to-lottie
          </h1>
          <div className="flex items-center gap-2">
            {(["upload", "preview", "export"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-zinc-300" />}
                <button
                  onClick={() => step !== "upload" && setStep(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    step === s
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {step === "upload" && (
          <div className="mx-auto max-w-lg">
            <h2 className="mb-2 text-2xl font-semibold text-zinc-900">
              Upload Animation
            </h2>
            <p className="mb-6 text-sm text-zinc-500">
              Import a Lottie JSON or .lottie file to get started
            </p>
            <DropZone onFile={handleFile} />
          </div>
        )}

        {step === "preview" && lottieSrc && (
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">Preview</h2>
              <LottiePreview src={lottieSrc} className="aspect-square" />
              <p className="mt-2 text-sm text-zinc-500">{fileName}.lottie</p>
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-zinc-900">Details</h2>
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">File name</dt>
                    <dd className="font-medium text-zinc-900">{fileName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Size</dt>
                    <dd className="font-medium text-zinc-900">
                      {dotLottieBytes
                        ? `${(dotLottieBytes.length / 1024).toFixed(1)} KB`
                        : "-"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Format</dt>
                    <dd className="font-medium text-zinc-900">.lottie (dotLottie)</dd>
                  </div>
                </dl>
              </div>
              <button
                onClick={() => setStep("export")}
                className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Continue to Export
              </button>
              <button
                onClick={() => setStep("upload")}
                className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Upload another file
              </button>
            </div>
          </div>
        )}

        {step === "export" && (
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                Storage Target
              </h2>
              <StorageConnector
                onConnect={(config) => setStorageConfig(config)}
              />
              {storageConfig && (
                <div className="mt-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
                  Connected to {storageConfig.provider}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-zinc-900">Export</h2>
              {lottieSrc && (
                <LottiePreview src={lottieSrc} className="aspect-square" />
              )}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                {exporting ? "Exporting..." : `Export ${fileName}.lottie`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
