import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Brain, Factory, Radio, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { COLORS, FONTS } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { GlowingPortal } from "../components/GlowingPortal";
import { VirtualCamera } from "../components/VirtualCamera";

/* -------------------------------------------------------------------------- */
/*  TIMELINE (dalam frame @ 30fps, total 215 frame)                           */
/*  Ubah angka di sini untuk mengatur tempo seluruh scene.                    */
/* -------------------------------------------------------------------------- */
const T = {
  portalIn: 6, // portal mulai muncul
  pillarIn: 14, // pilar pertama masuk
  pillarStagger: 7, // jeda antar pilar
  convergeStart: 66, // pilar mulai ditarik ke tengah
  impact: 130, // momen tabrakan / ledakan
  title: 134, // lockup ADIS mulai muncul
  fuse: 40, // (relatif terhadap title) empat chip melebur jadi satu kapsul
} as const;

const CANVAS_REF_WIDTH = 1920; // posisi pilar dirancang untuk 1920px
const SWIRL_STRENGTH = 150; // seberapa melengkung lintasan pilar (px)
const RING_RADIUS = 310; // radius cincin empat warna setelah impact (px @1920)

/* -------------------------------------------------------------------------- */
/*  DATA                                                                      */
/* -------------------------------------------------------------------------- */
interface Pillar {
  label: string;
  Icon: LucideIcon;
  x: number;
  y: number;
  color: string;
}

const PILLARS: Pillar[] = [
  { label: "PRODUCTION", Icon: Factory, x: -460, y: -160, color: COLORS.cyan },
  { label: "QUALITY", Icon: ShieldCheck, x: 460, y: -160, color: COLORS.emerald },
  { label: "IoT", Icon: Radio, x: -460, y: 160, color: COLORS.blue },
  { label: "AI", Icon: Brain, x: 460, y: 160, color: COLORS.purple },
];

// Partikel aksen halus (subtle & elegant, bukan ledakan agresif)
const BURST = Array.from({ length: 12 }, (_, i) => ({
  angle: random(`burst-a-${i}`) * Math.PI * 2,
  speed: 120 + random(`burst-s-${i}`) * 220,
  width: 1.0 + random(`burst-w-${i}`) * 1.5,
  dot: i % 2 === 0,
  color: PILLARS[i % PILLARS.length].color,
}));

const DUST = Array.from({ length: 22 }, (_, i) => ({
  x: random(`dust-x-${i}`),
  y: random(`dust-y-${i}`),
  r: 1 + random(`dust-r-${i}`) * 2,
  speed: 0.25 + random(`dust-v-${i}`) * 0.5,
  phase: random(`dust-p-${i}`) * Math.PI * 2,
}));

/* -------------------------------------------------------------------------- */
/*  HELPERS                                                                   */
/* -------------------------------------------------------------------------- */
// Ease-in tajam: pilar melambat di awal lalu "tersedot" sangat cepat ke pusat
const easeConverge = Easing.bezier(0.62, 0, 0.92, 0.38);

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** Posisi pilar relatif ke pusat layar. p = progres konvergensi (sudah di-ease). */
const getPillarPosition = (pillar: Pillar, p: number, k: number) => {
  const sx = pillar.x * k;
  const sy = pillar.y * k;
  const len = Math.hypot(sx, sy) || 1;
  // Vektor tegak lurus → semua pilar berputar searah (efek pusaran)
  const nx = -sy / len;
  const ny = sx / len;
  const arc = Math.sin(Math.PI * p) * SWIRL_STRENGTH * k;
  return {
    x: sx * (1 - p) + nx * arc,
    y: sy * (1 - p) + ny * arc,
  };
};

/** Sudut tengah busur cincin untuk tiap pilar (kuadran layar, derajat searah jarum jam). */
const quadrantAngle = (pl: Pillar) =>
  (Math.atan2(Math.sign(pl.y), Math.sign(pl.x)) * 180) / Math.PI;

