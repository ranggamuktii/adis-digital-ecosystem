import React from "react";
import { Img, staticFile } from "remotion";

export type CharacterPose =
  | "senyum"
  | "menyapa"
  | "bingung"
  | "kaget"
  | "pusing";

interface CharacterViewProps {
  pose: CharacterPose;
  frame: number;
  heightPercent?: number;
  rimColor?: string;
  flip?: boolean;
}

const POSE_FILES: Record<CharacterPose, string> = {
  senyum: "character/senyum.png",
  menyapa: "character/menyapa.png",
  bingung: "character/bingung.png",
  kaget: "character/kaget.png",
  pusing: "character/pusing.png",
};

export const CharacterView: React.FC<CharacterViewProps> = ({
  pose,
  frame,
  heightPercent = 54,
  rimColor = "#3B82F6",
  flip = false,
}) => {
  // Organic, lifelike idle breathing & bobbing physics
  const breatheY = Math.sin(frame * 0.08) * 4;
  const breatheScaleY = 1 + Math.sin(frame * 0.08) * 0.008;
  const breatheScaleX = 1 - Math.sin(frame * 0.08) * 0.004;

  // Subtle tilt for expressive posture
  const headTilt = Math.sin(frame * 0.05) * 0.8;

  const src = staticFile(POSE_FILES[pose] || POSE_FILES.senyum);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        transform: `
          translateY(${breatheY}px) 
          scale(${breatheScaleX}, ${breatheScaleY}) 
          rotate(${headTilt}deg)
          ${flip ? "scaleX(-1)" : ""}
        `,
        transformOrigin: "bottom center",
        transition: "transform 0.1s ease-out",
        filter: `
          drop-shadow(0 20px 40px rgba(0, 0, 0, 0.65))
          drop-shadow(0 0 30px ${rimColor}33)
        `,
      }}
    >
      <Img
        src={src}
        style={{
          height: `${heightPercent}vh`,
          width: "auto",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
};
