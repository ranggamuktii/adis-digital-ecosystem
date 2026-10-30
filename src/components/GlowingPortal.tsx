import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

interface GlowingPortalProps {
  size?: number;
  scale?: number;
  activeColor?: string;
  glowIntensity?: number;
  pulseSpeed?: number;
}

export const GlowingPortal: React.FC<GlowingPortalProps> = ({
  size = 540,
  scale = 1.0,
  activeColor = COLORS.cyan,
  glowIntensity = 1.0,
  pulseSpeed = 1.0,
}) => {
  const frame = useCurrentFrame();

  const rot1 = (frame * 0.4 * pulseSpeed) % 360;
  const rot2 = (-frame * 0.6 * pulseSpeed) % 360;
  const rot3 = (frame * 0.25 * pulseSpeed) % 360;
  const pulse = 1 + 0.03 * Math.sin((frame * 0.1 * pulseSpeed));

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        transform: `scale(${scale * pulse})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background Solid Blurred Glow Aura (Rule 20 compliant: solid shape with filter: blur) */}
      <div
        style={{
          position: "absolute",
          width: size * 0.75,
          height: size * 0.75,
          borderRadius: "50%",
          backgroundColor: activeColor,
          opacity: 0.18 * glowIntensity,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: size * 0.45,
          height: size * 0.45,
          borderRadius: "50%",
          backgroundColor: activeColor,
          opacity: 0.28 * glowIntensity,
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      {/* SVG Precision Vector Rings */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 500 500"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        {/* Outer Ring 1 - Tick Marks */}
        <g transform={`rotate(${rot1} 250 250)`}>
          <circle
            cx="250"
            cy="250"
            r="220"
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1.5"
            strokeDasharray="4 14"
          />
          <circle
            cx="250"
            cy="250"
            r="216"
            fill="none"
            stroke={activeColor}
            strokeWidth="2"
            strokeDasharray="80 180"
          />
        </g>

        {/* Outer Ring 2 - Segmented Tech Arc */}
        <g transform={`rotate(${rot2} 250 250)`}>
          <circle
            cx="250"
            cy="250"
            r="185"
            fill="none"
            stroke={COLORS.blue}
            strokeWidth="1.5"
            strokeDasharray="12 24"
            opacity="0.6"
          />
          <circle
            cx="250"
            cy="250"
            r="185"
            fill="none"
            stroke={activeColor}
            strokeWidth="3"
            strokeDasharray="110 320"
          />
          {/* Orbital Satellite Node */}
          <circle cx="250" cy="65" r="4.5" fill="#FFFFFF" />
          <circle cx="250" cy="65" r="8" fill="none" stroke={activeColor} strokeWidth="1.5" />
        </g>

        {/* Core Luminous Aperture Ring */}
        <g transform={`rotate(${rot3} 250 250)`}>
          <circle
            cx="250"
            cy="250"
            r="140"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1.5"
          />
          <circle
            cx="250"
            cy="250"
            r="140"
            fill="none"
            stroke={activeColor}
            strokeWidth="4"
            strokeDasharray="60 140"
          />
          <circle
            cx="250"
            cy="250"
            r="120"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
            strokeDasharray="2 8"
          />
        </g>

        {/* Crosshair / Reticle Marks */}
        <line x1="250" y1="90" x2="250" y2="110" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" />
        <line x1="250" y1="390" x2="250" y2="410" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" />
        <line x1="90" y1="250" x2="110" y2="250" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" />
        <line x1="390" y1="250" x2="410" y2="250" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

