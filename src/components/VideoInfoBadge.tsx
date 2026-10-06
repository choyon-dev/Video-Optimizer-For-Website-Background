"use client";

import {
  FileVideo,
  Waveform,
  Timer,
  FrameCorners,
  Cpu,
  X,
} from "@phosphor-icons/react";
import type { VideoMeta } from "@/lib/types";
import { formatBytes, formatDuration } from "@/lib/utils";

interface VideoInfoBadgeProps {
  meta: VideoMeta;
  onClear: () => void;
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
    >
      <span style={{ color: "var(--text-muted)" }}>{icon}</span>
      <div>
        <p className="text-[10px] leading-none mb-0.5" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <p
          className="text-xs font-semibold font-mono leading-none"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function VideoInfoBadge({ meta, onClear }: VideoInfoBadgeProps) {
  return (
    <div
      className="relative flex flex-col gap-3 p-4 rounded-2xl"
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
      }}
    >
      {/* File name + clear */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-dim)" }}
          >
            <FileVideo size={16} style={{ color: "var(--accent)" }} weight="duotone" />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: "var(--text-primary)" }}
              title={meta.filename}
            >
              {meta.filename}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatBytes(meta.size)}
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color =
              "var(--danger)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-muted)")
          }
          aria-label="Remove video and start over"
        >
          <X size={14} />
        </button>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <InfoPill
          icon={<Timer size={13} />}
          label="Duration"
          value={formatDuration(meta.duration)}
        />
        <InfoPill
          icon={<FrameCorners size={13} />}
          label="Resolution"
          value={`${meta.width}×${meta.height}`}
        />
        <InfoPill
          icon={<Waveform size={13} />}
          label="Audio"
          value={meta.hasAudio ? "Yes" : "None"}
        />
        <InfoPill
          icon={<Cpu size={13} />}
          label="Codec"
          value={meta.codec || "H.264"}
        />
      </div>
    </div>
  );
}
