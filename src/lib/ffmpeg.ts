"use client";

// @ffmpeg/ffmpeg and @ffmpeg/util are NOT bundled.
// Their ESM files live in public/vendor/ (same-origin).
// We load them at runtime via import() with turbopackIgnore so Turbopack
// never tries to statically analyze them or process their Worker/WASM patterns.

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import type { OptimizationSettings, OptimizationResult } from "./types";
import { slugifyFilename, parseVideoInfo } from "./utils";

type FFmpegModule = { FFmpeg: new () => FFmpeg };
type UtilModule = {
  fetchFile: (data: File | string | ArrayBuffer) => Promise<Uint8Array>;
  toBlobURL: (url: string, mimeType: string) => Promise<string>;
};

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

export async function loadFFmpeg(
  onProgress?: (message: string) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance;

  onProgress?.("Loading FFmpeg engine (one-time download ~3 MB)...");

  // Load from same-origin /vendor — turbopackIgnore bypasses bundler analysis.
  // String literals required; bundler ignore comments must be on the import call.
  const { FFmpeg: FFmpegClass } = (await import(
    /* turbopackIgnore: true */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — runtime path in public/vendor/, not resolvable by TS
    "/vendor/ffmpeg/index.js"
  )) as FFmpegModule;

  const { toBlobURL } = (await import(
    /* turbopackIgnore: true */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — runtime path in public/vendor/, not resolvable by TS
    "/vendor/ffmpeg-util/index.js"
  )) as UtilModule;

  const ffmpeg = new FFmpegClass();
  ffmpegInstance = ffmpeg;

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
  });

  ffmpegLoaded = true;
  onProgress?.("FFmpeg loaded and ready.");
  return ffmpeg;
}

/**
 * Run ffprobe-equivalent to get video metadata
 */
