import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONTS, COLORS } from "../theme";
import { SUBTITLES } from "../data/subtitles";

export const SubtitleBar: React.FC = () => {
  const frame = useCurrentFrame();

  // Find active subtitle
  const activeSub = SUBTITLES.find(
    (s) => frame >= s.startFrame && frame <= s.endFrame
  );

  if (!activeSub) {
    return null;
  }

  // Smooth fade-in & fade-out
  const fadeIn = interpolate(
    frame,
    [activeSub.startFrame, activeSub.startFrame + 6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fadeOut = interpolate(
    frame,
    [activeSub.endFrame - 6, activeSub.endFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 38,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 950,
        pointerEvents: "none",
        padding: "0 80px",
        opacity,
      }}
    >
      <div
        style={{
          backgroundColor: "#000000",
          borderRadius: 0,
          border: "none",
          boxShadow: "none",
          padding: "12px 36px",
          maxWidth: 1440,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        {/* English Subtitle */}
        <div
          style={{
            color: COLORS.white,
            fontFamily: FONTS.heading,
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.28,
            textAlign: "center",
            textShadow: "none",
          }}
        >
          {activeSub.english}
        </div>

        {/* Japanese Subtitle */}
        <div
          style={{
            color: COLORS.japaneseSub,
            fontFamily: FONTS.japanese,
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "0.02em",
            lineHeight: 1.35,
            textAlign: "center",
            opacity: 0.95,
            textShadow: "none",
          }}
        >
          {activeSub.japanese}
        </div>
      </div>
    </div>
  );
};
