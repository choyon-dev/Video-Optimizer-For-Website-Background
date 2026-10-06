"use client";

import { useRef, useEffect } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import type { ProcessingStage } from "@/lib/types";

interface ProcessingPanelProps {
  stage: ProcessingStage;
  progress: number; // 0-100
  logs: string[];
}

export function ProcessingPanel({ stage, progress, logs }: ProcessingPanelProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const stageLabel: Record<ProcessingStage, string> = {
    idle: "Idle",
    "loading-ffmpeg": "Loading FFmpeg engine...",
    analyzing: "Analyzing video metadata...",
    processing: `Processing video... ${progress}%`,
    done: "Done",
    error: "Error",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stage indicator */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent-dim)" }}
        >
          <CircleNotch
            size={16}
            style={{ color: "var(--accent)" }}
            className="animate-spin"
          />
        </div>
        <div className="flex-1">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {stageLabel[stage]}
          </p>
          {/* Progress bar */}
          <div
            className="mt-2 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--bg-3)" }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Processing progress: ${progress}%`}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, var(--accent), #05f5b0)",
                boxShadow: "0 0 8px var(--accent-mid)",
              }}
            />
          </div>
        </div>
        <span
          className="text-sm font-mono font-semibold"
          style={{ color: "var(--accent)" }}
        >
          {progress}%
        </span>
      </div>

      {/* Log output */}
      <div>
        <p
          className="text-xs mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          FFmpeg Log
        </p>
        <div
          ref={logRef}
          className="log-container"
          role="log"
          aria-live="polite"
          aria-label="FFmpeg processing log"
        >
          {logs.map((line, i) => {
            const cls = line.includes("Error") || line.includes("error")
              ? "log-err"
              : line.startsWith("---") || line.startsWith("Done")
              ? "log-ok"
              : line.startsWith("Loading") || line.startsWith("Command:")
              ? "log-info"
              : "";
            return (
              <div key={i} className={cls}>
                {line}
              </div>
            );
          })}
          {logs.length === 0 && (
            <span style={{ color: "var(--text-muted)" }}>
              Waiting for processing to start...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
