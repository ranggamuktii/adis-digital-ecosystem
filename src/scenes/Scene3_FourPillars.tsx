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
import { COLORS, FONTS } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { VirtualCamera } from "../components/VirtualCamera";

/* -------------------------------------------------------------------------- */
/*  KONSEP: "EXPLODED VIEW"                                                   */
/*  Empat pilar = empat lapisan satu mesin. Lapisan terpisah satu per satu    */
/*  dari bawah (Production) ke atas (AI), lalu satu denyut data naik menembus */
/*  seluruh tumpukan dan "menghidupkan" tiap lapisan yang dilewatinya.        */
/*  Stage dirancang 1920x1080 lalu di-scale otomatis.                         */
/* -------------------------------------------------------------------------- */
const STAGE_W = 1920;
const STAGE_H = 1080;

const PLATE = 420; // sisi pelat (px, ruang lokal)
const C = PLATE / 2;
const SLICES = 8; // irisan tipis untuk memberi ketebalan pelat
const SLICE_GAP = 3;

const STEP = 175; // jarak vertikal antar pelat di layar
const STACK_CX = 620;
const STACK_CY = 548;
const VERTEX_X = STACK_CX + (PLATE * Math.SQRT2) / 2; // sudut kanan pelat

const ROW_X = 1160;
const ROW_W = 560;
const ROW_H = 150;
const LEADER_W = ROW_X - 22 - (VERTEX_X + 14);

// Denyut data naik setelah keempat pelat terpisah
const PULSE_START = 88;
const PULSE_STEP = 22;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const outCubic = Easing.out(Easing.cubic);

/** Warna aksen dengan transparansi (persen). */
const a = (c: string, pct: number) =>
  `color-mix(in srgb, ${c} ${Math.max(0, Math.min(100, pct))}%, transparent)`;

/* -------------------------------------------------------------------------- */
/*  GLYPH: gambar di permukaan tiap pelat (ruang lokal 420x420)               */
/*  t = waktu sejak lapisan "dihidupkan" (0 = belum aktif)                    */
/* -------------------------------------------------------------------------- */
interface GlyphProps {
  t: number;
  born: number;
  color: string;
}

/** Production: array cetakan yang terisi logam cair satu per satu. */
const MoldGlyph: React.FC<GlyphProps> = ({ t, born, color }) => {
  const pitch = 90;
  const size = 64;
  const o = 88;
  return (
    <g opacity={born}>
      <line x1={26} y1={C} x2={o} y2={C} stroke={color} strokeWidth={5} strokeLinecap="round" />
      {[0, 1, 2].reduce<React.ReactNode[]>(
        (lines, r) => [
          ...lines,
          ...[0, 1].map((c) => (
            <React.Fragment key={`${r}-${c}`}>
              <line
                x1={o + c * pitch + size}
                y1={o + r * pitch + size / 2}
                x2={o + (c + 1) * pitch}
                y2={o + r * pitch + size / 2}
                stroke={a(color, 45)}
                strokeWidth={3}
              />
              <line
                x1={o + r * pitch + size / 2}
                y1={o + c * pitch + size}
                x2={o + r * pitch + size / 2}
                y2={o + (c + 1) * pitch}
                stroke={a(color, 45)}
                strokeWidth={3}
              />
            </React.Fragment>
          )),
        ],
        []
      )}
      {Array.from({ length: 9 }, (_, n) => {
        const x = o + (n % 3) * pitch;
        const y = o + Math.floor(n / 3) * pitch;
        const fill = interpolate(t, [n * 3, n * 3 + 24], [0, 1], clamp);
        return (
          <g key={n}>
            <rect x={x} y={y} width={size} height={size} rx={10} fill="none" stroke={color} strokeWidth={2.5} />
            <rect x={x + 8} y={y + 8} width={size - 16} height={size - 16} rx={6} fill={color} opacity={fill * 0.85} />
          </g>
        );
      })}
    </g>
  );
};

