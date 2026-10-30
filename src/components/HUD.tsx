import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONTS, COLORS } from "../theme";

interface HUDProps {
  totalFrames?: number;
}

export const HUD: React.FC<HUDProps> = ({ totalFrames = 1740 }) => {
  const frame = useCurrentFrame();

  // Subtle fade in after scene 1 settles, fade out before final corporate resolve
  const opacity = interpolate(
    frame,
    [15, 35, 1580, 1610],
    [0, 0.9, 0.9, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (opacity <= 0.01) {
    return null;
  }

  // Format current time as MM:SS:FF
  const seconds = Math.floor(frame / 30);
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  const remFrames = frame % 30;
  const timecode = `${String(minutes).padStart(2, "0")}:${String(remSec).padStart(2, "0")}:${String(remFrames).padStart(2, "0")}`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 900,
        pointerEvents: "none",
        opacity,
      }}
    >
      {/* Top Left: Official AICC Brand Mark */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 48,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Img
          src={staticFile("logo/logo-light.png")}
          style={{
            height: 44,
            width: "auto",
            objectFit: "contain",
            display: "block",
            filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))",
          }}
        />
        <div
          style={{
            height: 24,
            width: 1,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
          }}
        />
        <span
          style={{
            fontFamily: FONTS.heading,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            color: COLORS.white,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          ADIS DIGITAL ECOSYSTEM
        </span>
      </div>

      {/* Top Right: Status Badge & System Live Indicator */}
      <div
        style={{
          position: "absolute",
          top: 36,
          right: 48,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* Live Status Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(11, 27, 58, 0.75)",
            border: "1px solid rgba(34, 211, 238, 0.3)",
            borderRadius: 9999,
            padding: "6px 14px",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: COLORS.cyan,
              boxShadow: "0 0 8px #22D3EE",
            }}
          />
          <span
            style={{
              fontFamily: FONTS.heading,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1.2,
              color: COLORS.cyan,
            }}
          >
            AICC • CORE ONLINE
          </span>
        </div>

        {/* Timecode */}
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: 13,
            color: COLORS.textMuted,
            letterSpacing: 1,
            backgroundColor: "rgba(6, 13, 31, 0.6)",
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {timecode}
        </div>
      </div>
    </div>
  );
};
