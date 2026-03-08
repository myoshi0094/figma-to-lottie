/**
 * Lottie JSON から shape レイヤー内の静的カラーを再帰的に抽出する。
 * 対象: Fill (fl), Stroke (st) の c.k が静的値（アニメーションなし）のもの。
 */

export interface ExtractedColor {
  /** JSON パス (= 一意ID): layers[0].shapes[0].it[1].c.k */
  id: string;
  path: string;
  /** 正規化 RGBA (0–1) */
  rgba: [number, number, number, number];
  /** 16進数カラー "#rrggbb" */
  hex: string;
  layerName: string;
  /** 人読み可能なパス: "LayerName > GroupName > Fill" */
  shapePath: string;
}

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function collectColors(
  items: Record<string, unknown>[],
  pathPrefix: string,
  layerName: string,
  shapePath: string,
  out: ExtractedColor[]
): void {
  items.forEach((item, i) => {
    const p = `${pathPrefix}.it[${i}]`;
    const nm = (item.nm as string) ?? "";

    if (item.ty === "fl" || item.ty === "st") {
      const c = item.c as { a: number; k: unknown } | undefined;
      const k = c?.k;
      if (Array.isArray(k) && typeof k[0] === "number") {
        const [r, g, b, a = 1] = k as number[];
        const label = item.ty === "fl" ? "Fill" : "Stroke";
        out.push({
          id: `${p}.c.k`,
          path: `${p}.c.k`,
          rgba: [r, g, b, a],
          hex: toHex(r, g, b),
          layerName,
          shapePath: `${shapePath} > ${nm || label}`,
        });
      }
    }

    // グループは再帰
    if (item.ty === "gr" && Array.isArray(item.it)) {
      collectColors(
        item.it as Record<string, unknown>[],
        p,
        layerName,
        `${shapePath} > ${nm}`,
        out
      );
    }
  });
}

export function extractColors(
  lottie: Record<string, unknown>
): ExtractedColor[] {
  const colors: ExtractedColor[] = [];
  const layers = lottie.layers as Record<string, unknown>[] | undefined;
  if (!Array.isArray(layers)) return colors;

  layers.forEach((layer, li) => {
    if (layer.ty !== 4) return; // shape layer のみ
    const layerName = (layer.nm as string) ?? `Layer ${li}`;
    const shapes = layer.shapes as Record<string, unknown>[] | undefined;
    if (!Array.isArray(shapes)) return;

    shapes.forEach((shape, si) => {
      const prefix = `layers[${li}].shapes[${si}]`;
      const nm = (shape.nm as string) ?? `Shape ${si}`;

      if (shape.ty === "gr" && Array.isArray(shape.it)) {
        collectColors(
          shape.it as Record<string, unknown>[],
          prefix,
          layerName,
          nm,
          colors
        );
      } else if ((shape.ty === "fl" || shape.ty === "st") && shape.c) {
        const c = shape.c as { k: unknown };
        if (Array.isArray(c.k) && typeof c.k[0] === "number") {
          const [r, g, b, a = 1] = c.k as number[];
          const label = shape.ty === "fl" ? "Fill" : "Stroke";
          colors.push({
            id: `${prefix}.c.k`,
            path: `${prefix}.c.k`,
            rgba: [r, g, b, a],
            hex: toHex(r, g, b),
            layerName,
            shapePath: `${nm} (${label})`,
          });
        }
      }
    });
  });

  return colors;
}
