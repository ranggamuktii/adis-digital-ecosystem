import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { Cpu, ShieldCheck } from "lucide-react";
import { COLORS, FONTS, SHAPES } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";

export const EndCreditScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cameraZoom = interpolate(frame, [0, 90], [1.0, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 180 },
  });

  const titleSpring = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 15, stiffness: 180 },
  });

  const subSpring = spring({
    frame: Math.max(0, frame - 24),
    fps,
    config: { damping: 15, stiffness: 180 },
  });

  const sceneFadeIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.sceneBackgrounds.credit,
        overflow: "hidden",
        fontFamily: FONTS.body,
        opacity: sceneFadeIn,
      }}
    >
      <BackgroundGrid opacity={0.4} lineColor="rgba(59, 130, 246, 0.08)" />

      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "35%",
          width: 800,
          height: 800,
          borderRadius: "50%",
          backgroundColor: COLORS.blue,
          filter: "blur(260px)",
          opacity: 0.1,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "center center",
          transform: `scale(${cameraZoom})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 26,
            zIndex: 300,
            maxWidth: 1200,
          }}
        >
          {/* Logo Card */}
          <div
            style={{
              backgroundColor: "rgba(13, 21, 38, 0.92)",
              border: "1.5px solid rgba(255, 255, 255, 0.2)",
              borderRadius: SHAPES.cardRadius,
              padding: "26px 60px",
              boxShadow: "0 28px 70px rgba(0, 0, 0, 0.65), 0 0 40px rgba(59, 130, 246, 0.2)",
              backdropFilter: SHAPES.backdropBlur,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${logoSpring})`,
              opacity: logoSpring,
            }}
          >
            <Img
              src={staticFile("logo/logo-light.png")}
              style={{
                height: 76,
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          {/* Company Name */}
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 54,
              fontWeight: 900,
              color: COLORS.white,
              letterSpacing: 2,
              textTransform: "uppercase",
              transform: `translateY(${interpolate(titleSpring, [0, 1], [24, 0])}px)`,
              opacity: titleSpring,
              lineHeight: 1.2,
            }}
          >
            PT Asian Isuzu Casting Center
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
              opacity: subSpring,
            }}
          >
            <ShieldCheck size={28} color={COLORS.blue} />
            <span
              style={{
                fontFamily: FONTS.heading,
                fontSize: 28,
                fontWeight: 900,
                color: COLORS.blue,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Corporate Video Production
            </span>
          </div>

          {/* Department Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              backgroundColor: "rgba(59, 130, 246, 0.12)",
              border: "1.5px solid rgba(59, 130, 246, 0.4)",
              borderRadius: SHAPES.pillRadius,
              padding: "14px 34px",
              boxShadow: "0 12px 28px rgba(0, 0, 0, 0.45)",
              transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
              opacity: subSpring,
            }}
          >
            <Cpu size={24} color={COLORS.white} />
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: 24,
                fontWeight: 800,
                color: COLORS.white,
                letterSpacing: 1,
              }}
            >
              Powered by IT Department
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

