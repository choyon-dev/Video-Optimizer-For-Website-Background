export type VideoPreset = "web-bg" | "hero-bg" | "mobile" | "custom";
export type ProcessingStage =
  | "idle"
  | "loading-ffmpeg"
  | "analyzing"
  | "processing"
  | "done"
  | "error";

export interface VideoMeta {
  filename: string;
  size: number; // bytes
  duration: number; // seconds
  width: number;
  height: number;
  hasAudio: boolean;
  codec: string;
  fps: number;
  bitrate: number;
}

export interface OptimizationSettings {
  preset: VideoPreset;
  // Trim
  trimStart: number;
  trimDuration: number;
  // Resolution
  targetWidth: number; // 0 = keep original
  // Quality
  crf: number; // 18-51
  // Features
  removeAudio: boolean;
  faststart: boolean;
  // Poster
  extractPoster: boolean;
  posterTimestamp: number;
  posterQuality: number; // 1-100
}

export interface OptimizationResult {
  videoBlob: Blob;
  videoFilename: string;
  videoSize: number;
  posterBlob: Blob | null;
  posterFilename: string | null;
  posterSize: number | null;
  processingTime: number; // ms
  originalSize: number;
  compressionRatio: number;
}

export const PRESETS: Record<
  Exclude<VideoPreset, "custom">,
  Omit<OptimizationSettings, "preset" | "trimStart" | "posterTimestamp">
> = {
  "web-bg": {
    trimDuration: 15,
    targetWidth: 1280,
    crf: 28,
    removeAudio: true,
    faststart: true,
    extractPoster: true,
    posterQuality: 85,
  },
  "hero-bg": {
    trimDuration: 30,
    targetWidth: 1920,
    crf: 24,
    removeAudio: true,
    faststart: true,
    extractPoster: true,
    posterQuality: 90,
  },
  mobile: {
    trimDuration: 10,
    targetWidth: 854,
    crf: 32,
    removeAudio: true,
    faststart: true,
    extractPoster: true,
    posterQuality: 80,
  },
};

export const DEFAULT_SETTINGS: OptimizationSettings = {
  preset: "web-bg",
  trimStart: 0,
  trimDuration: 15,
  targetWidth: 1280,
  crf: 28,
  removeAudio: true,
  faststart: true,
  extractPoster: true,
  posterTimestamp: 1,
  posterQuality: 85,
};
