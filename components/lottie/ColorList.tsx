"use client";

import { useState, useCallback } from "react";
import type { ExtractedColor } from "@/lib/lottie/color-extractor";
import type { ColorSwap } from "@/lib/lottie/color-swapper";

interface ColorListProps {
  colors: ExtractedColor[];
  /** スワップが確定したときに呼ばれる */
  onSwapsChange: (swaps: ColorSwap[]) => void;
}

export function ColorList({ colors, onSwapsChange }: ColorListProps) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const handleColorChange = useCallback(
    (path: string, newHex: string) => {
      const next = { ...overrides, [path]: newHex };
      setOverrides(next);
      onSwapsChange(
        Object.entries(next).map(([p, h]) => ({ path: p, newHex: h }))
      );
    },
    [overrides, onSwapsChange]
  );

  const resetAll = () => {
    setOverrides({});
    onSwapsChange([]);
  };

  if (colors.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400">
        Shape カラーが見つかりませんでした。<br />
        Lottie JSON を読み込んでください。
      </div>
    );
  }

  // レイヤーごとにグループ化
  const byLayer = colors.reduce<Record<string, ExtractedColor[]>>((acc, c) => {
    (acc[c.layerName] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(byLayer).map(([layer, items]) => (
        <div key={layer} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            <span className="text-xs font-semibold text-zinc-600">{layer}</span>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-500">
              {items.length}
            </span>
          </div>
          <div className="divide-y divide-zinc-100">
            {items.map((c) => {
              const currentHex = overrides[c.path] ?? c.hex;
              const changed = currentHex !== c.hex;
              return (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                  {/* カラーピッカー */}
                  <label className="relative cursor-pointer">
                    <span
                      className="block h-6 w-6 rounded border border-zinc-200 shadow-inner"
                      style={{ backgroundColor: currentHex }}
                    />
                    <input
                      type="color"
                      value={currentHex}
                      onChange={(e) => handleColorChange(c.path, e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>

                  {/* ラベル */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-700">
                      {c.shapePath.split(" > ").pop()}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">{c.shapePath}</p>
                  </div>

                  {/* 現在値 */}
                  <code
                    className={`text-[10px] font-mono ${
                      changed ? "text-amber-600 font-bold" : "text-zinc-400"
                    }`}
                  >
                    {currentHex}
                  </code>

                  {/* 元に戻す */}
                  {changed && (
                    <button
                      title="元に戻す"
                      onClick={() => {
                        const next = { ...overrides };
                        delete next[c.path];
                        setOverrides(next);
                        onSwapsChange(
                          Object.entries(next).map(([p, h]) => ({ path: p, newHex: h }))
                        );
                      }}
                      className="text-zinc-400 hover:text-zinc-700"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M7.5 2a5.5 5.5 0 1 0 5.5 5.5H11a4 4 0 1 1-4-4V2zm-1 0L4 4.5l2.5 2.5V5a3 3 0 1 0 3 3H11A5.5 5.5 0 1 0 6.5 2z"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(overrides).length > 0 && (
        <button
          onClick={resetAll}
          className="text-xs text-zinc-400 hover:text-zinc-700 underline"
        >
          すべてリセット
        </button>
      )}
    </div>
  );
}
