import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";

export const CorporateHeaderLogo: React.FC = () => {
  const frame = useCurrentFrame();

  // Gracefully fades in at the start, and fades out when Scene 7 giant corporate resolve lands (frame 1460 - 1510)
  const opacity = interpolate(
    frame,
    [0, 20, 1460, 1500],
    [0, 0.95, 0.95, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (opacity <= 0.01) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 38,
        left: 52,
        zIndex: 50,
        opacity,
        display: "flex",
        alignItems: "center",
        gap: 14,
        pointerEvents: "none",
      }}
    >
      <Img
        src={staticFile("logo/logo-light.png")}
        style={{
          height: 38,
          width: "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 2px 10px rgba(0, 0, 0, 0.7))",
        }}
      />
    </div>
  );
};
