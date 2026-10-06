"use client";

import {
  FilmSlate,
  Timer,
  SpeakerX,
  Lightning,
  Image as ImageIcon,
  Sliders,
  Check,
} from "@phosphor-icons/react";
import type { OptimizationSettings, VideoMeta, VideoPreset } from "@/lib/types";
import { PRESETS } from "@/lib/types";
import { formatDuration, estimateOutputSize, formatBytes } from "@/lib/utils";

interface SettingsPanelProps {
  settings: OptimizationSettings;
  meta: VideoMeta | null;
  onChange: (s: OptimizationSettings) => void;
}

const PRESET_META: Record<
  Exclude<VideoPreset, "custom">,
  { label: string; desc: string; icon: React.ReactNode; color: string }
> = {
  "web-bg": {
    label: "Web Background",
    desc: "15s · 720p · ~900 KB",
    icon: <FilmSlate size={16} weight="duotone" />,
    color: "var(--accent)",
  },
  "hero-bg": {
    label: "Hero Background",
    desc: "30s · 1080p · ~3 MB",
    icon: <Lightning size={16} weight="duotone" />,
    color: "#60a5fa",
  },
  mobile: {
    label: "Mobile First",
    desc: "10s · 480p · ~300 KB",
    icon: <Timer size={16} weight="duotone" />,
    color: "#f59e0b",
  },
};

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <label className="toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-slider" />
    </label>
  );
}

