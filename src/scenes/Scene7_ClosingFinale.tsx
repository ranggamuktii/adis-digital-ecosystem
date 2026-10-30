import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { VirtualCamera } from "../components/VirtualCamera";

/* -------------------------------------------------------------------------- */
/*  KONSEP FINALE: "GONG"                                                     */
/*  1. TEGANG   : lockup ADIS tidak memudar, tapi DISEDOT jadi satu garis     */
/*                cahaya lalu satu titik. Garis kecepatan menyerbu ke pusat.  */
/*  2. PUKULAN  : white-out, flare sinematik, kamera menghentak.              */
/*  3. RESONANSI: seperti gong dipukul — kamera & cincin bergetar lalu        */
/*                meredam. Empat warna pilar menyatu jadi satu cincin.        */
/*  4. REVEAL   : logo menghantam masuk, nama perusahaan masuk kata demi kata,*/
/*                lalu cahaya menyapu logo dan menjalar di nama perusahaan.   */
/*                                                                            */
/*  Stage 1920x1080, di-scale otomatis mengikuti resolusi komposisi.          */
/* -------------------------------------------------------------------------- */
const STAGE_W = 1920;
const STAGE_H = 1080;
const CX = STAGE_W / 2;
const CY = STAGE_H / 2;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const easeIn = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });

/* -------------------------------------------------------------------------- */
/*  TIMELINE (295 frame @ 30fps)                                              */
/* -------------------------------------------------------------------------- */
const T = {
  dotsIn: 16, // empat pilar mulai mengorbit
  convStart: 132, // penyedotan dimulai
  impact: 164, // PUKULAN GONG
  outStart: 275, // fade akhir video
  end: 295,
} as const;

/* -------------------------------------------------------------------------- */
/*  DATA                                                                      */
/* -------------------------------------------------------------------------- */
const PILLARS = [
  { label: "PRODUCTION", color: COLORS.cyan },
  { label: "QUALITY", color: COLORS.emerald },
  { label: "IoT", color: COLORS.blue },
  { label: "AI", color: COLORS.purple },
];

const PILLAR_TEXT = ["Production", "Quality", "IoT", "AI"];
const HOLD_R = 460; // jarak kepala jalur dari pusat saat "menunggu"

// Sudut arah jalur pilar (kuadran layar, derajat searah jarum jam)
const RING_ANGLES = [225, 315, 135, 45];

// Partikel debu ambient halus yang melayang pelan
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  x: random(`s7-mote-x-${i}`),
  y: random(`s7-mote-y-${i}`),
  r: 1 + random(`s7-mote-r-${i}`) * 2,
  speed: 0.25 + random(`s7-mote-v-${i}`) * 0.5,
  phase: random(`s7-mote-p-${i}`) * Math.PI * 2,
}));

