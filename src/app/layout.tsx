import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "BgLoop — Video Optimizer for Website Backgrounds",
  description:
    "Optimize any large video into a lightweight, fast-loading background loop for your website. Strip audio, trim loops, extract WebP poster frames — all in-browser with zero uploads.",
  keywords: [
    "video optimizer",
    "website background video",
    "FFmpeg web",
    "video compression",
    "webp poster",
    "faststart mp4",
    "web performance",
  ],
  openGraph: {
    title: "BgLoop — Video Optimizer for Website Backgrounds",
    description:
      "Turn any large video into a sub-1MB background loop. In-browser, no uploads, no servers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
