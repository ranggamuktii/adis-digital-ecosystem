import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

interface VirtualCameraProps {
  children: React.ReactNode;
  durationInFrames: number;
  zoomFrom?: number;
  zoomTo?: number;
  panXFrom?: number;
  panXTo?: number;
  panYFrom?: number;
  panYTo?: number;
  tiltFrom?: number;
  tiltTo?: number;
  blurFrom?: number;
  blurTo?: number;
}

export const VirtualCamera: React.FC<VirtualCameraProps> = ({
  children,
  durationInFrames,
  zoomFrom = 1.0,
  zoomTo = 1.04,
  panXFrom = 0,
  panXTo = 0,
  panYFrom = 0,
  panYTo = 0,
  tiltFrom = 0,
  tiltTo = 0,
  blurFrom = 0,
  blurTo = 0,
}) => {
  const frame = useCurrentFrame();

  const zoom = interpolate(frame, [0, durationInFrames], [zoomFrom, zoomTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const panX = interpolate(frame, [0, durationInFrames], [panXFrom, panXTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const panY = interpolate(frame, [0, durationInFrames], [panYFrom, panYTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tilt = interpolate(frame, [0, durationInFrames], [tiltFrom, tiltTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const blur = interpolate(frame, [0, durationInFrames], [blurFrom, blurTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        transformOrigin: "center center",
        transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom}) rotate(${tilt}deg)`,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