function Row({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <div>
        <p
          className="text-sm font-medium leading-none mb-0.5"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </p>
        {hint && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {hint}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function SettingsPanel({ settings, meta, onChange }: SettingsPanelProps) {
  const maxDuration = meta ? meta.duration - settings.trimStart : 120;

  function applyPreset(preset: Exclude<VideoPreset, "custom">) {
    const p = PRESETS[preset];
    onChange({
      ...settings,
      preset,
      trimDuration: Math.min(p.trimDuration, maxDuration),
      targetWidth: p.targetWidth,
      crf: p.crf,
      removeAudio: p.removeAudio,
      faststart: p.faststart,
      extractPoster: p.extractPoster,
      posterQuality: p.posterQuality,
    });
  }

  function setCustom(partial: Partial<OptimizationSettings>) {
    onChange({ ...settings, ...partial, preset: "custom" });
  }

  const estimatedSize = meta
    ? estimateOutputSize(
        meta.size,
        meta.duration,
        settings.trimDuration,
        settings.crf,
        settings.targetWidth,
        meta.width
      )
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Preset selector */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Quick Presets
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PRESET_META) as Exclude<VideoPreset, "custom">[]).map(
            (key) => {
              const { label, desc, icon, color } = PRESET_META[key];
              const active = settings.preset === key;
              return (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="relative flex flex-col gap-1.5 p-3 rounded-xl text-left border transition-all duration-150"
                  style={{
                    background: active ? "var(--accent-dim)" : "var(--bg-2)",
                    borderColor: active ? color : "var(--border)",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {active && (
                    <span
                      className="absolute top-2 right-2"
                      style={{ color: color }}
                    >
                      <Check size={12} weight="bold" />
                    </span>
                  )}
                  <span style={{ color: active ? color : "var(--text-muted)" }}>
                    {icon}
                  </span>
                  <span className="text-xs font-semibold leading-none">{label}</span>
                  <span
                    className="text-[11px] leading-none"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {desc}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      <div className="sep" />

      {/* Manual controls */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Advanced Settings
        </p>

        <div className="glass p-4">
          {/* Trim start */}
          <Row
            label="Trim Start"
            hint={`Starts at ${formatDuration(settings.trimStart)}`}
          >
            <div className="flex items-center gap-2 w-36">
              <input
                type="range"
                min={0}
                max={meta ? Math.max(0, meta.duration - 1) : 120}
                step={0.5}
                value={settings.trimStart}
                onChange={(e) =>
                  setCustom({ trimStart: parseFloat(e.target.value) })
                }
                aria-label="Trim start time"
              />
              <span
                className="text-xs font-mono w-10 text-right"
                style={{ color: "var(--accent)" }}
              >
                {formatDuration(settings.trimStart)}
              </span>
            </div>
          </Row>

          {/* Trim duration */}
          <Row
            label="Loop Duration"
            hint={`${settings.trimDuration}s loop`}
          >
            <div className="flex items-center gap-2 w-36">
              <input
                type="range"
                min={3}
                max={Math.min(60, maxDuration)}
                step={1}
                value={settings.trimDuration}
                onChange={(e) =>
                  setCustom({ trimDuration: parseInt(e.target.value) })
                }
                aria-label="Loop duration in seconds"
              />
              <span
                className="text-xs font-mono w-10 text-right"
                style={{ color: "var(--accent)" }}
              >
                {settings.trimDuration}s
              </span>
            </div>
          </Row>

          {/* Target width */}
          <Row
            label="Output Width"
            hint={
              settings.targetWidth === 0
                ? "Keeping original"
                : `${settings.targetWidth}px wide`
            }
          >
            <select
              value={settings.targetWidth}
              onChange={(e) =>
                setCustom({ targetWidth: parseInt(e.target.value) })
              }
              aria-label="Output video width"
              className="input w-28 text-xs"
            >
              <option value={0}>Original</option>
              <option value={3840}>4K (3840px)</option>
              <option value={1920}>1080p (1920px)</option>
              <option value={1280}>720p (1280px)</option>
              <option value={854}>480p (854px)</option>
              <option value={640}>360p (640px)</option>
            </select>
          </Row>

          {/* CRF Quality */}
          <Row
            label="Quality (CRF)"
            hint={
              settings.crf <= 20
                ? "High quality · larger file"
                : settings.crf >= 32
                ? "Smaller file · lower quality"
                : "Balanced"
            }
          >
            <div className="flex items-center gap-2 w-36">
              <input
                type="range"
                min={18}
                max={40}
                step={1}
                value={settings.crf}
                onChange={(e) =>
                  setCustom({ crf: parseInt(e.target.value) })
                }
                aria-label="CRF quality value"
              />
              <span
                className="text-xs font-mono w-8 text-right"
                style={{ color: "var(--accent)" }}
              >
                {settings.crf}
              </span>
            </div>
          </Row>

          {/* Remove audio */}
          <Row
            label="Strip Audio"
            hint={settings.removeAudio ? "Required for autoplay" : "Audio kept"}
          >
            <div className="flex items-center gap-2">
              {settings.removeAudio && (
                <SpeakerX size={14} style={{ color: "var(--text-muted)" }} />
              )}
              <Toggle
                id="strip-audio"
                checked={settings.removeAudio}
                onChange={(v) => setCustom({ removeAudio: v })}
              />
            </div>
          </Row>

          {/* Faststart */}
          <Row
            label="Fast Start"
            hint="Moves moov atom to start for instant streaming"
          >
            <Toggle
              id="faststart"
              checked={settings.faststart}
              onChange={(v) => setCustom({ faststart: v })}
            />
          </Row>
        </div>
      </div>

      {/* Poster settings */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Poster Frame (WebP)
        </p>
        <div className="glass p-4">
          <Row
            label="Extract Poster"
            hint="Generates a WebP image for use as placeholder"
          >
            <div className="flex items-center gap-2">
              <ImageIcon size={14} style={{ color: "var(--text-muted)" }} />
              <Toggle
                id="extract-poster"
                checked={settings.extractPoster}
                onChange={(v) => setCustom({ extractPoster: v })}
              />
            </div>
          </Row>

          {settings.extractPoster && (
            <>
              <Row
                label="Timestamp"
                hint={`Frame at ${formatDuration(settings.posterTimestamp)}`}
              >
                <div className="flex items-center gap-2 w-36">
                  <input
                    type="range"
                    min={0}
                    max={settings.trimStart + settings.trimDuration - 0.1}
                    step={0.5}
                    value={settings.posterTimestamp}
                    onChange={(e) =>
                      setCustom({
                        posterTimestamp: parseFloat(e.target.value),
                      })
                    }
                    aria-label="Poster frame timestamp"
                  />
                  <span
                    className="text-xs font-mono w-10 text-right"
                    style={{ color: "var(--accent)" }}
                  >
                    {formatDuration(settings.posterTimestamp)}
                  </span>
                </div>
              </Row>

              <Row label="WebP Quality" hint={`${settings.posterQuality}%`}>
                <div className="flex items-center gap-2 w-36">
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    value={settings.posterQuality}
                    onChange={(e) =>
                      setCustom({ posterQuality: parseInt(e.target.value) })
                    }
                    aria-label="WebP poster quality"
                  />
                  <span
                    className="text-xs font-mono w-10 text-right"
                    style={{ color: "var(--accent)" }}
                  >
                    {settings.posterQuality}%
                  </span>
                </div>
              </Row>
            </>
          )}
        </div>
      </div>

      {/* Estimated output */}
      {estimatedSize && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-mid)" }}
        >
          <div className="flex items-center gap-2">
            <Sliders size={14} style={{ color: "var(--accent)" }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Estimated output size
            </span>
          </div>
          <span
            className="text-sm font-semibold font-mono"
            style={{ color: "var(--accent)" }}
          >
            ~{formatBytes(estimatedSize)}
          </span>
        </div>
      )}
    </div>
  );
}