/** Quality: pemindai menyapu lingkaran inspeksi, lalu centang tergambar. */
const ScanGlyph: React.FC<GlyphProps> = ({ t, born, color }) => {
  const sweep = 92 + ((t * 3.2) % 236);
  const scanOn = interpolate(t, [0, 4], [0, 1], clamp);
  const check = interpolate(t, [8, 34], [0, 1], { ...clamp, easing: outCubic });
  return (
    <g opacity={born}>
      <defs>
        <clipPath id="scan-clip">
          <circle cx={C} cy={C} r={118} />
        </clipPath>
      </defs>
      <circle cx={C} cy={C} r={118} fill="none" stroke={color} strokeWidth={2.5} />
      {Array.from({ length: 48 }, (_, n) => {
        const ang = (n * 7.5 * Math.PI) / 180;
        const r2 = n % 4 === 0 ? 148 : 139;
        return (
          <line
            key={n}
            x1={C + Math.cos(ang) * 130}
            y1={C + Math.sin(ang) * 130}
            x2={C + Math.cos(ang) * r2}
            y2={C + Math.sin(ang) * r2}
            stroke={color}
            strokeWidth={2}
            opacity={0.55}
          />
        );
      })}
      <g clipPath="url(#scan-clip)" opacity={scanOn}>
        <rect x={sweep - 60} y={C - 118} width={60} height={236} fill={color} fillOpacity={0.25} />
        <line x1={sweep} y1={C - 118} x2={sweep} y2={C + 118} stroke={COLORS.white} strokeWidth={2} opacity={0.9} />
      </g>
      <path
        d="M160 214 L195 249 L262 170"
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - check}
        opacity={check > 0 ? 1 : 0}
      />
    </g>
  );
};

/** IoT: jaring sensor dengan paket data mengalir ke hub. */
const MeshGlyph: React.FC<GlyphProps> = ({ t, born, color }) => {
  const nodes = Array.from({ length: 8 }, (_, n) => {
    const ang = ((n * 45 + (random(`mesh-a-${n}`) - 0.5) * 24) * Math.PI) / 180;
    const rad = 105 + random(`mesh-r-${n}`) * 50;
    return { x: C + Math.cos(ang) * rad, y: C + Math.sin(ang) * rad };
  });
  const live = t > 0 ? 1 : 0;
  const rp = (t % 70) / 70;
  return (
    <g opacity={born}>
      <circle cx={C} cy={C} r={20 + rp * 150} fill="none" stroke={color} strokeWidth={2} opacity={live * (1 - rp) * 0.55} />
      {nodes.map((nd, n) => {
        const nx = nodes[(n + 1) % nodes.length];
        return (
          <React.Fragment key={n}>
            <line x1={nd.x} y1={nd.y} x2={nx.x} y2={nx.y} stroke={a(color, 25)} strokeWidth={2} />
            <line x1={nd.x} y1={nd.y} x2={C} y2={C} stroke={a(color, 50)} strokeWidth={2.5} />
          </React.Fragment>
        );
      })}
      {nodes.map((nd, n) => {
        const p = (t * 0.025 + n * 0.125) % 1;
        return (
          <g key={n}>
            <circle cx={nd.x} cy={nd.y} r={10} fill="#0C1A38" stroke={color} strokeWidth={3} />
            <circle
              cx={nd.x + (C - nd.x) * p}
              cy={nd.y + (C - nd.y) * p}
              r={4.5}
              fill={COLORS.white}
              opacity={live}
            />
          </g>
        );
      })}
      <circle cx={C} cy={C} r={20} fill={color} />
      <circle cx={C} cy={C} r={8} fill={COLORS.white} />
    </g>
  );
};

