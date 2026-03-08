/// <reference types="@figma/plugin-typings" />

/**
 * Figma Plugin サンドボックスコード (code.ts)
 *
 * 役割:
 *  1. 選択レイヤーの座標・サイズ・不透明度・カラーを UI に送る
 *  2. UI から受け取った PNG バイトで figma.createImage し矩形に配置
 *  3. Lottie JSON を setPluginData で隠し持ち、後から再編集可能にする
 *
 * メッセージプロトコル:
 *  UI → Plugin : { type, payload }
 *  Plugin → UI : { type, payload }
 */

// ─── 型定義 ────────────────────────────────────────────────────────

interface FrameData {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number; // 0–100
  rotation: number;
  fills: Array<{ r: number; g: number; b: number; a: number }>;
}

type PluginMessage =
  | { type: "ready" }
  | { type: "get-selection" }
  | { type: "export-frames"; payload: { nodeIds: string[] } }
  | { type: "get-node-lottie"; payload: { nodeId: string } }
  | {
      type: "place-animation";
      payload: {
        pngBytes: number[];
        lottieJson: string;
        name: string;
        width: number;
        height: number;
      };
    }
  | { type: "update-lottie"; payload: { nodeId: string; lottieJson: string } }
  | { type: "extract-node-colors"; payload: { nodeId: string } }
  | {
      type: "apply-node-colors";
      payload: {
        changes: Array<{ nodeId: string; fillIndex: number; r: number; g: number; b: number }>;
      };
    }
  | { type: "close" };

// ─── ユーティリティ ────────────────────────────────────────────────

/** SceneNode から FrameData を抽出 */
function extractFrameData(node: SceneNode): FrameData | null {
  if (
    node.type !== "FRAME" &&
    node.type !== "COMPONENT" &&
    node.type !== "GROUP" &&
    node.type !== "RECTANGLE" &&
    node.type !== "VECTOR"
  )
    return null;

  const fills: Array<{ r: number; g: number; b: number; a: number }> = [];

  if ("fills" in node && Array.isArray(node.fills)) {
    for (const fill of node.fills as readonly Paint[]) {
      if (fill.type === "SOLID" && fill.visible !== false) {
        fills.push({
          r: Math.round(fill.color.r * 255),
          g: Math.round(fill.color.g * 255),
          b: Math.round(fill.color.b * 255),
          a: fill.opacity ?? 1,
        });
      }
    }
  }

  return {
    id: node.id,
    name: node.name,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    opacity: Math.round(("opacity" in node ? (node.opacity as number) : 1) * 100),
    rotation: "rotation" in node ? (node.rotation as number) : 0,
    fills,
  };
}

/** 選択中の最大 2 フレームを返す */
function getSelectedFrames(): FrameData[] {
  const result: FrameData[] = [];
  for (const node of figma.currentPage.selection.slice(0, 2)) {
    const data = extractFrameData(node);
    if (data) result.push(data);
  }
  return result;
}

// ─── プラグイン起動 ────────────────────────────────────────────────

figma.showUI(__html__, { width: 480, height: 640, title: "Figma to Lottie" });

// 選択変更を監視
figma.on("selectionchange", () => {
  figma.ui.postMessage({
    type: "selection-changed",
    payload: { frames: getSelectedFrames() },
  });
});

// ─── UI メッセージハンドラー ────────────────────────────────────────

