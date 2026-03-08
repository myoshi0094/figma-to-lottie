"use client";

import { useState } from "react";
import {
  buildSmartAnimateLottie,
  calcDiff,
  type FrameState,
  type EasingType,
} from "@/lib/lottie/smart-animate";

interface SmartAnimatePanelProps {
  onGenerated: (lottieJson: Record<string, unknown>) => void;
}

const DEFAULT_FRAME: FrameState = {
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  opacity: 100,
  rotation: 0,
};

const fields: Array<{ key: keyof FrameState; label: string; unit?: string }> = [
  { key: "x", label: "X", unit: "px" },
  { key: "y", label: "Y", unit: "px" },
  { key: "width", label: "Width", unit: "px" },
  { key: "height", label: "Height", unit: "px" },
  { key: "opacity", label: "Opacity", unit: "%" },
  { key: "rotation", label: "Rotation", unit: "°" },
];

export function SmartAnimatePanel({ onGenerated }: SmartAnimatePanelProps) {
  const [frameA, setFrameA] = useState<FrameState>({ ...DEFAULT_FRAME });
  const [frameB, setFrameB] = useState<FrameState>({
    ...DEFAULT_FRAME,
    x: 100,
    width: 600,
    opacity: 80,
  });
  const [durationMs, setDurationMs] = useState(400);
  const [fps, setFps] = useState(60);
  const [easing, setEasing] = useState<EasingType>("ease-in-out");

  const diff = calcDiff(frameA, frameB);
  const diffEntries = Object.entries(diff).filter(([, v]) => v !== 0);

  const handleGenerate = () => {
    const lottie = buildSmartAnimateLottie({
      frameA,
      frameB,
      durationMs,
      fps,
      easing,
    });
    onGenerated(lottie);
  };

  return (
    <div className="space-y-4">
      {/* フレーム入力 */}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["Frame A (Start)", frameA, setFrameA],
            ["Frame B (End)", frameB, setFrameB],
          ] as const
        ).map(([label, frame, setFrame]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-3"
          >
            <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              {label}
            </p>
            {fields.map(({ key, label: fl, unit }) => (
              <div key={key} className="mb-1.5 flex items-center gap-2">
                <span className="w-16 text-right text-[10px] text-zinc-400">
                  {fl}
                </span>
                <input
                  type="number"
                  value={frame[key] ?? 0}
                  onChange={(e) =>
                    setFrame((prev) => ({
                      ...prev,
                      [key]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="flex-1 rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                />
                {unit && (
                  <span className="w-4 text-[10px] text-zinc-400">{unit}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 差分バッジ */}
      {diffEntries.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
            差分
          </p>
          <div className="flex flex-wrap gap-1.5">
            {diffEntries.map(([k, v]) => (
              <span
                key={k}
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700"
              >
                {k}: {v > 0 ? "+" : ""}
                {typeof v === "number" ? v.toFixed(1) : v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* アニメーション設定 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          アニメーション設定
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-zinc-400">
              Duration (ms)
            </label>
            <input
              type="number"
              value={durationMs}
              min={100}
              max={2000}
              step={50}
              onChange={(e) => setDurationMs(Number(e.target.value))}
              className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-zinc-400">FPS</label>
            <input
              type="number"
              value={fps}
              min={24}
              max={120}
              step={1}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-zinc-400">Easing</label>
            <select
              value={easing}
              onChange={(e) => setEasing(e.target.value as EasingType)}
              className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
            >
              <option value="ease-in-out">Ease In-Out</option>
              <option value="linear">Linear</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Generate Animation
      </button>
    </div>
  );
}
