"use client";

import { useRef, useState } from "react";

interface DropZoneProps {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
}

export function DropZone({
  onFile,
  accept = ".json,.lottie",
  label = "Drop Lottie / JSON file here",
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors ${
        dragging
          ? "border-zinc-400 bg-zinc-100"
          : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
      }`}
    >
      <svg
        className="h-10 w-10 text-zinc-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 16v-8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"
        />
      </svg>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-xs text-zinc-400">Supports {accept}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
