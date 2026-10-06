"use client";

import {
  UploadSimple,
  Video,
  FileVideo,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

interface DropZoneProps {
  onFile: (file: File) => void;
  isLoading?: boolean;
}

export function DropZone({ onFile, isLoading }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    setDragError(null);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setDragError("Please drop a video file (MP4, MOV, WebM, AVI)");
      return;
    }
    onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
    setDragError(null);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload video file — click or drag and drop"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !isLoading && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isLoading)
          inputRef.current?.click();
      }}
      className={`
        relative w-full rounded-2xl border-2 border-dashed
        transition-all duration-200 cursor-pointer
        flex flex-col items-center justify-center gap-4
        min-h-[260px] p-8 text-center
        ${isDragging
          ? "drop-active border-[var(--accent)] bg-[var(--accent-glow)]"
          : "border-[var(--border)] bg-[var(--bg-1)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-2)]"
        }
        ${isLoading ? "pointer-events-none opacity-50" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="hidden"
        id="video-upload"
        aria-hidden="true"
      />

      {/* Icon */}
      <div
        className={`
          w-16 h-16 rounded-2xl flex items-center justify-center
          transition-all duration-200
          ${isDragging
            ? "bg-[var(--accent-dim)] text-[var(--accent)]"
            : "bg-[var(--bg-2)] text-[var(--text-muted)]"
          }
        `}
      >
        {isDragging ? (
          <FileVideo size={28} weight="duotone" />
        ) : (
          <Video size={28} weight="duotone" />
        )}
      </div>

      <div>
        <p
          className="text-base font-medium mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          {isDragging ? "Drop it here" : "Drop your video here"}
        </p>
        <p
          className="text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          or{" "}
          <span
            className="font-medium"
            style={{ color: "var(--accent)" }}
          >
            click to browse
          </span>
          {" "}· MP4, MOV, WebM, AVI
        </p>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
        style={{
          background: "var(--bg-3)",
          color: "var(--text-muted)",
        }}
      >
        <UploadSimple size={12} />
        <span>Processed 100% in your browser — never uploaded</span>
      </div>

      {dragError && (
        <p
          className="text-sm font-medium mt-1"
          style={{ color: "var(--danger)" }}
          role="alert"
        >
          {dragError}
        </p>
      )}
    </div>
  );
}
