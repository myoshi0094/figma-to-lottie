import { DotLottie } from "@dotlottie/dotlottie-js";
import type { AnimationData } from "@dotlottie/dotlottie-js";

/**
 * Lottie JSON データを .lottie (dotLottie) バイナリに変換する。
 * addAnimation() → build() → toArrayBuffer() の流れ。
 */
export async function buildDotLottie(
  animationData: unknown,
  name: string
): Promise<Uint8Array> {
  const dotlottie = new DotLottie();

  dotlottie.addAnimation({
    id: name,
    data: animationData as AnimationData,
  });

  const built = await dotlottie.build();
  const buffer = await built.toArrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * 複数の Lottie JSON を 1 つの .lottie ファイルにまとめる。
 */
export async function mergeDotLottieAnimations(
  animations: Array<{ id: string; data: unknown }>
): Promise<Uint8Array> {
  const dotlottie = new DotLottie();

  for (const anim of animations) {
    dotlottie.addAnimation({
      id: anim.id,
      data: anim.data as AnimationData,
    });
  }

  const built = await dotlottie.build();
  const buffer = await built.toArrayBuffer();
  return new Uint8Array(buffer);
}
