"use client";

import {
  ArrowDown,
  DownloadSimple,
  Copy,
  Check,
  FileVideo,
  Image as ImageIcon,
  Clock,
  ArrowsLeftRight,
  Confetti,
} from "@phosphor-icons/react";
import { useState, useCallback } from "react";
import type { OptimizationResult } from "@/lib/types";
import { formatBytes, generateCodeSnippet } from "@/lib/utils";

interface ResultsPanelProps {
  result: OptimizationResult;
  onReset: () => void;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 rounded-xl"
      style={{
        background: accent ? "var(--accent-dim)" : "var(--bg-2)",
        border: `1px solid ${accent ? "var(--accent-mid)" : "var(--border)"}`,
      }}
    >
      <span
        className="text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className={`text-lg font-semibold font-mono leading-none ${accent ? "" : ""}`}
        style={{ color: accent ? "var(--accent)" : "var(--text-primary)" }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultsPanel({ result, onReset }: ResultsPanelProps) {
  const [copied, setCopied] = useState(false);

  const codeSnippet = generateCodeSnippet(
    result.videoFilename,
    result.posterFilename
  );

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeSnippet]);

  const savedPercent = Math.round((1 - 1 / result.compressionRatio) * 100);
  const processingSeconds = (result.processingTime / 1000).toFixed(1);

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--accent-dim)" }}
        >
          <Confetti size={20} style={{ color: "var(--accent)" }} weight="duotone" />
        </div>
        <div>
          <h2
            className="text-base font-semibold leading-none mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Optimization Complete
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Processed in {processingSeconds}s
          </p>
        </div>
        <button
          onClick={onReset}
          className="btn btn-ghost ml-auto text-xs"
          aria-label="Reset and optimize another video"
        >
          New Video
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 animate-fade-in-up animate-fade-in-up-delay-1">
        <StatCard
          label="Before"
          value={formatBytes(result.originalSize)}
          sub="Original file"
        />
        <StatCard
          label="After"
          value={formatBytes(result.videoSize)}
          sub="Optimized video"
          accent
        />
        <StatCard
          label="Reduction"
          value={`${savedPercent}% smaller`}
          sub={`${result.compressionRatio.toFixed(1)}x compression`}
          accent
        />
        <StatCard
          label="Time"
          value={`${processingSeconds}s`}
          sub="Processing time"
        />
      </div>

      {/* Visual compression bar */}
      <div
        className="p-4 rounded-xl animate-fade-in-up animate-fade-in-up-delay-2"
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
          <span>Original: {formatBytes(result.originalSize)}</span>
          <span>Output: {formatBytes(result.videoSize)}</span>
        </div>
        <div
          className="relative h-3 rounded-full overflow-hidden"
          style={{ background: "var(--bg-3)" }}
          role="progressbar"
          aria-valuenow={100 - savedPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${savedPercent}% file size reduction`}
        >
          {/* Original (full width ghost) */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "var(--bg-3)", width: "100%" }}
          />
          {/* New size bar */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{
              background: `linear-gradient(90deg, var(--accent), #05f5b0)`,
              width: `${Math.max((1 / result.compressionRatio) * 100, 2)}%`,
              boxShadow: "0 0 12px var(--accent-mid)",
            }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <ArrowDown size={12} style={{ color: "var(--accent)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
            {savedPercent}% smaller
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            · {formatBytes(result.originalSize - result.videoSize)} saved
          </span>
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex flex-col gap-2 animate-fade-in-up animate-fade-in-up-delay-3">
        <button
          className="btn btn-primary w-full justify-center text-sm"
          onClick={() =>
            downloadBlob(result.videoBlob, result.videoFilename)
          }
          id="download-video-btn"
        >
          <FileVideo size={16} weight="duotone" />
          Download Optimized Video
          <span
            className="ml-auto text-xs opacity-70 font-mono"
          >
            {formatBytes(result.videoSize)}
          </span>
        </button>

        {result.posterBlob && result.posterFilename && (
          <button
            className="btn btn-ghost w-full justify-center text-sm"
            onClick={() =>
              downloadBlob(result.posterBlob!, result.posterFilename!)
            }
            id="download-poster-btn"
          >
            <ImageIcon size={16} weight="duotone" />
            Download WebP Poster
            <span className="ml-auto text-xs opacity-70 font-mono">
              {result.posterSize ? formatBytes(result.posterSize) : ""}
            </span>
          </button>
        )}

        <div
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
          style={{ background: "var(--bg-2)", color: "var(--text-muted)" }}
        >
          <ArrowsLeftRight size={12} />
          <span>
            Place video in{" "}
            <code className="font-mono" style={{ color: "var(--text-secondary)" }}>
              /public/videos/
            </code>{" "}
            in your Next.js project
          </span>
        </div>
      </div>

      {/* Code snippet */}
      <div className="animate-fade-in-up animate-fade-in-up-delay-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock size={13} style={{ color: "var(--text-muted)" }} />
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              LazyBgVideo React Component
            </span>
          </div>
          <button
            className="btn btn-ghost text-xs py-1 px-2"
            onClick={handleCopy}
            id="copy-code-btn"
            aria-label="Copy component code to clipboard"
          >
            {copied ? (
              <><Check size={12} style={{ color: "var(--accent)" }} /> Copied</>
            ) : (
              <><Copy size={12} /> Copy</>
            )}
          </button>
        </div>
        <div className="code-block">{codeSnippet}</div>
      </div>
    </div>
  );
}