/* -------------------------------------------------------------------------- */
/*  KOMPONEN KECIL                                                            */
/* -------------------------------------------------------------------------- */
const MaskText: React.FC<{ children: React.ReactNode; progress: number }> = ({ children, progress }) => (
  <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 6 }}>
    <span style={{ display: "inline-block", transform: `translateY(${(1 - progress) * 105}%)` }}>
      {children}
    </span>
  </span>
);

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
/* -------------------------------------------------------------------------- */
export const Scene7_ClosingFinale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = Math.min(width / STAGE_W, height / STAGE_H);
  const logoSrc = staticFile("logo/logo-light.png");

  const spr = (delay: number, damping = 16, stiffness = 120) =>
    spring({ frame: Math.max(0, frame - delay), fps, config: { damping, stiffness } });

  const impact = T.impact;
  const since = frame - impact;

  /* ---- Fase 1: lockup ADIS disedot ------------------------------------ */
  const lockOpacity = interpolate(frame, [0, 20, impact - 8, impact - 2], [0, 1, 1, 0], clamp);
  const collapse = easeIn(frame, T.convStart - 4, impact - 2);
  const conv = easeIn(frame, T.convStart, impact);
  const underline = easeOut(frame, 24, 54) * 420;

  const singularity = easeIn(frame, T.convStart + 6, impact - 1) * (frame < impact ? 1 : 0);

  const runIn = easeOut(frame, T.dotsIn, T.dotsIn + 44);
  const runR = lerp(1250, HOLD_R + Math.sin(frame / 18) * 6, runIn) * (1 - conv);
  const runTrail = lerp(380, 260, conv);
  const runFade =
    easeOut(frame, T.dotsIn, T.dotsIn + 14) *
    (1 - interpolate(frame, [impact - 6, impact], [0, 1], clamp));

  const runner = (i: number) => {
    const a = (RING_ANGLES[i] * Math.PI) / 180;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    return {
      head: { x: CX + dx * runR, y: CY + dy * runR },
      tail: { x: CX + dx * (runR + runTrail), y: CY + dy * (runR + runTrail) },
    };
  };

  /* ---- Fase 2: pukulan gong (halus & elegan) -------------------------- */
  const whiteOut = interpolate(frame, [impact - 1, impact, impact + 8], [0, 0.25, 0], clamp);
  const flash = interpolate(frame, [impact - 2, impact + 2, impact + 18], [0, 0.35, 0], clamp);
  const surge = interpolate(frame, [impact, impact + 10, impact + 40], [0, 0.2, 0], clamp);

  // Kamera stabil: sedikit getaran halus yang cepat teredam
  const gongZoom = 1;
  const shakeAmp = since >= 0 ? 3 * Math.exp(-since / 8) : 0;
  const shakeX = (random(`s7-shake-x-${frame}`) - 0.5) * 2 * shakeAmp;
  const shakeY = (random(`s7-shake-y-${frame}`) - 0.5) * 2 * shakeAmp;

  const flareW = interpolate(frame, [impact, impact + 24], [200, 1600], {
    ...clamp,
    easing: Easing.out(Easing.exp),
  });
  const flareO = interpolate(frame, [impact - 1, impact + 2, impact + 22], [0, 0.5, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  /* ---- Fase 3: identitas perusahaan (tenang & prestisius) ------------- */
  const corpOpacity = interpolate(frame, [impact - 2, impact + 8, T.outStart, T.end], [0, 1, 1, 0], clamp);
  const exitT = easeIn(frame, T.outStart, T.end);

  const logoS = spring({
    frame: Math.max(0, frame - (impact + 2)),
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const divisionS = spr(impact + 18, 18, 110);
  const badgeS = spr(impact + 30, 18, 110);
  const motesOpacity = interpolate(frame, [impact, impact + 30, T.outStart, T.end], [0, 0.7, 0.7, 0], clamp);

  return (
    <VirtualCamera durationInFrames={295} zoomFrom={1.0} zoomTo={1.04}>
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.base,
          overflow: "hidden",
          transform: `translate(${shakeX}px, ${shakeY}px) scale(${gongZoom})`,
        }}
      >
        {/* Grid dengan parallax lambat; menyala sesaat saat impact */}
        <div
          style={{
            position: "absolute",
            inset: -60,
            transform: `translate(${-frame * 0.16}px, ${-frame * 0.09}px)`,
          }}
        >
          <BackgroundGrid opacity={0.35 + surge * 0.5} size={70} lineColor="rgba(34, 211, 238, 0.08)" />
        </div>

        {/* ------------------------- STAGE 1920x1080 ------------------------ */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: STAGE_W,
            height: STAGE_H,
            transform: `translate(-50%, -50%) scale(${k})`,
          }}
        >
          {/* Cahaya ambient: meredup saat disedot, melonjak saat dipukul */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: CY,
              width: 850,
              height: 850,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              backgroundColor: COLORS.surface,
              filter: "blur(200px)",
              opacity: 0.78 - collapse * 0.35 + surge + Math.sin(frame / 26) * 0.05,
              pointerEvents: "none",
            }}
          />

          {/* Debu cahaya halus di bagian penutup */}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: motesOpacity }}
          >
            {MOTES.map((m, i) => {
              const yy = (((m.y * STAGE_H - frame * m.speed * 1.2) % STAGE_H) + STAGE_H) % STAGE_H;
              const tw = 0.12 + (Math.sin(frame / 20 + m.phase) + 1) * 0.12;
              return <circle key={i} cx={m.x * STAGE_W} cy={yy} r={m.r} fill={COLORS.cyan} opacity={tw} />;
            })}
          </svg>

          {/* =============================================================== */}
          {/*  FASE 1: "GATING" — empat jalur pilar menuju satu titik tuang   */}
          {/* =============================================================== */}

          {/* Empat jalur pilar dari sudut layar */}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none" }}
          >
            <defs>
              {PILLARS.map((pl, i) => {
                const { head, tail } = runner(i);
                return (
                  <linearGradient
                    key={pl.label}
                    id={`s7-run-${i}`}
                    gradientUnits="userSpaceOnUse"
                    x1={tail.x}
                    y1={tail.y}
                    x2={head.x}
                    y2={head.y}
                  >
                    <stop offset="0" stopColor={pl.color} stopOpacity={0} />
                    <stop offset="1" stopColor={pl.color} stopOpacity={0.95} />
                  </linearGradient>
                );
              })}
            </defs>
            {runFade > 0 &&
              PILLARS.map((pl, i) => {
                const { head, tail } = runner(i);
                return (
                  <g key={pl.label} opacity={runFade}>
                    <line
                      x1={tail.x}
                      y1={tail.y}
                      x2={head.x}
                      y2={head.y}
                      stroke={`url(#s7-run-${i})`}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <circle cx={head.x} cy={head.y} r={5.5} fill={pl.color} />
                  </g>
                );
              })}
          </svg>

          {/* Lockup ADIS: bersih, lalu menyempit jadi satu garis cahaya saat disedot */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: CY,
              transform: `translate(-50%, -50%) scale(${1 - collapse * 0.985}, ${1 - collapse * 0.8}) rotate(${collapse * -5}deg)`,
              filter:
                collapse > 0.02
                  ? `blur(${collapse * 5}px) brightness(${1 + collapse * 1.8})`
                  : undefined,
              opacity: lockOpacity,
              zIndex: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            {/* ADIS: huruf naik dari balik mask, tanpa glow */}
            <div style={{ display: "flex", lineHeight: 0.95 }}>
              {"ADIS".split("").map((ch, i) => {
                const s = Math.min(
                  1,
                  spring({
                    frame: Math.max(0, frame - 10 - i * 4),
                    fps,
                    config: { damping: 40, stiffness: 220 },
                  }),
                );
                return (
                  <span
                    key={i}
                    style={{ display: "inline-block", overflow: "hidden", paddingTop: 8, paddingBottom: 12 }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        fontFamily: FONTS.heading,
                        fontSize: 154,
                        fontWeight: 900,
                        color: COLORS.white,
                        letterSpacing: "-0.035em",
                        transform: `translateY(${(1 - s) * 105}%)`,
                      }}
                    >
                      {ch}
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Garis tipis, tanpa shadow */}
            <div style={{ width: underline, height: 2, backgroundColor: COLORS.cyan }} />

            {/* Nama lengkap sistem */}
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.cyan,
                letterSpacing: "0.02em",
                opacity: easeOut(frame, 30, 46),
              }}
            >
              AICC Digital Ecosystem
            </div>

            {/* Tagline: kalimat biasa, bukan huruf kapital semua */}
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 30,
                lineHeight: 1.35,
                marginTop: 6,
                letterSpacing: "0.005em",
              }}
            >
              <div style={{ fontWeight: 500, color: "rgba(255, 255, 255, 0.72)" }}>
                <MaskText progress={spr(34, 40, 220)}>Today’s Digital Foundation,</MaskText>
              </div>
              <div style={{ fontWeight: 700, color: COLORS.white }}>
                <MaskText progress={spr(42, 40, 220)}>Advancing Toward an AI-Powered Future</MaskText>
              </div>
            </div>

            {/* Empat pilar: kolom dengan garis warna di atas (warna sama dengan cincin Fase 3) */}
            <div style={{ display: "flex", gap: 20, marginTop: 22 }}>
              {PILLARS.map((pl, i) => {
                const bar = easeOut(frame, 54 + i * 6, 72 + i * 6);
                const label = easeOut(frame, 58 + i * 6, 76 + i * 6);
                return (
                  <div key={pl.label} style={{ width: 170, textAlign: "left" }}>
                    <div style={{ height: 3, width: `${bar * 100}%`, backgroundColor: pl.color }} />
                    <div
                      style={{
                        marginTop: 10,
                        fontFamily: FONTS.heading,
                        fontSize: 20,
                        fontWeight: 700,
                        color: COLORS.white,
                        opacity: label,
                        transform: `translateY(${(1 - label) * 8}px)`,
                      }}
                    >
                      {PILLAR_TEXT[i]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Singularitas: titik putih yang membesar tepat sebelum pukulan */}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, zIndex: 22, pointerEvents: "none" }}
          >
            <circle
              cx={CX}
              cy={CY}
              r={lerp(4, 70, singularity)}
              fill={COLORS.white}
              opacity={singularity * 0.55}
              style={{ filter: "blur(18px)" }}
            />
            <circle
              cx={CX}
              cy={CY}
              r={lerp(2, 20, singularity)}
              fill={COLORS.white}
              opacity={singularity}
              style={{ filter: `drop-shadow(0 0 28px ${COLORS.cyan})` }}
            />
          </svg>

          {/* =============================================================== */}
          {/*  FASE 2: PUKULAN — solid shape + blur (Rule 20 compliant)       */}
          {/* Kilatan halus saat impact */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: CY,
              width: 360,
              height: 360,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: COLORS.cyan,
              filter: "blur(60px)",
              opacity: flash * 0.18,
              pointerEvents: "none",
              zIndex: 24,
            }}
          />

          {/* Flare anamorphic lembut */}
          <div
            style={{
              position: "absolute",
              left: CX - flareW / 2,
              top: CY - 2,
              width: flareW,
              height: 4,
              borderRadius: 999,
              backgroundColor: COLORS.cyan,
              filter: "blur(4px)",
              boxShadow: `0 0 24px 4px ${COLORS.cyan}`,
              opacity: flareO * 0.6,
              mixBlendMode: "screen",
              pointerEvents: "none",
              zIndex: 27,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: CX - flareW * 0.3,
              top: CY - 1,
              width: flareW * 0.6,
              height: 2,
              borderRadius: 999,
              backgroundColor: COLORS.white,
              filter: "blur(1px)",
              opacity: flareO * 0.6,
              pointerEvents: "none",
              zIndex: 27,
            }}
          />

          {/* Gelombang kejut halus (hanya 2 cincin lembut) */}
          {[0, 16].map((delay, i) => {
            const start = impact + delay;
            const size = interpolate(frame, [start, start + 45], [220, 480], {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            });
            const peak = 0.22 * Math.pow(0.7, i);
            const opacity = interpolate(frame, [start, start + 5, start + 45], [0, peak, 0], clamp);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: CX,
                  top: CY,
                  width: size,
                  height: size,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `${Math.max(1, 2 - i * 0.5)}px solid ${COLORS.cyan}`,
                  opacity,
                  pointerEvents: "none",
                  zIndex: 23,
                }}
              />
            );
          })}

          {/* =============================================================== */}
          {/*  FASE 3: identitas perusahaan (tenang, prestisius, elegan)      */}
          {/* =============================================================== */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: CY,
              transform: `translate(-50%, -50%) scale(${1 + exitT * 0.03})`,
              filter: exitT > 0.02 ? `blur(${exitT * 6}px)` : undefined,
              opacity: corpOpacity,
              zIndex: 25,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            {/* Logo Resmi AICC: bersih, tajam, elegan */}
            <div
              style={{
                position: "relative",
                display: "inline-block",
                opacity: logoS,
                transform: `scale(${lerp(0.96, 1, logoS)})`,
              }}
            >
              <Img
                src={logoSrc}
                style={{
                  height: 140,
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            {/* Garis aksen cyan tipis */}
            <div
              style={{
                width: 64,
                height: 2,
                backgroundColor: COLORS.cyan,
                marginTop: 6,
                marginBottom: 2,
                opacity: divisionS,
                transform: `scaleX(${divisionS})`,
              }}
            />

            {/* Divisi */}
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.white,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                opacity: divisionS,
                transform: `translateY(${(1 - divisionS) * 10}px)`,
              }}
            >
              Digital Transformation Division
            </div>

            {/* Departemen */}
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.cyan,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: badgeS,
                transform: `translateY(${(1 - badgeS) * 10}px)`,
              }}
            >
              Powered by IT Department
            </div>
          </div>
        </div>

        {/* White-out tepat di momen pukulan (di luar stage agar menutup seluruh layar) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: COLORS.white,
            opacity: whiteOut,
            pointerEvents: "none",
            zIndex: 40,
          }}
        />
      </AbsoluteFill>
    </VirtualCamera>
  );
};