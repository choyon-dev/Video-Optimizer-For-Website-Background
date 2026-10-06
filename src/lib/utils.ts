/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

/**
 * Format seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Get estimated output size based on settings
 * Very rough estimate: bitrate × duration
 */
export function estimateOutputSize(
  originalSize: number,
  originalDuration: number,
  trimDuration: number,
  crf: number,
  targetWidth: number,
  originalWidth: number
): number {
  // CRF roughly correlates: CRF 23 ≈ original quality, each +6 halves bitrate
  const crfFactor = Math.pow(0.84, crf - 23);
  // Duration ratio
  const durationRatio = Math.min(trimDuration / originalDuration, 1);
  // Resolution scale (area ratio)
  const resolutionRatio =
    targetWidth > 0
      ? Math.pow(Math.min(targetWidth, originalWidth) / originalWidth, 2)
      : 1;
  // Audio factor (removed audio saves ~10-15%)
  const audioFactor = 0.88;

  return (
    originalSize * crfFactor * durationRatio * resolutionRatio * audioFactor
  );
}

/**
 * Generate the LazyBentoVideo React component code snippet
 */
export function generateCodeSnippet(
  videoFilename: string,
  posterFilename: string | null
): string {
  const videoPath = `/videos/${videoFilename}`;
  const posterPath = posterFilename ? `/videos/${posterFilename}` : null;

  if (!posterPath) {
    return `<video
  autoPlay
  loop
  muted
  playsInline
  preload="none"
  className="absolute inset-0 w-full h-full object-cover"
>
  <source src="${videoPath}" type="video/mp4" />
</video>`;
  }

  return `"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";

export function LazyBgVideo() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative w-full h-full overflow-hidden">
      {/* Poster: shown instantly on page load (10–15 KB) */}
      {!isVisible && (
        <Image
          src="${posterPath}"
          alt=""
          fill
          priority
          className="object-cover"
        />
      )}

      {/* Video: lazy-loaded when user scrolls near */}
      {isVisible && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="${videoPath}" type="video/mp4" />
        </video>
      )}
    </div>
  );
}`;
}

/**
 * Slugify a filename
 */
export function slugifyFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "") // remove extension
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 40);
}

/**
 * Parse video info from ffprobe-style output
 */
export function parseVideoInfo(output: string): {
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  hasAudio?: boolean;
  codec?: string;
  bitrate?: number;
} {
  const result: {
    width?: number;
    height?: number;
    duration?: number;
    fps?: number;
    hasAudio?: boolean;
    codec?: string;
    bitrate?: number;
  } = {};

  // Duration: Duration: 00:02:03.80
  const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  if (durationMatch) {
    result.duration =
      parseInt(durationMatch[1]) * 3600 +
      parseInt(durationMatch[2]) * 60 +
      parseFloat(durationMatch[3]);
  }

  // Resolution: 1280x720
  const resMatch = output.match(/(\d{2,5})x(\d{2,5})/);
  if (resMatch) {
    result.width = parseInt(resMatch[1]);
    result.height = parseInt(resMatch[2]);
  }

  // FPS
  const fpsMatch = output.match(/(\d+(?:\.\d+)?)\s*fps/);
  if (fpsMatch) {
    result.fps = parseFloat(fpsMatch[1]);
  }

  // Bitrate
  const bitrateMatch = output.match(/bitrate:\s*(\d+)\s*kb\/s/);
  if (bitrateMatch) {
    result.bitrate = parseInt(bitrateMatch[1]);
  }

  // Codec
  const codecMatch = output.match(/Video:\s*([a-z0-9]+)/i);
  if (codecMatch) {
    result.codec = codecMatch[1].toLowerCase();
  }

  // Audio
  result.hasAudio = /Audio:/.test(output);

  return result;
}
