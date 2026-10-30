import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { COLORS } from "../theme";

interface SceneTransitionProps {
  globalFrame: number;
  cutFrames?: number[];
  finaleCut?: number;
}

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  globalFrame,
  cutFrames = [],
  finaleCut,
}) => {
  // Standard in-between scene transitions (smooth blur dip)
  let standardOpacity = 0;
  let standardBlur = 0;
  const HALF_DURATION = 6;

  for (const cut of cutFrames) {
    if (globalFrame >= cut - HALF_DURATION && globalFrame <= cut + HALF_DURATION) {
      const progress = (globalFrame - (cut - HALF_DURATION)) / (HALF_DURATION * 2);
      const curve = progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
      standardOpacity = interpolate(curve, [0, 1], [0, 0.85]);
      standardBlur = interpolate(curve, [0, 1], [0, 16]);
      break;
    }
  }

  // Grand Finale Luminous Sweep (Solid colored shapes blurred - strictly NO gradients)
  const finaleHalf = 10;
  const isFinale =
    finaleCut !== undefined &&
    globalFrame >= finaleCut - finaleHalf &&
    globalFrame <= finaleCut + finaleHalf;

  if (standardOpacity <= 0.01 && !isFinale) {
    return null;
  }

  if (isFinale && finaleCut !== undefined) {
    const progress = (globalFrame - (finaleCut - finaleHalf)) / (finaleHalf * 2);
    const beamX = interpolate(progress, [0, 1], [-400, 2320], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const beamOpacity = interpolate(progress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

    return (
      <AbsoluteFill style={{ pointerEvents: "none", zIndex: 960 }}>
        {/* Soft background transition haze */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: COLORS.baseDark,
            opacity: interpolate(progress, [0, 0.5, 1], [0, 0.6, 0]),
            backdropFilter: `blur(${interpolate(progress, [0, 0.5, 1], [0, 14, 0])}px)`,
          }}
        />

        {/* Luminous Solid Light Sweep Bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: beamX,
            width: 140,
            backgroundColor: COLORS.white,
            filter: "blur(36px)",
            opacity: beamOpacity * 0.9,
            mixBlendMode: "screen",
          }}
        />
        {/* Outer Cyan Halo */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: beamX - 80,
            width: 300,
            backgroundColor: COLORS.cyan,
            filter: "blur(72px)",
            opacity: beamOpacity * 0.6,
            mixBlendMode: "screen",
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.base,
        opacity: standardOpacity,
        backdropFilter: `blur(${standardBlur}px)`,
        pointerEvents: "none",
        zIndex: 950,
      }}
    />
  );
};