export async function analyzeVideo(
  ffmpeg: FFmpeg,
  file: File,
  onLog?: (msg: string) => void
): Promise<string> {
  const { fetchFile } = (await import(
    /* turbopackIgnore: true */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — runtime path in public/vendor/, not resolvable by TS
    "/vendor/ffmpeg-util/index.js"
  )) as UtilModule;

  onLog?.("Writing file to virtual FS...");
  await ffmpeg.writeFile("input.mp4", await fetchFile(file));

  let probeOutput = "";

  const logHandler = ({ message }: { message: string }) => {
    probeOutput += message + "\n";
    onLog?.(message);
  };

  ffmpeg.on("log", logHandler);

  // ffmpeg exits with error when no output is specified — that's expected;
  // it still logs all metadata we need to stderr.
  try {
    await ffmpeg.exec(["-i", "input.mp4"]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    // intentional — ffprobe-style probe
  }

  ffmpeg.off("log", logHandler);
  return probeOutput;
}

/**
 * Main optimization pipeline
 */
export async function optimizeVideo(
  ffmpeg: FFmpeg,
  file: File,
  settings: OptimizationSettings,
  originalProbeOutput: string,
  onLog?: (msg: string) => void,
  onProgress?: (pct: number) => void
): Promise<OptimizationResult> {
  const startTime = Date.now();
  const slug = slugifyFilename(file.name);
  const outputFilename = `${slug}-optimized.mp4`;
  const posterFilename = settings.extractPoster
    ? `${slug}-poster.webp`
    : null;

  const originalInfo = parseVideoInfo(originalProbeOutput);
  const originalWidth = originalInfo.width ?? 1280;
  const originalHeight = originalInfo.height ?? 720;
  const originalDuration = originalInfo.duration ?? 60;

  const targetW =
    settings.targetWidth > 0 && settings.targetWidth < originalWidth
      ? settings.targetWidth
      : originalWidth;
  const targetH = Math.round((targetW / originalWidth) * originalHeight);
  const w = targetW % 2 === 0 ? targetW : targetW - 1;
  const h = targetH % 2 === 0 ? targetH : targetH - 1;

  const trimDur = Math.min(
    settings.trimDuration,
    originalDuration - settings.trimStart
  );

  onLog?.(`\n--- Step 1: Building FFmpeg command ---`);

  const args: string[] = [
    "-ss", settings.trimStart.toString(),
    "-t", trimDur.toString(),
    "-i", "input.mp4",
    "-c:v", "libx264",
    "-crf", settings.crf.toString(),
    "-preset", "fast",
    "-vf", `scale=${w}:${h}`,
    "-profile:v", "baseline",
    "-level", "3.0",
    "-pix_fmt", "yuv420p",
  ];

  if (settings.removeAudio) {
    args.push("-an");
    onLog?.("Audio: STRIPPED (-an)");
  } else {
    args.push("-c:a", "aac", "-b:a", "128k");
    onLog?.("Audio: Kept (AAC 128k)");
  }

  if (settings.faststart) {
    args.push("-movflags", "+faststart");
    onLog?.("Faststart: ENABLED (moov atom moved to front)");
  }

  args.push(outputFilename);

  onLog?.(`Command: ffmpeg ${args.join(" ")}\n`);
  onLog?.(`--- Step 2: Processing video ---`);

  const progressHandler = ({ progress }: { progress: number }) => {
    const pct = Math.round(progress * 100);
    onProgress?.(Math.min(pct, 95));
  };
  ffmpeg.on("progress", progressHandler);

  await ffmpeg.exec(args);
  ffmpeg.off("progress", progressHandler);

  onProgress?.(96);
  onLog?.(`\n--- Step 3: Reading output ---`);

  const videoData = await ffmpeg.readFile(outputFilename);
  const videoSrc =
    videoData instanceof Uint8Array ? videoData : new Uint8Array();
  const videoBuf = videoSrc.buffer.slice(
    videoSrc.byteOffset,
    videoSrc.byteOffset + videoSrc.byteLength
  ) as ArrayBuffer;
  const videoBlob = new Blob([videoBuf], { type: "video/mp4" });

  onLog?.(`Video output: ${(videoBlob.size / 1024).toFixed(1)} KB`);

  let posterBlob: Blob | null = null;
  let posterSize: number | null = null;

  if (settings.extractPoster && posterFilename) {
    onLog?.(`\n--- Step 4: Extracting poster frame ---`);
    const posterTs = Math.min(
      settings.posterTimestamp,
      settings.trimStart + trimDur - 0.1
    );

    await ffmpeg.exec([
      "-ss", posterTs.toString(),
      "-i", outputFilename,
      "-vframes", "1",
      "-q:v", Math.round(((100 - settings.posterQuality) / 100) * 31 + 1).toString(),
      "-f", "webp",
      posterFilename,
    ]);

    try {
      const posterData = await ffmpeg.readFile(posterFilename);
      const posterSrc =
        posterData instanceof Uint8Array ? posterData : new Uint8Array();
      const posterBuf = posterSrc.buffer.slice(
        posterSrc.byteOffset,
        posterSrc.byteOffset + posterSrc.byteLength
      ) as ArrayBuffer;
      posterBlob = new Blob([posterBuf], { type: "image/webp" });
      posterSize = posterBlob.size;
      onLog?.(`Poster: ${(posterSize / 1024).toFixed(1)} KB WebP`);
    } catch {
      onLog?.("Warning: Could not extract poster frame.");
    }
  }

  onProgress?.(100);

  const processingTime = Date.now() - startTime;
  const compressionRatio = file.size / videoBlob.size;

  onLog?.(`\n--- Done in ${(processingTime / 1000).toFixed(1)}s ---`);
  onLog?.(
    `Compression ratio: ${compressionRatio.toFixed(1)}x (${(
      (1 - 1 / compressionRatio) * 100
    ).toFixed(0)}% smaller)`
  );

  return {
    videoBlob,
    videoFilename: outputFilename,
    videoSize: videoBlob.size,
    posterBlob,
    posterFilename,
    posterSize,
    processingTime,
    originalSize: file.size,
    compressionRatio,
  };
}
