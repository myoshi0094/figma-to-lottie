/**
 * Lottie JSON 内の指定パスのカラー値を置き換える。
 * Figma の Fill カラーと Lottie のシェイプカラーをスワップする用途。
 */

/** "layers[0].shapes[1].it[2].c.k" → ["layers","0","shapes","1","it","2","c","k"] */
function parsePath(path: string): string[] {
  return path.split(/[.[\]]+/).filter(Boolean);
}

function getAt(obj: unknown, parts: string[]): unknown {
  return parts.reduce((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function setAt(obj: unknown, parts: string[], value: unknown): void {
  const parent = getAt(obj, parts.slice(0, -1)) as Record<string, unknown>;
  if (parent) parent[parts[parts.length - 1]] = value;
}

/** "#rrggbb" → 正規化 RGBA [r, g, b, 1] */
export function hexToNormalized(hex: string): [number, number, number, number] {
  const c = hex.replace("#", "");
  return [
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
    1,
  ];
}

/** Figma RGBA (0–255) → 正規化 RGBA */
export function figmaColorToNormalized(
  r: number,
  g: number,
  b: number,
  a = 1
): [number, number, number, number] {
  return [r / 255, g / 255, b / 255, a];
}

export interface ColorSwap {
  /** ExtractedColor.path と同じ JSON パス */
  path: string;
  /** 新しい色 "#rrggbb" */
  newHex: string;
}

/**
 * Lottie JSON を深くクローンし、指定スワップを適用して返す。
 * 元の JSON は変更しない（immutable）。
 */
export function applyColorSwaps(
  lottie: Record<string, unknown>,
  swaps: ColorSwap[]
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(lottie)) as Record<string, unknown>;

  for (const swap of swaps) {
    const parts = parsePath(swap.path);
    // 既存の alpha を保持
    const current = getAt(clone, parts) as number[] | undefined;
    const newColor = hexToNormalized(swap.newHex);
    if (Array.isArray(current) && current.length === 4) {
      newColor[3] = current[3];
    }
    setAt(clone, parts, newColor);
  }

  return clone;
}

/**
 * Figma の選択中 Fill カラーを Lottie の対象パスへ一括スワップ。
 * figmaFills: Figma の Paint[] から得た { r, g, b } (0–255) のリスト。
 * targetPaths: 対応する Lottie カラーパスのリスト（同順）。
 */
export function swapFigmaFillsToLottie(
  lottie: Record<string, unknown>,
  figmaFills: Array<{ r: number; g: number; b: number; a?: number }>,
  targetPaths: string[]
): Record<string, unknown> {
  const swaps: ColorSwap[] = figmaFills
    .slice(0, targetPaths.length)
    .map(({ r, g, b }, i) => ({
      path: targetPaths[i],
      newHex: `#${[r, g, b]
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("")}`,
    }));

  return applyColorSwaps(lottie, swaps);
}