figma.ui.onmessage = async (msg: PluginMessage) => {
  switch (msg.type) {
    // ── UI 準備完了 → init を返す ──
    case "ready": {
      figma.ui.postMessage({
        type: "init",
        payload: { frames: getSelectedFrames() },
      });
      break;
    }

    // ── 選択取得 ──
    case "get-selection": {
      figma.ui.postMessage({
        type: "selection",
        payload: { frames: getSelectedFrames() },
      });
      break;
    }

    // ── フレーム画像エクスポート ──
    case "export-frames": {
      const exports: { nodeId: string; bytes: number[] }[] = [];
      for (const nodeId of msg.payload.nodeIds) {
        const node = await figma.getNodeByIdAsync(nodeId);
        if (node && "exportAsync" in node) {
          try {
            const bytes = await (node as SceneNode & ExportMixin).exportAsync({
              format: "PNG",
              constraint: { type: "SCALE", value: 1 },
            });
            exports.push({ nodeId, bytes: Array.from(bytes) });
          } catch {
            exports.push({ nodeId, bytes: [] });
          }
        }
      }
      figma.ui.postMessage({ type: "frame-exports", payload: exports });
      break;
    }

    // ── 保存済み Lottie JSON 取得 ──
    case "get-node-lottie": {
      const node = await figma.getNodeByIdAsync(msg.payload.nodeId);
      if (!node) {
        figma.ui.postMessage({ type: "error", payload: "Node not found" });
        return;
      }
      const json = node.getPluginData("lottieJson");
      figma.ui.postMessage({
        type: "node-lottie",
        payload: { nodeId: msg.payload.nodeId, lottieJson: json || null },
      });
      break;
    }

    // ── アニメーション配置 ──
    // PNG バイトを受け取り、Figma に矩形を作成して画像フィルを設定。
    // Lottie JSON は setPluginData で隠し持つ。
    case "place-animation": {
      const { pngBytes, lottieJson, name, width, height } = msg.payload;

      try {
        const imageHash = figma.createImage(
          new Uint8Array(pngBytes)
        ).hash;

        const rect = figma.createRectangle();
        rect.name = name || "Lottie Animation";
        rect.resize(width, height);

        // 現在の viewport 中央に配置
        const vp = figma.viewport.center;
        rect.x = Math.round(vp.x - width / 2);
        rect.y = Math.round(vp.y - height / 2);

        // 画像フィル設定
        rect.fills = [
          {
            type: "IMAGE",
            scaleMode: "FILL",
            imageHash,
          },
        ];

        // Lottie JSON を隠し持つ
        rect.setPluginData("lottieJson", lottieJson);
        rect.setPluginData("lottieWidth", String(width));
        rect.setPluginData("lottieHeight", String(height));
        rect.setPluginData("lottieName", name);

        figma.currentPage.appendChild(rect);
        figma.currentPage.selection = [rect];
        figma.viewport.scrollAndZoomIntoView([rect]);

        figma.ui.postMessage({
          type: "placed",
          payload: { nodeId: rect.id },
        });
      } catch (err) {
        figma.ui.postMessage({
          type: "error",
          payload: String(err),
        });
      }
      break;
    }

    // ── 既存ノードの Lottie 更新 ──
    case "update-lottie": {
      const node = await figma.getNodeByIdAsync(msg.payload.nodeId);
      if (!node) {
        figma.ui.postMessage({ type: "error", payload: "Node not found" });
        return;
      }
      node.setPluginData("lottieJson", msg.payload.lottieJson);
      figma.ui.postMessage({ type: "updated", payload: { nodeId: node.id } });
      break;
    }

    // ── Figma ノードからカラーを抽出 ──
    case "extract-node-colors": {
      const root = await figma.getNodeByIdAsync(msg.payload.nodeId);
      if (!root) {
        figma.ui.postMessage({ type: "error", payload: "Node not found" });
        return;
      }
      const colors: Array<{
        nodeId: string;
        nodeName: string;
        fillIndex: number;
        r: number;
        g: number;
        b: number;
        a: number;
      }> = [];

      function traverse(node: SceneNode) {
        if ("fills" in node && Array.isArray(node.fills)) {
          (node.fills as readonly Paint[]).forEach((fill, i) => {
            if (fill.type === "SOLID" && fill.visible !== false) {
              colors.push({
                nodeId: node.id,
                nodeName: node.name,
                fillIndex: i,
                r: fill.color.r,
                g: fill.color.g,
                b: fill.color.b,
                a: fill.opacity ?? 1,
              });
            }
          });
        }
        if ("children" in node) {
          for (const child of (node as ChildrenMixin).children) {
            traverse(child as SceneNode);
          }
        }
      }
      traverse(root as SceneNode);

      figma.ui.postMessage({ type: "node-colors", payload: colors });
      break;
    }

    // ── Figma ノードのカラーを更新 ──
    case "apply-node-colors": {
      for (const change of msg.payload.changes) {
        const node = await figma.getNodeByIdAsync(change.nodeId);
        if (!node || !("fills" in node)) continue;
        const fills = [...(node.fills as readonly Paint[])] as Paint[];
        const fill = fills[change.fillIndex];
        if (fill?.type === "SOLID") {
          fills[change.fillIndex] = {
            ...fill,
            color: { r: change.r, g: change.g, b: change.b },
          };
          (node as GeometryMixin).fills = fills;
        }
      }
      figma.ui.postMessage({ type: "colors-applied" });
      break;
    }

    case "close": {
      figma.closePlugin();
      break;
    }
  }
};
