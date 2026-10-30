// ============================================================
// AICC Remotion - Theme & Design Tokens
// Rule 20 Compliant: Strictly NO GRADIENT FILLS
// All fills are solid colors; glows are solid shapes blurred
// ============================================================

import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadSpace } from "@remotion/google-fonts/SpaceGrotesk";

// Load Google Fonts deterministically for Remotion headless render
const jakarta = loadJakarta("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

const noto = loadNoto("normal", {
  weights: ["500", "700"],
  ignoreTooManyRequestsWarning: true,
});

const space = loadSpace("normal", {
  weights: ["700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

export const FONTS = {
  heading: `${jakarta.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  body: `${jakarta.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  accent: `${space.fontFamily}, sans-serif`,
  japanese: `${noto.fontFamily}, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`,
  mono: `${jakarta.fontFamily}, sans-serif`, // Fallback alias
};

// Corporate obsidian palette with high-contrast accents (Rule: Zero yellow/gold)
export const COLORS = {
  base: "#060D1F",
  baseDark: "#030712",
  surface: "#0B1B3A",
  surfaceLight: "#162B55",
  cardBorder: "rgba(255, 255, 255, 0.14)",

  // Brand and functional accent colors (Electric Cyan, Emerald, Electric Blue, Electric Violet)
  cyan: "#22D3EE",          // Production & Gateway
  blue: "#3B82F6",          // IoT & Connectivity
  purple: "#A855F7",        // AI & Cognitive Platform (No yellow/gold)
  purpleLight: "#C084FC",   // AI Soft Lavender Highlight
  emerald: "#10B981",       // Quality & Verification
  red: "#EF4444",           // Critical alert
  white: "#FFFFFF",
  textMuted: "#94A3B8",
  textSubtle: "#64748B",
  japaneseSub: "#CFFAFE",    // Readable light cyan for Japanese subtitles

  // Alias for backward compatibility (mapped directly to purple to eradicate yellow)
  gold: "#A855F7",

  sceneBackgrounds: {
    credit: "#050810",
    dark: "#060D1F",
  },
};

export const SHAPES = {
  cardRadius: 0,
  innerRadius: 0,
  pillRadius: 9999,
  backdropBlur: "blur(20px)",
};

export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 1740, // 58 seconds at 30 fps
};
