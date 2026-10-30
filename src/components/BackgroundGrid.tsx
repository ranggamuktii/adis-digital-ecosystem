import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

interface BackgroundGridProps {
  opacity?: number;
  size?: number;
  lineColor?: string;
  showDots?: boolean;
}

export const BackgroundGrid: React.FC<BackgroundGridProps> = ({
  opacity = 0.45,
  size = 60,
  lineColor = "rgba(59, 130, 246, 0.08)",
  showDots = true,
}) => {
  const frame = useCurrentFrame();
  const offsetY = (frame * 0.2) % size;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 1, opacity }}>
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="enterprise-grid"
            width={size}
            height={size}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(0, ${offsetY})`}
          >
            <path
              d={`M ${size} 0 L 0 0 0 ${size}`}
              fill="none"
              stroke={lineColor}
              strokeWidth="1"
            />
            {showDots && (
              <circle
                cx="0"
                cy="0"
                r="1.5"
                fill="rgba(34, 211, 238, 0.25)"
              />
            )}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#enterprise-grid)" />
      </svg>
    </AbsoluteFill>
  );
};
