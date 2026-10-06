"use client";

import { useState, useCallback, useRef } from "react";
import {
  Rocket,
  Info,
  WarningCircle,
  ArrowClockwise,
} from "@phosphor-icons/react";
import type {
  VideoMeta,
  OptimizationSettings,
  OptimizationResult,
  ProcessingStage,
} from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { parseVideoInfo } from "@/lib/utils";
import { loadFFmpeg, analyzeVideo, optimizeVideo } from "@/lib/ffmpeg";
import { DropZone } from "@/components/DropZone";
import { VideoInfoBadge } from "@/components/VideoInfoBadge";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ProcessingPanel } from "@/components/ProcessingPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [probeOutput, setProbeOutput] = useState("");
  const [settings, setSettings] = useState<OptimizationSettings>(DEFAULT_SETTINGS);
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ffmpegRef = useRef<FFmpeg | null>(null);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, msg]);
  }, []);

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setResult(null);
      setError(null);
      setLogs([]);
      setProgress(0);
      setStage("loading-ffmpeg");

      try {
        const ffmpeg = await loadFFmpeg(addLog);
        ffmpegRef.current = ffmpeg;

        setStage("analyzing");
        addLog(`\nAnalyzing: ${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`);

        const probeOut = await analyzeVideo(ffmpeg, f, addLog);
        setProbeOutput(probeOut);

        const info = parseVideoInfo(probeOut);

        setMeta({
          filename: f.name,
          size: f.size,
          duration: info.duration ?? 0,
          width: info.width ?? 0,
          height: info.height ?? 0,
          hasAudio: info.hasAudio ?? false,
          codec: info.codec ?? "h264",
          fps: info.fps ?? 30,
          bitrate: info.bitrate ?? 0,
        });

        // Smart defaults: clamp trim to video duration
        setSettings((prev) => ({
          ...prev,
          trimDuration: Math.min(prev.trimDuration, info.duration ?? 15),
          posterTimestamp: Math.min(1, (info.duration ?? 2) - 0.1),
        }));

        setStage("idle");
        addLog("Analysis complete. Ready to optimize.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(`Failed to analyze video: ${msg}`);
        setStage("error");
      }
    },
    [addLog]
  );

  const handleOptimize = useCallback(async () => {
    if (!file || !ffmpegRef.current || !meta) return;

    setStage("processing");
    setProgress(0);
    setLogs([]);
    setError(null);
    setResult(null);

    try {
      const res = await optimizeVideo(
        ffmpegRef.current,
        file,
        settings,
        probeOutput,
        addLog,
        (pct) => setProgress(pct)
      );
      setResult(res);
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Optimization failed: ${msg}`);
      setStage("error");
      addLog(`ERROR: ${msg}`);
    }
  }, [file, meta, settings, probeOutput, addLog]);

  const handleReset = useCallback(() => {
    setFile(null);
    setMeta(null);
    setProbeOutput("");
    setSettings(DEFAULT_SETTINGS);
    setStage("idle");
    setProgress(0);
    setLogs([]);
    setResult(null);
    setError(null);
  }, []);

  const isProcessing = stage === "loading-ffmpeg" || stage === "analyzing" || stage === "processing";
  const canOptimize = !!meta && !isProcessing && stage !== "done";

  return (
    <div className="grid-bg min-h-[100dvh] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent)", boxShadow: "0 0 16px var(--accent-mid)" }}
            >
              <Rocket size={14} weight="fill" style={{ color: "#0a0a0b" }} />
            </div>
            <span
              className="font-semibold text-sm tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              BgLoop
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "var(--bg-2)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              Video Optimizer
            </span>
          </div>

          <div
            className="hidden sm:flex items-center gap-1.5 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full pulse-dot"
              style={{ background: "var(--accent)" }}
            />
            In-browser · No uploads · Free
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero heading */}
        {!file && (
          <div className="mb-8 animate-fade-in-up">
            <h1
              className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Website Background
              <br />
              <span style={{ color: "var(--accent)" }}>Video Optimizer</span>
            </h1>
            <p
              className="text-base max-w-xl leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Turn any large video into a sub-1 MB background loop with WebP
              poster frame and lazy-loading React component — in your browser,
              zero uploads.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-5">
              {[
                "Strip audio",
                "Trim to loop",
                "Scale resolution",
                "Faststart MP4",
                "WebP poster",
                "Copy React code",
              ].map((f) => (
                <span
                  key={f}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{
                    background: "var(--bg-2)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Drop zone */}
            {!file && (
              <div className="animate-fade-in-up animate-fade-in-up-delay-1">
                <DropZone onFile={handleFile} isLoading={isProcessing} />
              </div>
            )}

            {/* Video metadata */}
            {meta && (
              <div className="animate-fade-in-up">
                <VideoInfoBadge
                  meta={meta}
                  onClear={handleReset}
                />
              </div>
            )}

            {/* Processing panel */}
            {isProcessing && (
              <div className="animate-fade-in-up">
                <ProcessingPanel
                  stage={stage}
                  progress={progress}
                  logs={logs}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl animate-fade-in-up"
                style={{
                  background: "rgba(255,77,106,0.07)",
                  border: "1px solid rgba(255,77,106,0.2)",
                }}
                role="alert"
              >
                <WarningCircle
                  size={18}
                  style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }}
                  weight="duotone"
                />
                <div>
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: "var(--danger)" }}
                  >
                    Something went wrong
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {error}
                  </p>
                  <button
                    onClick={handleReset}
                    className="btn btn-ghost text-xs mt-3"
                  >
                    <ArrowClockwise size={12} />
                    Start Over
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {result && stage === "done" && (
              <ResultsPanel result={result} onReset={handleReset} />
            )}

            {/* Log history (collapsed after done) */}
            {stage === "done" && logs.length > 0 && (
              <details className="animate-fade-in-up">
                <summary
                  className="text-xs cursor-pointer py-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Show FFmpeg log
                </summary>
                <ProcessingPanel
                  stage="done"
                  progress={100}
                  logs={logs}
                />
              </details>
            )}
          </div>

          {/* Right column — Settings */}
          {meta && !isProcessing && stage !== "done" && (
            <div className="flex flex-col gap-4 animate-fade-in-up animate-fade-in-up-delay-2">
              <div className="glass p-5">
                <SettingsPanel
                  settings={settings}
                  meta={meta}
                  onChange={setSettings}
                />

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    id="optimize-btn"
                    className="btn btn-primary w-full justify-center"
                    disabled={!canOptimize}
                    onClick={handleOptimize}
                  >
                    <Rocket size={16} weight="fill" />
                    Optimize Video
                  </button>

                  <div
                    className="flex items-start gap-2 text-xs p-2.5 rounded-lg"
                    style={{
                      background: "var(--bg-2)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      Processing runs entirely in your browser using
                      FFmpeg.wasm. Large files may take 1–3 minutes.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right column placeholder if no file */}
          {!file && (
            <div
              className="hidden lg:flex flex-col gap-3 animate-fade-in-up animate-fade-in-up-delay-2"
            >
              {/* How it works */}
              <div className="glass p-5">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  How It Works
                </p>
                <div className="flex flex-col gap-4">
                  {[
                    {
                      step: "1",
                      title: "Drop your video",
                      desc: "Any format: MP4, MOV, WebM, AVI — up to any size",
                    },
                    {
                      step: "2",
                      title: "Configure the loop",
                      desc: "Set duration, resolution, quality and poster frame",
                    },
                    {
                      step: "3",
                      title: "Optimize in-browser",
                      desc: "FFmpeg.wasm processes everything locally — no uploads",
                    },
                    {
                      step: "4",
                      title: "Download & ship",
                      desc: "Get the optimized MP4 + WebP poster + React component code",
                    },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{
                          background: "var(--accent-dim)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent-mid)",
                        }}
                      >
                        {step}
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium leading-none mb-1"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {title}
                        </p>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technique breakdown */}
              <div className="glass p-5">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  The 5 Optimization Steps
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    ["Strip audio", "-an · saves ~15%"],
                    ["Trim loop", "-ss -t · cut to 15s"],
                    ["Scale resolution", "vf scale= · reduce pixels"],
                    ["H.264 CRF", "-crf 28 · lossy recompression"],
                    ["Faststart", "+faststart · instant streaming"],
                  ].map(([label, code]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                    >
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {label}
                      </span>
                      <span
                        className="text-[11px] font-mono"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t border-[var(--border)] py-4 mt-auto"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span>BgLoop · Video Optimizer for Website Backgrounds</span>
          <span>Powered by FFmpeg.wasm · Runs 100% client-side</span>
        </div>
      </footer>
    </div>
  );
}