const letterFont: React.CSSProperties = {
  fontFamily: FONTS.heading,
  fontSize: 148,
  fontWeight: 900,
  letterSpacing: "-0.03em",
  lineHeight: 0.95,
};

/* -------------------------------------------------------------------------- */
/*  PILLAR NODE — kartu kaca yang makin "panas" saat mendekati pusat          */
/* -------------------------------------------------------------------------- */
interface PillarNodeProps {
  label: string;
  Icon: LucideIcon;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  blur: number;
  heat: number; // 0 → 1, makin dekat tabrakan makin terang
  color: string;
}

const PillarNode: React.FC<PillarNodeProps> = ({
  label,
  Icon,
  x,
  y,
  scale,
  opacity,
  blur,
  heat,
  color,
}) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`,
      opacity,
      filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
      pointerEvents: "none",
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "10px 30px 10px 10px",
      borderRadius: 22,
      backgroundColor: "rgba(10, 22, 48, 0.66)",
      backdropFilter: "blur(18px) saturate(140%)",
      border: `1px solid rgba(255, 255, 255, ${0.14 + heat * 0.5})`,
      boxShadow: [
        "0 22px 50px -18px rgba(0, 0, 0, 0.9)",
        `0 0 ${30 + heat * 70}px -6px ${color}`,
        "inset 0 1px 0 rgba(255, 255, 255, 0.14)",
      ].join(", "),
    }}
  >
    {/* Aksen warna di tepi atas kartu */}
    <div
      style={{
        position: "absolute",
        top: -1,
        left: 26,
        width: 46,
        height: 2,
        borderRadius: 2,
        backgroundColor: color,
        boxShadow: `0 0 12px ${color}`,
      }}
    />
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 15,
        backgroundColor: `${color}22`,
        border: `1px solid ${color}88`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
      }}
    >
      <Icon size={26} />
    </div>
    <div
      style={{
        fontFamily: FONTS.heading,
        fontSize: 28,
        fontWeight: 800,
        color: COLORS.white,
        letterSpacing: 1,
        lineHeight: 1,
      }}
    >
      {label}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
/* -------------------------------------------------------------------------- */
export const Scene1_GatewayHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;
  const k = width / CANVAS_REF_WIDTH; // skala agar tetap proporsional di resolusi lain

  /* ---- Progres utama -------------------------------------------------- */
  const linearConverge = interpolate(
    frame,
    [T.convergeStart, T.impact],
    [0, 1],
    clamp
  );

  // Antisipasi: pilar sedikit "menarik napas" ke luar sebelum menghantam pusat
  const anticipation = interpolate(linearConverge, [0, 0.1, 0.28], [0, -0.06, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const p = easeConverge(linearConverge) + anticipation;

  const portalSpring = spring({
    frame: Math.max(0, frame - T.portalIn),
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const charge = interpolate(linearConverge, [0.4, 1], [0, 1], clamp);
  const since = frame - T.impact;
  const kick = interpolate(
    frame,
    [T.impact, T.impact + 5, T.impact + 28],
    [0, 0.09, 0],
    { ...clamp, easing: Easing.out(Easing.cubic) }
  );
  const portalScale = portalSpring * (1 + charge * 0.03 + kick);

  /* ---- Kamera rock-solid dan stabil (efek getar dihilangkan 100%) ---- */
  const shakeX = 0;
  const shakeY = 0;
  const shakeRot = 0;
  const punch = 1;

  /* ---- Posisi tiap pilar --------------------------------------------- */
  const nodes = PILLARS.map((pillar, i) => {
    const enter = spring({
      frame: Math.max(0, frame - (T.pillarIn + i * T.pillarStagger)),
      fps,
      config: { damping: 15, stiffness: 100 },
    });

    const base = getPillarPosition(pillar, p, k);

    // Masuk dari luar layar searah vektor awal, lalu melayang pelan sebelum ditarik
    const outward = (1 - enter) * 110 * k;
    const dirLen = Math.hypot(pillar.x, pillar.y) || 1;
    const float =
      Math.sin((frame + i * 22) / 16) * 7 * k * (1 - Math.max(0, p)) * enter;

    const x = base.x + (pillar.x / dirLen) * outward;
    const y = base.y + (pillar.y / dirLen) * outward + float;

    // Kartu meleleh jadi orb energi: kartu memudar, orb menggantikan
    const opacity =
      interpolate(enter, [0, 0.5], [0, 1], clamp) *
      interpolate(p, [0, 0.7, 0.95], [1, 0.9, 0], clamp);
    const scale = interpolate(p, [0, 1], [1, 0.35]) * (0.9 + enter * 0.1);
    const blur = interpolate(p, [0.5, 1], [0, 6], clamp);
    const heat = interpolate(p, [0.45, 1], [0, 1], clamp);
    const orb =
      interpolate(p, [0.55, 0.88], [0, 1], clamp) *
      interpolate(p, [0.94, 1], [1, 0], clamp);

    return { pillar, x, y, enter, opacity, scale, blur, heat, orb };
  });

  /* ---- Cincin empat warna yang menyatu setelah impact ---------------- */
  const ringFill = interpolate(frame, [T.impact, T.impact + 34], [0.18, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const ringOpacity = interpolate(frame, [T.impact, T.impact + 6], [0, 1], clamp);
  const ringSpin = Math.max(0, since) * 0.45 + (1 - ringFill) * 70;
  const ringR = RING_RADIUS * k;
  const ringC = 2 * Math.PI * ringR;

  /* ---- Judul ---------------------------------------------------------- */
  const t = frame - T.title;

  const kickerIn = spring({
    frame: Math.max(0, t),
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const subtitleIn = spring({
    frame: Math.max(0, t - 22),
    fps,
    config: { damping: 18, stiffness: 110 },
  });

  const underline = interpolate(t, [14, 44], [0, 400], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  // Empat chip melebur menjadi satu kapsul
  const fuse = interpolate(t, [T.fuse, T.fuse + 22], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const sweepRaw = (t - T.fuse - 20) / 70;
  const sweep = sweepRaw > 0 ? sweepRaw % 1 : 0;
  const sweepOpacity = sweepRaw > 0 ? Math.sin(Math.PI * sweep) * fuse : 0;

  const glowPulse = 44 + Math.sin(frame / 9) * 14;

  /* ---- Efek cahaya saat impact --------------------------------------- */
  const flare = interpolate(frame, [T.impact - 1, T.impact + 3, T.impact + 30], [0, 1, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const flareW = interpolate(frame, [T.impact, T.impact + 30], [200 * k, 1500 * k], {
    ...clamp,
    easing: Easing.out(Easing.exp),
  });
  const coreSize = interpolate(frame, [T.convergeStart + 10, T.impact], [0, 1], clamp);
  const coreFade = interpolate(frame, [T.impact, T.impact + 6], [1, 0], clamp);

  /* ---- HUD sinkronisasi ---------------------------------------------- */
  const sync = Math.round(
    interpolate(frame, [T.pillarIn + 8, T.impact], [0, 100], {
      ...clamp,
      easing: Easing.in(Easing.quad),
    })
  );
  const hudIn = interpolate(frame, [T.pillarIn + 6, T.pillarIn + 20], [0, 1], clamp);
  const hudSettle = interpolate(frame, [T.impact + 30, T.impact + 50], [1, 0.5], clamp);

  return (
    <VirtualCamera durationInFrames={215} zoomFrom={1.0} zoomTo={1.08}>
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.base,
          overflow: "hidden",
        }}
      >
        {/* Seluruh konten ikut bergetar & "punch" saat tabrakan */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate3d(${shakeX}px, ${shakeY}px, 0) rotate(${shakeRot}deg) scale(${punch})`,
          }}
        >
          {/* Grid dengan parallax lambat agar latar terasa hidup */}
          <div
            style={{
              position: "absolute",
              inset: -60,
              transform: `translate(${-frame * 0.18}px, ${-frame * 0.1}px)`,
            }}
          >
            <BackgroundGrid
              opacity={0.35}
              size={70}
              lineColor="rgba(34, 211, 238, 0.07)"
            />
          </div>

          {/* Empat cahaya ambient: tiap pilar membawa warnanya, lalu semuanya
              ikut ditarik ke pusat dan melebur jadi satu bloom */}
          {nodes.map(({ pillar, x, y, enter }, i) => (
            <div
              key={`bloom-${i}`}
              style={{
                position: "absolute",
                left: cx + x * 0.85 - 210 * k,
                top: cy + y * 0.85 - 210 * k,
                width: 420 * k,
                height: 420 * k,
                borderRadius: "50%",
                backgroundColor: pillar.color,
                filter: "blur(110px)",
                opacity: enter * interpolate(p, [0, 0.8, 1], [0.16, 0.3, 0], clamp),
                mixBlendMode: "screen",
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Cahaya ambient di tengah */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 750,
              height: 750,
              borderRadius: "50%",
              backgroundColor: COLORS.surface,
              filter: "blur(180px)",
              opacity: 0.55 + charge * 0.3,
              pointerEvents: "none",
            }}
          />

          {/* Debu halus: memberi kedalaman tanpa mengganggu fokus */}
          <svg
            width={width}
            height={height}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {DUST.map((d, i) => {
              const yy =
                (((d.y * height - frame * d.speed * 1.2) % height) + height) % height;
              const twinkle = 0.12 + (Math.sin(frame / 20 + d.phase) + 1) * 0.12;
              return (
                <circle
                  key={i}
                  cx={d.x * width}
                  cy={yy}
                  r={d.r}
                  fill={COLORS.cyan}
                  opacity={twinkle}
                />
              );
            })}
          </svg>

          {/* Cincin orbit tipis + cincin "implosi" yang menyusut ke pusat
              (kebalikan gelombang kejut) selama pilar ditarik */}
          <svg
            width={width}
            height={height}
            style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}
          >
            {[
              { r: 340, dash: "2 14", dir: 1, speed: 0.25 },
              { r: 410, dash: "28 22", dir: -1, speed: 0.15 },
            ].map((ring, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={ring.r * k}
                fill="none"
                stroke={COLORS.cyan}
                strokeWidth={1.2}
                strokeDasharray={ring.dash}
                opacity={portalSpring * (0.16 + charge * 0.2)}
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: `rotate(${frame * ring.speed * ring.dir}deg)`,
                }}
              />
            ))}

            {frame >= T.convergeStart &&
              frame < T.impact &&
              [0, 1, 2].map((i) => {
                const ph = ((frame - T.convergeStart) / 24 + i / 3) % 1;
                const rr = interpolate(ph, [0, 1], [540 * k, 70 * k], {
                  easing: Easing.in(Easing.cubic),
                });
                const o =
                  Math.sin(Math.PI * ph) *
                  0.5 *
                  interpolate(linearConverge, [0, 0.5], [0.2, 1], clamp);
                return (
                  <circle
                    key={`imp-${i}`}
                    cx={cx}
                    cy={cy}
                    r={rr}
                    fill="none"
                    stroke={COLORS.white}
                    strokeWidth={1.5}
                    opacity={o}
                  />
                );
              })}
          </svg>

          {/* Jalur lintasan (melengkung mengikuti pusaran) + pulsa cahaya */}
          <svg
            width={width}
            height={height}
            style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}
          >
            {nodes.map(({ pillar, x, y, enter }, i) => {
              const lineOpacity =
                enter * interpolate(p, [0, 0.8, 1], [0.3, 0.6, 0], clamp);

              const q0 = Math.max(0, p);
              const future = Array.from({ length: 14 }, (_, s) => {
                const q = q0 + (1 - q0) * (s / 13);
                const pos = getPillarPosition(pillar, q, k);
                return `${cx + pos.x},${cy + pos.y}`;
              });

              // Pulsa bergerak dari pilar menuju pusat sepanjang lintasan
              const pulseT = (frame * 0.022 + i * 0.27) % 1;
              const pulsePos = getPillarPosition(pillar, q0 + (1 - q0) * pulseT, k);

              return (
                <g key={i}>
                  <polyline
                    points={`${cx + x},${cy + y} ${future.join(" ")}`}
                    fill="none"
                    stroke={pillar.color}
                    strokeWidth={1.5}
                    strokeDasharray="4 9"
                    strokeDashoffset={-frame * 0.7}
                    opacity={lineOpacity}
                  />
                  <circle
                    cx={cx + pulsePos.x}
                    cy={cy + pulsePos.y}
                    r={3.5}
                    fill={pillar.color}
                    opacity={lineOpacity * 1.6}
                    style={{ filter: `drop-shadow(0 0 8px ${pillar.color})` }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Kartu pilar */}
          {nodes.map((n, i) => (
            <PillarNode
              key={i}
              label={n.pillar.label}
              Icon={n.pillar.Icon}
              x={n.x}
              y={n.y}
              scale={n.scale}
              opacity={n.opacity}
              blur={n.blur}
              heat={n.heat}
              color={n.pillar.color}
            />
          ))}

          {/* Kilatan cahaya saat impact (Rule 20 compliant: solid shape with filter blur) */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 800,
              height: 800,
              borderRadius: "50%",
              backgroundColor: COLORS.white,
              filter: "blur(100px)",
              transform: "translate(-50%, -50%)",
              opacity: interpolate(
                frame,
                [T.impact - 2, T.impact + 2, T.impact + 18],
                [0, 0.5, 0],
                clamp
              ),
              mixBlendMode: "screen",
              pointerEvents: "none",
              zIndex: 14,
            }}
          />

          {/* Inti panas yang sangat terang tepat di momen tabrakan */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 240,
              height: 240,
              borderRadius: "50%",
              backgroundColor: COLORS.white,
              filter: "blur(36px)",
              transform: "translate(-50%, -50%)",
              opacity: interpolate(
                frame,
                [T.impact - 1, T.impact + 1, T.impact + 10],
                [0, 0.95, 0],
                clamp
              ),
              mixBlendMode: "screen",
              pointerEvents: "none",
              zIndex: 14,
            }}
          />

          {/* Anamorphic flare: garis cahaya horizontal ala sinematik */}
          <div
            style={{
              position: "absolute",
              left: cx - flareW / 2,
              top: cy - 2 * k,
              width: flareW,
              height: 4 * k,
              borderRadius: 999,
              backgroundColor: COLORS.cyan,
              filter: "blur(3px)",
              boxShadow: `0 0 40px 8px ${COLORS.cyan}`,
              opacity: flare,
              mixBlendMode: "screen",
              pointerEvents: "none",
              zIndex: 17,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: cx - (flareW * 0.55) / 2,
              top: cy - 1 * k,
              width: flareW * 0.55,
              height: 2 * k,
              borderRadius: 999,
              backgroundColor: COLORS.white,
              filter: "blur(1px)",
              opacity: flare,
              pointerEvents: "none",
              zIndex: 17,
            }}
          />

          {/* Tiga gelombang kejut bertingkat */}
          {[0, 7, 14].map((delay, i) => {
            const start = T.impact + delay;
            const size = interpolate(frame, [start, start + 40], [300, 300 + 400 * k], {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            });
            const opacity = interpolate(
              frame,
              [start, start + 5, start + 40],
              [0, 0.28 - i * 0.1, 0],
              clamp
            );
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: size,
                  height: size,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `${2.5 - i * 0.5}px solid ${COLORS.cyan}`,
                  opacity,
                  pointerEvents: "none",
                  zIndex: 15,
                }}
              />
            );
          })}

          {/* Semburan partikel: garis + titik dalam warna keempat pilar */}
          <svg
            width={width}
            height={height}
            style={{ position: "absolute", inset: 0, zIndex: 16, pointerEvents: "none" }}
          >
            {BURST.map((b, i) => {
              const bt = (frame - T.impact) / 52;
              if (bt < 0 || bt > 1) return null;
              const travel = b.speed * k * Easing.out(Easing.cubic)(bt);
              const dx = Math.cos(b.angle);
              const dy = Math.sin(b.angle);

              if (b.dot) {
                return (
                  <circle
                    key={i}
                    cx={cx + dx * travel}
                    cy={cy + dy * travel}
                    r={(1.8 + b.width) * (1 - bt)}
                    fill={b.color}
                    opacity={1 - bt}
                  />
                );
              }

              const tail = b.speed * k * 0.14 * (1 - bt);
              return (
                <line
                  key={i}
                  x1={cx + dx * travel}
                  y1={cy + dy * travel}
                  x2={cx + dx * Math.max(0, travel - tail)}
                  y2={cy + dy * Math.max(0, travel - tail)}
                  stroke={b.color}
                  strokeWidth={b.width}
                  strokeLinecap="round"
                  opacity={1 - bt}
                />
              );
            })}
          </svg>

          {/* EFEK UTAMA: empat busur warna melebur menjadi satu cincin utuh */}
          <svg
            width={width}
            height={height}
            style={{ position: "absolute", inset: 0, zIndex: 19, pointerEvents: "none" }}
          >
            {PILLARS.map((pl, i) => {
              const arcLen = (ringC / 4) * ringFill;
              const start = quadrantAngle(pl) - ((arcLen / ringC) * 360) / 2;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={ringR}
                  fill="none"
                  stroke={pl.color}
                  strokeWidth={5 * k}
                  strokeLinecap="round"
                  strokeDasharray={`${arcLen} ${ringC - arcLen}`}
                  opacity={ringOpacity * 0.95}
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: `rotate(${start + ringSpin}deg)`,
                    filter: `drop-shadow(0 0 10px ${pl.color})`,
                  }}
                />
              );
            })}
          </svg>

          {/* Portal utama */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) scale(${portalScale})`,
              zIndex: 20,
            }}
          >
            <GlowingPortal size={560} activeColor={COLORS.cyan} />
          </div>

          {/* Kepala energi: jejak komet + orb tiap pilar + inti singularitas.
              Di atas portal supaya momen "menyatu" terlihat jelas. */}
          <svg
            width={width}
            height={height}
            style={{ position: "absolute", inset: 0, zIndex: 22, pointerEvents: "none" }}
          >
            {nodes.map(({ pillar, x, y, heat, orb }, i) => {
              const trail = Array.from({ length: 12 }, (_, s) => {
                if (s === 0) return { x: cx + x, y: cy + y };
                const lin = Math.max(0, linearConverge - s * 0.016);
                const pos = getPillarPosition(pillar, easeConverge(lin), k);
                return { x: cx + pos.x, y: cy + pos.y };
              });
              const trailVisible = linearConverge > 0.02 && linearConverge < 1;
              const r = (10 + heat * 8) * k;

              return (
                <g key={i}>
                  {trailVisible && (
                    <g style={{ filter: `drop-shadow(0 0 8px ${pillar.color})` }}>
                      {trail.slice(1).map((pt, s) => (
                        <line
                          key={s}
                          x1={trail[s].x}
                          y1={trail[s].y}
                          x2={pt.x}
                          y2={pt.y}
                          stroke={pillar.color}
                          strokeWidth={Math.max(1, 7 - s * 0.55) * k}
                          strokeLinecap="round"
                          opacity={(1 - s / 11) * 0.6}
                        />
                      ))}
                    </g>
                  )}
                  <circle
                    cx={cx + x}
                    cy={cy + y}
                    r={r * 2.2}
                    fill={pillar.color}
                    opacity={orb * 0.35}
                    style={{ filter: "blur(7px)" }}
                  />
                  <circle
                    cx={cx + x}
                    cy={cy + y}
                    r={r}
                    fill={pillar.color}
                    opacity={orb}
                    style={{ filter: `drop-shadow(0 0 14px ${pillar.color})` }}
                  />
                  <circle
                    cx={cx + x}
                    cy={cy + y}
                    r={r * 0.5}
                    fill={COLORS.white}
                    opacity={orb * heat}
                  />
                </g>
              );
            })}

            {/* Inti putih yang membesar tepat sebelum tabrakan */}
            <circle
              cx={cx}
              cy={cy}
              r={(3 + coreSize * 16) * k}
              fill={COLORS.white}
              opacity={coreSize * coreFade}
              style={{ filter: `drop-shadow(0 0 24px ${COLORS.cyan})` }}
            />
          </svg>

          {/* Lockup judul */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              pointerEvents: "none",
            }}
          >
            {/* Kicker + garis pengapit */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: kickerIn,
                transform: `translateY(${(1 - kickerIn) * 12}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 14,
                  fontWeight: 800,
                  color: COLORS.cyan,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  backgroundColor: "rgba(34, 211, 238, 0.12)",
                  border: "1px solid rgba(34, 211, 238, 0.3)",
                  padding: "6px 20px",
                  borderRadius: 20,
                }}
              >
                AICC Enterprise Portal
              </div>
            </div>

            {/* ADIS: empat salinan berwarna (warna 4 pilar) bergeser ke arah
                pilar asalnya, lalu bertemu dan melebur jadi satu huruf putih */}
            <div style={{ display: "flex", lineHeight: 0.95 }}>
              {"ADIS".split("").map((ch, i) => {
                const s = spring({
                  frame: Math.max(0, t - 4 - i * 4),
                  fps,
                  config: { damping: 12, stiffness: 150 },
                });
                const merge = interpolate(t, [6 + i * 3, 32 + i * 3], [0, 1], {
                  ...clamp,
                  easing: Easing.out(Easing.cubic),
                });
                const sep = 1 - merge;

                return (
                  <span
                    key={i}
                    style={{
                      position: "relative",
                      display: "inline-block",
                      opacity: interpolate(s, [0, 0.4], [0, 1], clamp),
                      transform: `translateY(${(1 - s) * 50}px) scale(${1.25 - 0.25 * Math.min(s, 1)})`,
                      filter: `blur(${Math.max(0, (1 - s) * 16)}px)`,
                    }}
                  >
                    {PILLARS.map((pl, gi) => (
                      <span
                        key={gi}
                        aria-hidden
                        style={{
                          ...letterFont,
                          position: "absolute",
                          left: 0,
                          top: 0,
                          color: pl.color,
                          opacity: sep * 0.9,
                          mixBlendMode: "screen",
                          transform: `translate(${Math.sign(pl.x) * sep * 70 * k}px, ${Math.sign(pl.y) * sep * 40 * k}px)`,
                        }}
                      >
                        {ch}
                      </span>
                    ))}
                    <span
                      style={{
                        ...letterFont,
                        position: "relative",
                        color: COLORS.white,
                        textShadow: `0 0 ${glowPulse}px rgba(34, 211, 238, 0.55)`,
                      }}
                    >
                      {ch}
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Garis cahaya di bawah judul */}
            <div
              style={{
                width: underline,
                height: 2,
                backgroundColor: COLORS.cyan,
                boxShadow: `0 0 16px ${COLORS.cyan}`,
                marginTop: -2,
              }}
            />

            {/* Subtitle: tracking melebar → merapat (kinetic type) */}
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 22,
                fontWeight: 800,
                color: COLORS.white,
                letterSpacing: `${interpolate(subtitleIn, [0, 1], [0.55, 0.18])}em`,
                textTransform: "uppercase",
                opacity: subtitleIn * 0.95,
                transform: `translateY(${(1 - subtitleIn) * 14}px)`,
              }}
            >
              One Digital Ecosystem
            </div>

            {/* Empat chip → melebur jadi SATU kapsul dengan spektrum empat warna */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 16 * (1 - fuse),
                padding: 5 * fuse,
                marginTop: 26,
                borderRadius: 30,
                border: `1.5px solid rgba(255, 255, 255, ${0.28 * fuse})`,
                backgroundColor: `rgba(255, 255, 255, ${0.05 * fuse})`,
                boxShadow: `0 0 ${50 * fuse}px -12px ${COLORS.cyan}`,
                zIndex: 35,
              }}
            >
              {PILLARS.map((pl, i) => {
                const s = spring({
                  frame: Math.max(0, t - 14 - i * 4),
                  fps,
                  config: { damping: 15, stiffness: 130 },
                });
                const Icon = pl.Icon;
                const isFirst = i === 0;
                const isLast = i === PILLARS.length - 1;
                const rIn = 22 * (1 - fuse); // sudut dalam menjadi lurus saat menyatu
                const rl = isFirst ? 22 : rIn;
                const rr = isLast ? 22 : rIn;

                return (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      height: 44,
                      boxSizing: "border-box",
                      padding: "0 22px 0 9px",
                      borderRadius: `${rl}px ${rr}px ${rr}px ${rl}px`,
                      backgroundColor: "#071228",
                      boxShadow: `0 4px 18px rgba(0, 0, 0, 0.8), 0 0 14px ${pl.color}44`,
                      opacity: s,
                      transform: `translateY(${(1 - s) * 14}px)`,
                    }}
                  >
                    {/* Outline warna per chip: memudar saat menyatu */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "inherit",
                        border: `1.5px solid ${pl.color}`,
                        opacity: 1 - fuse,
                        pointerEvents: "none",
                      }}
                    />
                    {/* Pemisah halus antar segmen */}
                    {!isFirst && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 10,
                          bottom: 10,
                          width: 1,
                          backgroundColor: "rgba(255, 255, 255, 0.18)",
                          opacity: fuse,
                        }}
                      />
                    )}
                    {/* Segmen spektrum: empat warna tersambung jadi satu garis */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: -9,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: pl.color,
                        boxShadow: `0 0 12px ${pl.color}`,
                        transform: `scaleX(${fuse})`,
                        transformOrigin: "center",
                      }}
                    />
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        backgroundColor: pl.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#060D1F",
                      }}
                    >
                      <Icon size={15} strokeWidth={2.5} />
                    </div>
                    <span
                      style={{
                        fontFamily: FONTS.heading,
                        fontSize: 15,
                        fontWeight: 800,
                        color: COLORS.white,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {pl.label}
                    </span>
                  </div>
                );
              })}

              {/* Titik cahaya yang menyapu garis spektrum: tanda "satu sistem" */}
              <div
                style={{
                  position: "absolute",
                  left: `calc(${sweep * 100}% - 20px)`,
                  bottom: -3,
                  width: 40,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: COLORS.white,
                  filter: "blur(1.5px)",
                  boxShadow: `0 0 14px 2px ${COLORS.white}`,
                  opacity: sweepOpacity,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Indikator sinkronisasi: informasi progres penyatuan, bukan dekorasi */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 70 * k,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
            opacity: hudIn * hudSettle,
            zIndex: 38,
            pointerEvents: "none",
            fontFamily: FONTS.heading,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.16em",
            fontVariantNumeric: "tabular-nums",
            color: frame >= T.impact ? COLORS.cyan : "rgba(255, 255, 255, 0.7)",
          }}
        >
          <span>{frame >= T.impact ? "Ecosystem unified" : "Syncing modules"}</span>
          <div
            style={{
              width: 240 * k,
              height: 3,
              borderRadius: 2,
              backgroundColor: "rgba(255, 255, 255, 0.14)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${sync}%`,
                height: "100%",
                backgroundColor: COLORS.cyan,
                boxShadow: `0 0 12px ${COLORS.cyan}`,
              }}
            />
          </div>
            <span style={{ minWidth: 52, textAlign: "right" }}>
              {( "000" + String(sync)).slice(-3)}%
          </span>
        </div>

        {/* Vignette: memusatkan mata ke tengah (box-shadow, bukan gradient) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 0 260px 40px rgba(2, 6, 16, 0.85)",
            pointerEvents: "none",
            zIndex: 40,
          }}
        />
      </AbsoluteFill>
    </VirtualCamera>
  );
};