/** AI: inti bercahaya dengan cincin berputar berlawanan arah. */
const CoreGlyph: React.FC<GlyphProps> = ({ t, born, color }) => {
  const pulse = 0.5 + 0.5 * Math.sin(t / 7);
  return (
    <g opacity={born}>
      <circle cx={C} cy={C} r={46 + pulse * 10} fill={color} fillOpacity={0.4} />
      <circle cx={C} cy={C} r={24} fill={color} fillOpacity={0.85} />
      {Array.from({ length: 12 }, (_, n) => {
        const ang = (n * 30 * Math.PI) / 180;
        return (
          <line
            key={n}
            x1={C + Math.cos(ang) * 46}
            y1={C + Math.sin(ang) * 46}
            x2={C + Math.cos(ang) * 150}
            y2={C + Math.sin(ang) * 150}
            stroke={color}
            strokeWidth={2}
            opacity={0.18 + 0.55 * Math.max(0, Math.sin(t / 6 - n * 0.55))}
          />
        );
      })}
      <g transform={`rotate(${t * 0.5} ${C} ${C})`}>
        <circle cx={C} cy={C} r={150} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="3 11" />
      </g>
      <g transform={`rotate(${-t * 0.8} ${C} ${C})`}>
        <circle cx={C} cy={C} r={114} fill="none" stroke={color} strokeWidth={3} strokeDasharray="170 62" />
      </g>
      <g transform={`rotate(${t * 1.2} ${C} ${C})`}>
        <circle cx={C} cy={C} r={78} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="2 9" />
      </g>
      <circle cx={C} cy={C} r={30} fill={color} />
      <circle cx={C} cy={C} r={12} fill={COLORS.white} opacity={0.9} />
    </g>
  );
};

/* -------------------------------------------------------------------------- */
/*  DATA  (urutan = dari lapisan paling bawah ke paling atas)                 */
/* -------------------------------------------------------------------------- */
interface PillarData {
  name: string;
  detail: string;
  color: string;
  Glyph: React.FC<GlyphProps>;
  delay: number; // kapan lapisan mulai terpisah
  from: number; // posisi awal (px, relatif posisi akhir)
}

const PILLARS: PillarData[] = [
  {
    name: "Production",
    detail: "Casting & Molding",
    color: COLORS.cyan,
    Glyph: MoldGlyph,
    delay: 4,
    from: -90,
  },
  {
    name: "Quality",
    detail: "Inspection & Chill Check",
    color: COLORS.emerald,
    Glyph: ScanGlyph,
    delay: 22,
    from: STEP,
  },
  {
    name: "IoT",
    detail: "Shopfloor Sensor Mesh",
    color: COLORS.blue,
    Glyph: MeshGlyph,
    delay: 40,
    from: STEP,
  },
  {
    name: "AI",
    detail: "Cognitive Platform",
    color: COLORS.purple,
    Glyph: CoreGlyph,
    delay: 58,
    from: STEP,
  },
];

