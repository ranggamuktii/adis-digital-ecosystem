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
import { Brain, Factory, Lock, Radio, ShieldCheck, Unlock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { COLORS, FONTS } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { VirtualCamera } from "../components/VirtualCamera";

/* -------------------------------------------------------------------------- */
/*  KONSEP: "SATU PINTU"                                                      */
/*  Satu gerbang berbentuk pintu lengkung. Empat pilar menyambung ke bingkai  */
/*  yang SAMA (tiap pilar menyalakan satu sisi bingkai dengan warnanya).      */
/*  Saat keempatnya tersambung, bingkai menyatu → pintu terbuka → di baliknya */
/*  ada satu lorong cahaya tempat keempat warna itu bertemu.                  */
/*                                                                            */
/*  Semua elemen dirancang di "stage" 1920x1080 lalu di-scale otomatis.       */
/* -------------------------------------------------------------------------- */
const STAGE_W = 1920;
const STAGE_H = 1080;
const CX = STAGE_W / 2;

// Geometri pintu (bukaan dalam)
const DOOR_W = 380;
const DOOR_H = 620;
const DOOR_R = DOOR_W / 2; // radius lengkung atas
const DOOR_TOP = 250;
const DOOR_BOTTOM = DOOR_TOP + DOOR_H; // 870 → ambang pintu
const DOOR_L = CX - DOOR_R;
const DOOR_RIGHT = CX + DOOR_R;
const SPRING_Y = DOOR_TOP + DOOR_R; // titik awal lengkung
const MID_Y = 560; // tinggi tengah pintu
const FRAME_T = 22; // tebal bingkai (architrave)
const PORT_DY = 80; // jarak vertikal soket dari tengah

const EMBLEM = 64; // diameter emblem pilar

const CYCLE = 38; // durasi satu paket data dari pilar ke pintu (frame)
const LINE_DUR = 22; // durasi konduit "digambar"
const RIPPLE_LIFE = 22; // umur riak di soket saat paket tiba
const DEPART_LIFE = 16; // umur denyut emblem saat paket berangkat

/* -------------------------------------------------------------------------- */
/*  DATA PILAR                                                                */
/* -------------------------------------------------------------------------- */
interface Pillar {
  id: string;
  name: string;
  sub: string;
  Icon: LucideIcon;
  color: string;
  x: number; // relatif ke tengah (CX)
  y: number; // relatif ke tengah pintu (MID_Y)
}

const PILLARS: Pillar[] = [
  { id: "prod", name: "PRODUCTION", sub: "Casting & Molding", Icon: Factory, color: COLORS.cyan, x: -500, y: -150 },
  { id: "qc", name: "QUALITY", sub: "Inspection & Standards", Icon: ShieldCheck, color: COLORS.emerald, x: 500, y: -150 },
  { id: "iot", name: "IoT", sub: "Machine Telemetry", Icon: Radio, color: COLORS.blue, x: -500, y: 150 },
  { id: "ai", name: "AI", sub: "Cognitive Platform", Icon: Brain, color: COLORS.purple, x: 500, y: 150 },
];

/* -------------------------------------------------------------------------- */
/*  GEOMETRI (dihitung sekali, bukan tiap frame)                              */
/* -------------------------------------------------------------------------- */
type Pt = { x: number; y: number };

const bezier = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

// Konduit: dari emblem menuju soket di bingkai pintu
const GEOMETRY = PILLARS.map((pl) => {
  const dir = pl.x < 0 ? 1 : -1; // arah menuju pintu
  const start: Pt = { x: CX + pl.x + dir * (EMBLEM / 2 + 8), y: MID_Y + pl.y };
  const end: Pt = {
    x: pl.x < 0 ? DOOR_L : DOOR_RIGHT,
    y: MID_Y + (pl.y < 0 ? -PORT_DY : PORT_DY),
  };
  const mx = (start.x + end.x) / 2;
  const c1: Pt = { x: mx, y: start.y };
  const c2: Pt = { x: mx, y: end.y };
  return {
    start,
    c1,
    c2,
    end,
    d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
  };
});

// Bingkai pintu utuh (satu garis) dan empat segmennya (satu per pilar).
// Tiap segmen dimulai dari tengah lalu "memanjat" menjauh → terlihat menyala.
const ARC_R = `${DOOR_R} ${DOOR_R} 0 0`;
const FRAME_D = `M ${DOOR_L} ${DOOR_BOTTOM} L ${DOOR_L} ${SPRING_Y} A ${ARC_R} 1 ${DOOR_RIGHT} ${SPRING_Y} L ${DOOR_RIGHT} ${DOOR_BOTTOM}`;
const SEGMENTS: Record<string, string> = {
  prod: `M ${DOOR_L} ${MID_Y} L ${DOOR_L} ${SPRING_Y} A ${ARC_R} 1 ${CX} ${DOOR_TOP}`,
  qc: `M ${DOOR_RIGHT} ${MID_Y} L ${DOOR_RIGHT} ${SPRING_Y} A ${ARC_R} 0 ${CX} ${DOOR_TOP}`,
  iot: `M ${DOOR_L} ${MID_Y} L ${DOOR_L} ${DOOR_BOTTOM}`,
  ai: `M ${DOOR_RIGHT} ${MID_Y} L ${DOOR_RIGHT} ${DOOR_BOTTOM}`,
};

/* -------------------------------------------------------------------------- */
/*  TIMELINE                                                                  */
/* -------------------------------------------------------------------------- */
const DOOR_IN = 4;

const TIMING = PILLARS.map((_, i) => {
  const nodeStart = 12 + i * 10;
  const lineStart = nodeStart + 8;
  const lineEnd = lineStart + LINE_DUR;
  const firstArrival = lineEnd + CYCLE; // paket pertama tiba di soket
  return { nodeStart, lineStart, lineEnd, firstArrival };
});

// Momen utama: keempat pilar tersambung → bingkai menyatu → pintu terbuka
const LOCK_FRAME = Math.max(...TIMING.map((t) => t.firstArrival)) + 12;

/* -------------------------------------------------------------------------- */
/*  INTERIOR PINTU (koordinat lokal 380x620): lorong menuju titik hilang      */
/* -------------------------------------------------------------------------- */
const VX = DOOR_R;
const VY = 300;
const FLOOR_SLOPE = DOOR_R / (DOOR_H - VY);
const FLOOR_OFFSETS = [-190, -110, -45, 0, 45, 110, 190];
const FLOOR_ROWS = [340, 362, 395, 445, 520, 610];
// Empat strip cahaya dinding = empat pilar, di posisi yang sama dengan soketnya
const WALL_STRIPS = [
  { pillar: 0, side: -1, y0: VY - 135 },
  { pillar: 1, side: 1, y0: VY - 135 },
  { pillar: 2, side: -1, y0: VY + 135 },
  { pillar: 3, side: 1, y0: VY + 135 },
];

// Debu cahaya yang naik dari ambang pintu saat terbuka (deterministik)
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  x: (random(`mote-x-${i}`) - 0.5) * 440,
  y: random(`mote-y-${i}`),
  r: 1.5 + random(`mote-r-${i}`) * 2.5,
  speed: 0.5 + random(`mote-v-${i}`) * 0.9,
  phase: random(`mote-p-${i}`) * Math.PI * 2,
}));

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/* -------------------------------------------------------------------------- */
/*  KOMPONEN KECIL                                                            */
/* -------------------------------------------------------------------------- */
const MaskWord: React.FC<{ text: string; progress: number }> = ({ text, progress }) => (
  <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 6 }}>
    <span style={{ display: "inline-block", transform: `translateY(${(1 - progress) * 105}%)` }}>
      {text}
    </span>
  </span>
);

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
/* -------------------------------------------------------------------------- */
export const Scene2_CentralPortal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = Math.min(width / STAGE_W, height / STAGE_H);

  const spr = (delay: number, damping = 15, stiffness = 120) =>
    spring({ frame: Math.max(0, frame - delay), fps, config: { damping, stiffness } });

  const doorS = spr(DOOR_IN, 16, 110);

  /* ---- Momen pintu terbuka -------------------------------------------- */
  const lockBump = interpolate(
    frame,
    [LOCK_FRAME, LOCK_FRAME + 6, LOCK_FRAME + 24],
    [0, 1, 0],
    clamp
  );
  const locked = interpolate(frame, [LOCK_FRAME, LOCK_FRAME + 10], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  // Daun pintu bergeser ke dua sisi, masuk ke dinding
  const open = interpolate(frame, [LOCK_FRAME + 8, LOCK_FRAME + 38], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const lightPulse = 0.88 + Math.sin(frame / 10) * 0.12;

  const frameDraw = interpolate(frame, [DOOR_IN, DOOR_IN + 34], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const shakeX = (random(`s2-shake-x-${frame}`) - 0.5) * 10 * lockBump;
  const shakeY = (random(`s2-shake-y-${frame}`) - 0.5) * 10 * lockBump;

  /* ---- Riak di soket setiap paket data tiba --------------------------- */
  const ripples: { color: string; age: number; x: number; y: number }[] = [];
  PILLARS.forEach((pl, i) => {
    [0, 1].forEach((kk) => {
      const first = TIMING[i].firstArrival + kk * 0.5 * CYCLE;
      if (frame >= first) {
        const age = (frame - first) % CYCLE;
        if (age < RIPPLE_LIFE) {
          ripples.push({ color: pl.color, age, x: GEOMETRY[i].end.x, y: GEOMETRY[i].end.y });
        }
      }
    });
  });
  const energy = ripples.reduce((m, r) => Math.max(m, 1 - r.age / RIPPLE_LIFE), 0);

  return (
    <VirtualCamera durationInFrames={200} zoomFrom={1.0} zoomTo={1.05}>
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.base,
          overflow: "hidden",
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
      >
        {/* Grid dengan parallax lambat */}
        <div
          style={{
            position: "absolute",
            inset: -60,
            transform: `translate(${-frame * 0.18}px, ${-frame * 0.1}px)`,
          }}
        >
          <BackgroundGrid opacity={0.35} size={65} lineColor="rgba(59, 130, 246, 0.08)" />
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
          {/* Cahaya ambient: menguat setiap paket data tiba */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: MID_Y,
              transform: "translate(-50%, -50%)",
              width: 900,
              height: 900,
              borderRadius: "50%",
              backgroundColor: COLORS.surface,
              filter: "blur(180px)",
              opacity: 0.6 + energy * 0.12 + open * 0.25,
              pointerEvents: "none",
            }}
          />

          {/* Pendar lantai di depan pintu */}
          <div
            style={{
              position: "absolute",
              left: CX - 330,
              top: DOOR_BOTTOM + 8,
              width: 660,
              height: 90,
              borderRadius: "50%",
              backgroundColor: COLORS.cyan,
              filter: "blur(40px)",
              opacity: (0.12 + open * 0.38) * doorS,
              mixBlendMode: "screen",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Cahaya tumpah dari pintu ke lantai (wrapper blur + inner clip,
              karena clip-path dieksekusi setelah filter) */}
          <div
            style={{
              position: "absolute",
              left: CX - 420,
              top: DOOR_BOTTOM + 26,
              width: 840,
              height: 190,
              filter: "blur(16px)",
              opacity: open * 0.3 * lightPulse,
              mixBlendMode: "screen",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: COLORS.cyan,
                clipPath: "polygon(230px 0, 610px 0, 840px 100%, 0 100%)",
              }}
            />
          </div>

          {/* Bingkai pintu (architrave) berbentuk lengkung */}
          <div
            style={{
              position: "absolute",
              left: CX - (DOOR_R + FRAME_T),
              top: DOOR_TOP - FRAME_T,
              width: 2 * (DOOR_R + FRAME_T),
              height: DOOR_H + FRAME_T,
              borderRadius: `${DOOR_R + FRAME_T}px ${DOOR_R + FRAME_T}px 0 0`,
              backgroundColor: "#0A1731",
              border: "1.5px solid rgba(34, 211, 238, 0.3)",
              borderBottom: "none",
              boxShadow: `0 0 ${40 + energy * 30 + lockBump * 70 + open * 30}px -6px rgba(34, 211, 238, ${
                0.22 + energy * 0.12 + lockBump * 0.3 + open * 0.12
              })`,
              opacity: doorS,
              transform: `translateY(${(1 - doorS) * 24}px)`,
              zIndex: 2,
            }}
          />

          {/* Ambang & anak tangga */}
          <div
            style={{
              position: "absolute",
              left: CX - 250,
              top: DOOR_BOTTOM,
              width: 500,
              height: 16,
              backgroundColor: "#0A1731",
              borderTop: `2px solid rgba(34, 211, 238, ${0.35 + open * 0.5})`,
              opacity: doorS,
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: CX - 300,
              top: DOOR_BOTTOM + 16,
              width: 600,
              height: 12,
              backgroundColor: "#071228",
              borderTop: "1px solid rgba(34, 211, 238, 0.18)",
              opacity: doorS,
              zIndex: 2,
            }}
          />

          {/* ------------------------ BUKAAN PINTU ------------------------ */}
          <div
            style={{
              position: "absolute",
              left: DOOR_L,
              top: DOOR_TOP,
              width: DOOR_W,
              height: DOOR_H,
              borderRadius: `${DOOR_R}px ${DOOR_R}px 0 0`,
              overflow: "hidden",
              backgroundColor: "#030814",
              opacity: doorS,
              transform: `translateY(${(1 - doorS) * 24}px)`,
              zIndex: 3,
            }}
          >
            {/* Interior: lorong cahaya, keempat warna bertemu di satu titik */}
            <svg
              width={DOOR_W}
              height={DOOR_H}
              style={{ position: "absolute", inset: 0, zIndex: 1 }}
            >
              <rect width={DOOR_W} height={DOOR_H} fill="#030814" />
              <ellipse
                cx={VX}
                cy={VY}
                rx={170}
                ry={210}
                fill={COLORS.cyan}
                opacity={open * 0.3 * lightPulse}
                style={{ filter: "blur(40px)" }}
              />

              {/* langit-langit */}
              {[0, DOOR_W].map((ex, i) => (
                <line
                  key={`ceil-${i}`}
                  x1={VX}
                  y1={VY}
                  x2={ex}
                  y2={0}
                  stroke={COLORS.cyan}
                  strokeWidth={1.2}
                  opacity={open * 0.2}
                />
              ))}

              {/* lantai: garis menuju titik hilang + garis melintang */}
              {FLOOR_OFFSETS.map((off, i) => (
                <line
                  key={`fl-${i}`}
                  x1={VX}
                  y1={VY}
                  x2={VX + off}
                  y2={DOOR_H}
                  stroke={COLORS.white}
                  strokeWidth={1.2}
                  opacity={open * 0.22}
                />
              ))}
              {FLOOR_ROWS.map((y, i) => {
                const hw = (y - VY) * FLOOR_SLOPE;
                return (
                  <line
                    key={`row-${i}`}
                    x1={VX - hw}
                    y1={y}
                    x2={VX + hw}
                    y2={y}
                    stroke={COLORS.cyan}
                    strokeWidth={1.2}
                    opacity={open * 0.25}
                  />
                );
              })}

              {/* empat strip cahaya dinding = empat pilar */}
              {WALL_STRIPS.map((s, i) => {
                const ex = s.side < 0 ? 0 : DOOR_W;
                const tx = VX + s.side * 10;
                const color = PILLARS[s.pillar].color;
                return (
                  <polygon
                    key={`strip-${i}`}
                    points={`${ex},${s.y0 - 10} ${ex},${s.y0 + 10} ${tx},${VY + 1.5} ${tx},${VY - 1.5}`}
                    fill={color}
                    opacity={open * 0.95}
                    style={{ filter: `drop-shadow(0 0 10px ${color})` }}
                  />
                );
              })}

              {/* titik temu: "tujuan" di ujung lorong */}
              <circle
                cx={VX}
                cy={VY}
                r={110}
                fill={COLORS.cyan}
                opacity={open * 0.5 * lightPulse}
                style={{ filter: "blur(40px)" }}
              />
              <rect
                x={VX - 14}
                y={VY - 22}
                width={28}
                height={44}
                rx={4}
                fill={COLORS.white}
                opacity={open * 0.95}
                style={{ filter: "blur(2px)" }}
              />
              <circle
                cx={VX}
                cy={VY}
                r={26}
                fill={COLORS.white}
                opacity={open * 0.8}
                style={{ filter: "blur(14px)" }}
              />
            </svg>

            {/* Dua daun pintu: bergeser keluar saat terbuka */}
            {[-1, 1].map((side) => (
              <div
                key={side}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  [side < 0 ? "left" : "right"]: 0,
                  width: DOOR_R + 1,
                  backgroundColor: "#0C1D40",
                  transform: `translateX(${side * open * (DOOR_R + 8)}px)`,
                  zIndex: 2,
                }}
              >
                {/* panel timbul */}
                <div
                  style={{
                    position: "absolute",
                    top: 34,
                    bottom: 34,
                    [side < 0 ? "left" : "right"]: 24,
                    [side < 0 ? "right" : "left"]: 16,
                    border: "1.5px solid rgba(34, 211, 238, 0.18)",
                    borderRadius: side < 0 ? "140px 8px 8px 8px" : "8px 140px 8px 8px",
                  }}
                />
                {/* gagang */}
                <div
                  style={{
                    position: "absolute",
                    top: MID_Y - DOOR_TOP - 75,
                    [side < 0 ? "right" : "left"]: 30,
                    width: 7,
                    height: 150,
                    borderRadius: 4,
                    backgroundColor: COLORS.cyan,
                    opacity: 0.45 + locked * 0.4,
                    boxShadow: `0 0 ${10 + lockBump * 20}px ${COLORS.cyan}`,
                  }}
                />
                {/* tepi pertemuan: menyala saat terkunci */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    [side < 0 ? "right" : "left"]: 0,
                    width: 2,
                    backgroundColor: COLORS.cyan,
                    opacity: 0.25 + locked * 0.7,
                    boxShadow: `0 0 ${6 + lockBump * 18}px ${COLORS.cyan}`,
                  }}
                />
              </div>
            ))}

            {/* Celah cahaya yang bocor di sambungan sesaat sebelum pintu bergeser */}
            <div
              style={{
                position: "absolute",
                left: DOOR_R - 2,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: COLORS.white,
                filter: "blur(3px)",
                opacity: locked * interpolate(open, [0, 0.15], [1, 0], clamp),
                zIndex: 3,
              }}
            />
          </div>

          {/* Konduit data + paket bertrail, berujung di soket bingkai pintu */}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none" }}
          >
            {/* garis dasar bingkai: tergambar saat pintu muncul */}
            <path
              d={FRAME_D}
              fill="none"
              stroke="rgba(34, 211, 238, 0.3)"
              strokeWidth={4}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - frameDraw}
              opacity={frameDraw > 0.001 ? 1 : 0}
            />

            {/* empat sisi bingkai: tiap pilar menyalakan satu sisi dengan warnanya */}
            {PILLARS.map((pl, i) => {
              const prog = interpolate(
                frame,
                [TIMING[i].firstArrival, TIMING[i].firstArrival + 22],
                [0, 1],
                { ...clamp, easing: Easing.out(Easing.cubic) }
              );
              return (
                <path
                  key={`seg-${pl.id}`}
                  d={SEGMENTS[pl.id]}
                  fill="none"
                  stroke={pl.color}
                  strokeWidth={6}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - prog}
                  opacity={prog > 0.001 ? 1 - locked : 0}
                  style={{ filter: `drop-shadow(0 0 10px ${pl.color})` }}
                />
              );
            })}

            {/* saat terkunci: empat warna menyatu menjadi SATU bingkai */}
            <path
              d={FRAME_D}
              fill="none"
              stroke={COLORS.cyan}
              strokeWidth={6 + lockBump * 5}
              strokeLinecap="round"
              opacity={locked}
              style={{ filter: `drop-shadow(0 0 ${12 + lockBump * 30}px ${COLORS.cyan})` }}
            />

            {PILLARS.map((pl, i) => {
              const g = GEOMETRY[i];
              const tm = TIMING[i];

              const draw = interpolate(frame, [tm.lineStart, tm.lineEnd], [0, 1], {
                ...clamp,
                easing: Easing.inOut(Easing.cubic),
              });
              const flowOpacity = interpolate(frame, [tm.lineEnd, tm.lineEnd + 10], [0, 0.8], clamp);
              const local = frame - tm.lineEnd;

              return (
                <g key={pl.id}>
                  {/* garis dasar yang "tergambar" */}
                  <path
                    d={g.d}
                    fill="none"
                    stroke={pl.color}
                    strokeWidth={2.5 + lockBump * 2}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - draw}
                    opacity={draw > 0.001 ? 0.5 + lockBump * 0.5 : 0}
                  />
                  {/* titik-titik halus yang mengalir */}
                  <path
                    d={g.d}
                    fill="none"
                    stroke={pl.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray="2 14"
                    strokeDashoffset={-frame * 0.9}
                    opacity={flowOpacity}
                  />

                  {/* dua paket per konduit, bergantian */}
                  {local >= 0 &&
                    [0, 1].map((kk) => {
                      if (kk === 1 && local < CYCLE * 0.5) return null;
                      const ct = (local / CYCLE + kk * 0.5) % 1;

                      const head = bezier(g.start, g.c1, g.c2, g.end, ct);
                      const fade = Math.min(1, ct * 14) * Math.min(1, (1 - ct) * 10);

                      return (
                        <g key={kk} opacity={fade}>
                          {Array.from({ length: 8 }, (_, s) => {
                            const tt = ct - (s + 1) * 0.022;
                            if (tt < 0) return null;
                            const pt = bezier(g.start, g.c1, g.c2, g.end, tt);
                            return (
                              <circle
                                key={s}
                                cx={pt.x}
                                cy={pt.y}
                                r={5.5 * (1 - (s + 1) / 9)}
                                fill={pl.color}
                                opacity={0.55 * (1 - s / 8)}
                              />
                            );
                          })}
                          <circle
                            cx={head.x}
                            cy={head.y}
                            r={6}
                            fill={COLORS.white}
                            style={{ filter: `drop-shadow(0 0 10px ${pl.color})` }}
                          />
                          <circle cx={head.x} cy={head.y} r={9} fill="none" stroke={pl.color} strokeWidth={2} opacity={0.8} />
                        </g>
                      );
                    })}
                </g>
              );
            })}
          </svg>

          {/* Emblem pilar: holographic node, bukan kartu */}
          {PILLARS.map((pl, i) => {
            const tm = TIMING[i];
            const dir = pl.x < 0 ? 1 : -1;
            const nodeS = spr(tm.nodeStart, 15, 130);
            const labelS = spr(tm.nodeStart + 6, 18, 120);

            // denyut kecil saat paket berangkat
            let depAge = DEPART_LIFE;
            if (frame >= tm.lineEnd) depAge = (frame - tm.lineEnd) % CYCLE;
            const dep = depAge < DEPART_LIFE ? depAge / DEPART_LIFE : 1;
            const depGlow = 1 - dep;

            return (
              <div
                key={pl.id}
                style={{
                  position: "absolute",
                  left: CX + pl.x - EMBLEM / 2,
                  top: MID_Y + pl.y - EMBLEM / 2,
                  width: EMBLEM,
                  height: EMBLEM,
                  zIndex: 12,
                  pointerEvents: "none",
                }}
              >
                {/* cincin denyut */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: `2px solid ${pl.color}`,
                    opacity: depGlow * 0.6 * nodeS,
                    transform: `scale(${1 + dep * 0.9})`,
                  }}
                />
                {/* emblem */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    backgroundColor: "#0B1B3A",
                    border: `2px solid ${pl.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: pl.color,
                    transform: `scale(${nodeS})`,
                    boxShadow: `0 0 ${20 + depGlow * 24}px -2px ${pl.color}`,
                  }}
                >
                  <pl.Icon size={28} />
                </div>

                {/* label di sisi luar, meluncur keluar dari emblem */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    [dir === 1 ? "right" : "left"]: EMBLEM + 18,
                    transform: `translateY(-50%) translateX(${(1 - labelS) * 26 * dir}px)`,
                    opacity: interpolate(labelS, [0, 0.6], [0, 1], clamp),
                    textAlign: dir === 1 ? "right" : "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 26,
                      fontWeight: 900,
                      color: COLORS.white,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                    }}
                  >
                    {pl.name}
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 14,
                      color: pl.color,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginTop: 3,
                    }}
                  >
                    {pl.sub}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Soket, riak, kunci lengkung (keystone), dan debu cahaya */}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none" }}
          >
            {/* debu cahaya naik dari ambang pintu */}
            {MOTES.map((m, i) => {
              const rise = (m.y * 300 + frame * m.speed) % 300;
              const o =
                Math.sin((Math.PI * rise) / 300) *
                open *
                (0.35 + 0.35 * Math.sin(frame / 12 + m.phase));
              return (
                <circle
                  key={`mote-${i}`}
                  cx={CX + m.x * (0.5 + rise / 300)}
                  cy={DOOR_BOTTOM + 16 - rise}
                  r={m.r}
                  fill={COLORS.white}
                  opacity={Math.max(0, o)}
                />
              );
            })}

            {/* soket di bingkai: menyala saat paket pertama pilar tiba */}
            {PILLARS.map((pl, i) => {
              const g = GEOMETRY[i];
              const lit = frame >= TIMING[i].firstArrival;
              return (
                <g key={`port-${pl.id}`} opacity={doorS}>
                  <circle
                    cx={g.end.x}
                    cy={g.end.y}
                    r={11}
                    fill="#0B1B3A"
                    stroke={pl.color}
                    strokeWidth={2.5}
                  />
                  <circle
                    cx={g.end.x}
                    cy={g.end.y}
                    r={5}
                    fill={pl.color}
                    opacity={lit ? 1 : 0.25}
                    style={{ filter: lit ? `drop-shadow(0 0 8px ${pl.color})` : undefined }}
                  />
                </g>
              );
            })}

            {/* keystone di puncak lengkung: menyala putih saat pintu menyatu */}
            <circle
              cx={CX}
              cy={DOOR_TOP - FRAME_T / 2}
              r={8}
              fill="#0B1B3A"
              stroke={COLORS.cyan}
              strokeWidth={2}
              opacity={doorS}
            />
            <circle
              cx={CX}
              cy={DOOR_TOP - FRAME_T / 2}
              r={5}
              fill={COLORS.white}
              opacity={locked}
              style={{ filter: `drop-shadow(0 0 ${8 + lockBump * 24}px ${COLORS.cyan})` }}
            />

            {/* riak saat paket data tiba di soket */}
            {ripples.map((r, i) => (
              <circle
                key={i}
                cx={r.x}
                cy={r.y}
                r={12 + r.age * 2.2}
                fill="none"
                stroke={r.color}
                strokeWidth={2}
                opacity={(1 - r.age / RIPPLE_LIFE) * 0.6}
              />
            ))}
          </svg>

          {/* Gelombang kejut dari pintu ketika menyatu & terbuka */}
          {[0, 8].map((delay, i) => {
            const start = LOCK_FRAME + delay;
            const size = interpolate(frame, [start, start + 40], [360, 1700], {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            });
            const opacity = interpolate(frame, [start, start + 4, start + 40], [0, 0.6 - i * 0.2, 0], clamp);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: CX,
                  top: MID_Y,
                  width: size,
                  height: size,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `${2.5 - i * 0.6}px solid ${COLORS.cyan}`,
                  opacity,
                  zIndex: 18,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {/* Kilatan saat kunci terbuka (solid shape + blur) */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: MID_Y,
              width: 360,
              height: 360,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              backgroundColor: COLORS.white,
              filter: "blur(60px)",
              opacity: lockBump * 0.45,
              mixBlendMode: "screen",
              pointerEvents: "none",
              zIndex: 8,
            }}
          />

          {/* Lencana kunci di tengah sambungan daun pintu */}
          <div
            style={{
              position: "absolute",
              left: CX - 42,
              top: MID_Y - 42,
              width: 84,
              height: 84,
              borderRadius: "50%",
              backgroundColor: "#0B1B3A",
              border: `2.5px solid ${COLORS.cyan}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.cyan,
              opacity: doorS * interpolate(open, [0, 0.35], [1, 0], clamp),
              transform: `scale(${1 + lockBump * 0.3})`,
              boxShadow: `0 0 ${24 + energy * 16 + lockBump * 60}px rgba(34, 211, 238, ${
                0.3 + energy * 0.15 + lockBump * 0.4
              })`,
              zIndex: 8,
              pointerEvents: "none",
            }}
          >
            {frame >= LOCK_FRAME ? <Unlock size={34} /> : <Lock size={34} />}
          </div>

          {/* ---------------- TEKS ---------------- */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 96,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 18,
                fontWeight: 800,
                color: COLORS.cyan,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginBottom: 8,
                opacity: spr(DOOR_IN + 12, 18, 110),
              }}
            >
              AICC Centralized Portal
            </div>

            <div
              style={{
                display: "flex",
                gap: 26,
                fontFamily: FONTS.heading,
                fontSize: 92,
                fontWeight: 900,
                color: COLORS.white,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                textShadow: `0 0 ${20 + lockBump * 40}px rgba(34, 211, 238, ${0.25 + lockBump * 0.45})`,
              }}
            >
              <MaskWord text="SATU" progress={spr(DOOR_IN + 16, 16, 130)} />
              <MaskWord text="PINTU" progress={spr(DOOR_IN + 22, 16, 130)} />
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: DOOR_BOTTOM + 52,
              display: "flex",
              justifyContent: "center",
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.textMuted,
                lineHeight: 1.35,
                opacity: spr(DOOR_IN + 30, 18, 100),
                transform: `translateY(${(1 - spr(DOOR_IN + 30, 18, 100)) * 12}px)`,
              }}
            >
              Single Gateway Access for Enterprise Applications
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </VirtualCamera>
  );
};