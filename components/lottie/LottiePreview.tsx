"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LottiePreviewProps {
  src: string | Uint8Array;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

export function LottiePreview({
  src,
  loop = true,
  autoplay = true,
  className = "",
}: LottiePreviewProps) {
  const srcValue =
    src instanceof Uint8Array
      ? URL.createObjectURL(new Blob([src.buffer as ArrayBuffer], { type: "application/zip" }))
      : src;

  return (
    <div className={`relative overflow-hidden rounded-lg bg-zinc-100 ${className}`}>
      <DotLottieReact
        src={srcValue}
        loop={loop}
        autoplay={autoplay}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