const cyOf = (i: number) => STACK_CY + (PILLARS.length / 2 - 0.5 - i) * STEP;
const GRID_LINES = Array.from({ length: 9 }, (_, n) => (n + 1) * (PLATE / 10));

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
/* -------------------------------------------------------------------------- */
export const Scene3_FourPillars: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = Math.min(width / STAGE_W, height / STAGE_H);

  const last = PILLARS.length - 1;
  const pulseEnd = PULSE_START + PULSE_STEP * last;
  const beamTop = cyOf(last);
  const beamBottom = cyOf(0);

  return (
    <VirtualCamera durationInFrames={210} zoomFrom={1.0} zoomTo={1.04} panXFrom={-20} panXTo={20}>
      <AbsoluteFill style={{ backgroundColor: COLORS.base, overflow: "hidden" }}>
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
          {/* Cahaya ambient di belakang tumpukan */}
          <div
            style={{
              position: "absolute",
              left: STACK_CX - 700,
              top: STACK_CY - 520,
              width: 1400,
              height: 1040,
              borderRadius: "50%",
              backgroundColor: COLORS.blue,
              filter: "blur(90px)",
              opacity: 0.1,
              pointerEvents: "none",
            }}
          />

          {/* Cincin lantai isometrik di bawah pelat paling bawah */}
          {[840, 600].map((w, n) => (
            <div
              key={w}
              style={{
                position: "absolute",
                left: STACK_CX - w / 2,
                top: cyOf(0) + 30 - w / 4,
                width: w,
                height: w / 2,
                borderRadius: "50%",
                border: `1.5px dashed ${a(COLORS.white, 16)}`,
                opacity: interpolate(frame, [0, 24 + n * 8], [0, 1], clamp),
                scale: interpolate(frame, [0, 30 + n * 8], [0.7, 1], { ...clamp, easing: outCubic }),
              }}
            />
          ))}

          {/* Satu lapisan = pelat + garis penunjuk + baris data */}
          {PILLARS.map((p, i) => {
            const cy = cyOf(i);
            const f = frame - p.delay;

            // Saat denyut data melewati lapisan ini, ia "hidup" dan terangkat
            const tA = PULSE_START + i * PULSE_STEP;
            const t = Math.max(0, frame - tA);
            const act = interpolate(frame, [tA - 4, tA + 12], [0, 1], { ...clamp, easing: outCubic });
            const lift = interpolate(frame, [tA - 6, tA + 6, tA + 28], [0, 18, 7], {
              ...clamp,
              easing: Easing.inOut(Easing.cubic),
            });

            // Pelat memisahkan diri dari lapisan di bawahnya
            const emerge = spring({ frame: Math.max(0, f), fps, config: { damping: 15, stiffness: 70 } });
            const plateOn = interpolate(f, [0, 10], [0, 1], clamp);
            const born = interpolate(f, [4, 26], [0, 1], clamp);

            // Baris keterangan menyusul setelah pelat mendarat
            const leaderP = interpolate(f, [12, 30], [0, 1], { ...clamp, easing: outCubic });
            const hairP = interpolate(f, [16, 46], [0, 1], { ...clamp, easing: outCubic });
            const rName = spring({ frame: Math.max(0, f - 14), fps, config: { damping: 18, stiffness: 120 } });
            const rDetail = interpolate(f, [20, 40], [0, 1], { ...clamp, easing: outCubic });

            return (
              <div
                key={p.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 10 + i,
                  translate: `0 ${-lift}px`,
                }}
              >
                {/* Pelat isometrik */}
                <div
                  style={{
                    position: "absolute",
                    left: STACK_CX - C,
                    top: cy - C,
                    width: PLATE,
                    height: PLATE,
                    opacity: plateOn,
                    translate: `0 ${(1 - emerge) * p.from}px`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      transformStyle: "preserve-3d",
                      transform: "rotateX(60deg) rotateZ(-45deg)",
                    }}
                  >
                    {Array.from({ length: SLICES }, (_, s) => (
                      <div
                        key={s}
                        style={{
                          position: "absolute",
                          inset: 0,
                          boxSizing: "border-box",
                          borderRadius: 18,
                          backgroundColor: "#0A1530",
                          border: `1.5px solid ${a(p.color, 30 + act * 30)}`,
                          transform: `translateZ(${-(s + 1) * SLICE_GAP}px)`,
                        }}
                      />
                    ))}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        boxSizing: "border-box",
                        borderRadius: 18,
                        border: `2.5px solid ${a(p.color, 55 + act * 45)}`,
                        backgroundColor: "#0C1A38",
                        boxShadow: `0 0 ${12 + act * 40}px ${a(p.color, 18 + act * 38)}`,
                      }}
                    >
                      <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${PLATE} ${PLATE}`}
                        style={{ position: "absolute", inset: 0 }}
                      >
                        {GRID_LINES.map((g) => (
                          <React.Fragment key={g}>
                            <line x1={g} y1={0} x2={g} y2={PLATE} stroke={COLORS.white} strokeWidth={1} opacity={0.05} />
                            <line x1={0} y1={g} x2={PLATE} y2={g} stroke={COLORS.white} strokeWidth={1} opacity={0.05} />
                          </React.Fragment>
                        ))}
                        <p.Glyph t={t} born={born} color={p.color} />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Garis penunjuk dari sudut pelat ke baris data */}
                <div
                  style={{
                    position: "absolute",
                    left: VERTEX_X + 14,
                    top: cy - 1,
                    width: LEADER_W,
                    height: 2,
                    backgroundColor: p.color,
                    opacity: 0.4 + act * 0.6,
                    boxShadow: `0 0 ${act * 14}px ${p.color}`,
                    transformOrigin: "left center",
                    scale: `${leaderP} 1`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: VERTEX_X + 4,
                    top: cy - 6,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: p.color,
                    boxShadow: `0 0 ${6 + act * 16}px ${p.color}`,
                    scale: leaderP * (1 + act * 0.3),
                  }}
                />

                {/* Baris data */}
                <div
                  style={{
                    position: "absolute",
                    left: ROW_X,
                    top: cy - ROW_H / 2,
                    width: ROW_W,
                    height: ROW_H,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: 0.62 + act * 0.38,
                  }}
                >
                  <div>
                    {/* Nama muncul dari balik garis (mask) */}
                    <div style={{ overflow: "hidden", paddingBottom: 6 }}>
                      <div
                        style={{
                          fontFamily: FONTS.heading,
                          fontSize: 82,
                          fontWeight: 800,
                          letterSpacing: -2,
                          lineHeight: 1.05,
                          color: COLORS.white,
                          translate: `0 ${(1 - rName) * 110}%`,
                        }}
                      >
                        {p.name}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: FONTS.body,
                        fontSize: 28,
                        fontWeight: 500,
                        color: "#CBD5E1",
                        marginTop: 6,
                        letterSpacing: 0.2,
                        clipPath: `inset(0 ${(1 - rDetail) * 100}% 0 0)`,
                      }}
                    >
                      {p.detail}
                    </div>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 2,
                      backgroundColor: a(p.color, 45),
                      boxShadow: `0 0 10px ${a(p.color, 25)}`,
                      transformOrigin: "left center",
                      scale: `${hairP} 1`,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Sumbu data yang menembus seluruh tumpukan */}
          <div
            style={{
              position: "absolute",
              left: STACK_CX - 1,
              top: beamTop,
              width: 2,
              height: beamBottom - beamTop,
              backgroundColor: "rgba(255, 255, 255, 0.25)",
              transformOrigin: "bottom center",
              scale: `1 ${interpolate(frame, [PULSE_START - 22, PULSE_START - 2], [0, 1], { ...clamp, easing: outCubic })}`,
              zIndex: 40,
            }}
          />
          {/* Denyut cahaya naik dari Production ke AI */}
          <div
            style={{
              position: "absolute",
              left: STACK_CX - 3,
              top: interpolate(frame, [PULSE_START, pulseEnd], [beamBottom, beamTop], clamp) - 6,
              width: 6,
              height: 130,
              borderRadius: 3,
              backgroundColor: COLORS.white,
              boxShadow: `0 0 22px 4px ${a(COLORS.white, 45)}`,
              opacity: interpolate(frame, [PULSE_START - 2, PULSE_START + 2, pulseEnd, pulseEnd + 8], [0, 1, 1, 0], clamp),
              zIndex: 41,
            }}
          />
          {/* Gelombang penutup saat denyut tiba di AI */}
          <div
            style={{
              position: "absolute",
              left: STACK_CX - 300,
              top: beamTop - 150 - 10,
              width: 600,
              height: 300,
              borderRadius: "50%",
              border: `2px solid ${COLORS.purple}`,
              opacity: interpolate(frame, [pulseEnd, pulseEnd + 4, pulseEnd + 36], [0, 0.8, 0], clamp),
              scale: interpolate(frame, [pulseEnd, pulseEnd + 36], [0.5, 1.6], { ...clamp, easing: outCubic }),
              zIndex: 42,
              pointerEvents: "none",
            }}
          />
        </div>
      </AbsoluteFill>
    </VirtualCamera>
  );
};