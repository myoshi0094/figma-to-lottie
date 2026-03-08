/**
 * Smart Animate 変換エンジン
 *
 * Figma の 2 フレーム間（位置・サイズ・不透明度・回転）の差分を
 * Lottie の layers / ks プロパティに変換し、イージングを付与する。
 *
 * 座標系:
 *   - x, y  : Figma 座標（左上原点）
 *   - width, height : px
 *   - opacity : 0–100 (Figma スタイル)
 *   - rotation : 度 (時計回り正)
 */

export type EasingType = "linear" | "ease-in-out";

/** フレームの視覚状態 */
export interface FrameState {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0–100 */
  opacity: number;
  /** 度; 省略可 */
  rotation?: number;
}

export interface SmartAnimateOptions {
  frameA: FrameState;
  frameB: FrameState;
  /** アニメーション長 ms (推奨 300–500) */
  durationMs: number;
  /** フレームレート (デフォルト 60) */
  fps?: number;
  easing: EasingType;
}

// ─── イージング定義 ──────────────────────────────────────────────
// Lottie のキーフレームは cubic-bezier を `o`(out)/`i`(in) タンジェントで表現。
// CSS cubic-bezier(P1x, P1y, P2x, P2y) に対応。

const EASING = {
  /** cubic-bezier(0.25, 0.25, 0.75, 0.75) ≈ linear */
  linear: {
    o: { x: [0.25], y: [0.25] },
    i: { x: [0.75], y: [0.75] },
  },
  /** cubic-bezier(0.42, 0, 0.58, 1) = ease-in-out */
  "ease-in-out": {
    o: { x: [0.42], y: [0] },
    i: { x: [0.58], y: [1] },
  },
} as const;

// ─── ヘルパー ────────────────────────────────────────────────────

/** アニメーションする ks プロパティのキーフレーム配列を生成 */
function animatedProp(
  startVal: number[],
  endVal: number[],
  totalFrames: number,
  easing: EasingType
) {
  const { o, i } = EASING[easing];
  return {
    a: 1,
    k: [
      { t: 0, s: startVal, e: endVal, o, i },
      { t: totalFrames, s: endVal },
    ],
  };
}

/** 値が変化しない静的 ks プロパティ */
function staticProp(val: number[]) {
  return { a: 0, k: val };
}

// ─── メインエクスポート ───────────────────────────────────────────

/**
 * 2 フレーム間の差分から完全な Lottie JSON を生成する。
 *
 * 生成されるレイヤー構造:
 * - Shape layer (ty:4) に矩形シェイプを持たせ、
 *   ks (transform) でポジション・スケール・不透明度・回転をアニメーション。
 * - スケールは「frameA のサイズを 100% として frameB の比率に変換」。
 * - アンカーポイントは各フレームの中心点。
 */
export function buildSmartAnimateLottie(
  opts: SmartAnimateOptions
): Record<string, unknown> {
  const { frameA, frameB, durationMs, fps = 60, easing } = opts;
  const totalFrames = Math.round((durationMs / 1000) * fps);

  // コンポジションサイズ: 両フレームを収める最小サイズ
  const compW = Math.ceil(
    Math.max(frameA.x + frameA.width, frameB.x + frameB.width, 1)
  );
  const compH = Math.ceil(
    Math.max(frameA.y + frameA.height, frameB.y + frameB.height, 1)
  );

  // 各フレームの中心座標（= Lottie の position 値）
  const posA = [frameA.x + frameA.width / 2, frameA.y + frameA.height / 2, 0];
  const posB = [frameB.x + frameB.width / 2, frameB.y + frameB.height / 2, 0];

  // スケール: frameA を基準 (100%) に frameB の割合を計算
  const scaleAX = 100;
  const scaleAY = 100;
  const scaleBX =
    frameA.width > 0 ? (frameB.width / frameA.width) * 100 : 100;
  const scaleBY =
    frameA.height > 0 ? (frameB.height / frameA.height) * 100 : 100;

  // position アニメーション
  const posKs =
    posA[0] !== posB[0] || posA[1] !== posB[1]
      ? animatedProp(posA, posB, totalFrames, easing)
      : staticProp(posA);

  // scale アニメーション
  const scaleKs =
    scaleBX !== scaleAX || scaleBY !== scaleAY
      ? animatedProp(
          [scaleAX, scaleAY, 100],
          [scaleBX, scaleBY, 100],
          totalFrames,
          easing
        )
      : staticProp([100, 100, 100]);

  // opacity アニメーション
  const opKs =
    frameA.opacity !== frameB.opacity
      ? animatedProp([frameA.opacity], [frameB.opacity], totalFrames, easing)
      : staticProp([frameA.opacity]);

  // rotation アニメーション
  const rotA = frameA.rotation ?? 0;
  const rotB = frameB.rotation ?? 0;
  const rotKs =
    rotA !== rotB
      ? animatedProp([rotA], [rotB], totalFrames, easing)
      : staticProp([rotA]);

  const layer: Record<string, unknown> = {
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: "Smart Animate Layer",
    sr: 1,
    ks: {
      // アンカーポイント = レイヤー内中心（静的）
      a: staticProp([frameA.width / 2, frameA.height / 2, 0]),
      p: posKs,
      s: scaleKs,
      r: rotKs,
      o: opKs,
    },
    ao: 0,
    shapes: [
      {
        ty: "rc",
        nm: "Frame Bounds",
        d: 1,
        s: staticProp([frameA.width, frameA.height]),
        p: staticProp([0, 0]),
        r: staticProp([0]),
      },
      {
        ty: "fl",
        nm: "Fill",
        c: staticProp([0.84, 0.84, 0.84, 1]),
        o: staticProp([100]),
        r: 1,
      },
    ],
    ip: 0,
    op: totalFrames,
    st: 0,
    bm: 0,
  };

  return {
    v: "5.9.0",
    fr: fps,
    ip: 0,
    op: totalFrames,
    w: compW,
    h: compH,
    nm: "Smart Animate",
    ddd: 0,
    assets: [],
    layers: [layer],
  };
}

// ─── ユーティリティ ───────────────────────────────────────────────

/**
 * 2 フレーム間の変化量サマリーを返す（デバッグ・UI 表示用）
 */
export function calcDiff(
  a: FrameState,
  b: FrameState
): {
  dx: number;
  dy: number;
  dWidth: number;
  dHeight: number;
  dOpacity: number;
  dRotation: number;
} {
  return {
    dx: b.x - a.x,
    dy: b.y - a.y,
    dWidth: b.width - a.width,
    dHeight: b.height - a.height,
    dOpacity: b.opacity - a.opacity,
    dRotation: (b.rotation ?? 0) - (a.rotation ?? 0),
  };
}
