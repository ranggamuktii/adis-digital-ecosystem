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
import { VirtualCamera } from "../components/VirtualCamera";

/* -------------------------------------------------------------------------- */
/*  KONSEP: "ANALOG → DIGITAL → AI"                                           */
/*  Tiga pilar mulai sebagai proses manual (alat ukur jarum, formulir kertas, */
/*  cek keliling). Garis pindai menyapu tiap panel dan mengubahnya jadi       */
/*  versi digital. Setelah ketiganya digital, semuanya mengalir ke satu inti  */
/*  AI yang menyala emas. Stage 1920x1080, di-scale otomatis.                 */
/* -------------------------------------------------------------------------- */
const STAGE_W = 1920;
const STAGE_H = 1080;
const CX = STAGE_W / 2;

const PANEL_W = 500;
const PANEL_GAP = 70;
const PANEL_TOP = 300;
const HEAD_H = 56;
const BH = 360; // tinggi badan panel (ruang SVG 500x360)
const PANEL_H = HEAD_H + BH + 4;
const PANEL_LEFT = (STAGE_W - (3 * PANEL_W + 2 * PANEL_GAP)) / 2;

const CORE_Y = 890;
const CORE_R = 52;

const SWEEP_DUR = 32;
const LINE_DUR = 14;
const CYCLE = 16; // durasi paket naik (panel → AI)
const DOWN_DUR = 14; // durasi paket emas turun (AI → panel)
const RIPPLE_LIFE = 16;

const AI_RGB = "168, 85, 247";
const MONO = FONTS.body;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const easeOut = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

/** Warna aksen dengan transparansi (persen). */
const a = (c: string, pct: number) =>
  `color-mix(in srgb, ${c} ${Math.max(0, Math.min(100, pct))}%, transparent)`;

const fmtId = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/* -------------------------------------------------------------------------- */
/*  GEOMETRI SVG                                                              */
/* -------------------------------------------------------------------------- */
type Pt = { x: number; y: number };

const polar = (cx: number, cy: number, r: number, deg: number): Pt => ({
  x: cx + r * Math.cos((deg * Math.PI) / 180),
  y: cy + r * Math.sin((deg * Math.PI) / 180),
});

const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1.x} ${p1.y}`;
};

/** Garis tulisan tangan yang sedikit bergelombang (deterministik). */
const scribble = (x: number, y: number, w: number, seed: string) => {
  const n = Math.max(2, Math.round(w / 9));
  const step = w / n;
  let d = `M ${x} ${y}`;
  for (let s = 0; s < n; s++) {
    d += ` q ${step / 2} ${(random(`${seed}-${s}`) - 0.5) * 9} ${step} ${(random(`${seed}-e${s}`) - 0.5) * 3}`;
  }
  return d;
};

const bezier = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

/* ---- denah pabrik bersama (dipakai analog & digital pilar IoT) ----------- */
const MACHINES = [
  [36, 100], [148, 92], [268, 104], [388, 96],
  [56, 196], [186, 206], [316, 190], [408, 214],
  [104, 290], [262, 284], [384, 300],
].map(([x, y]) => ({ x, y, w: 56, h: 36 }));
const MC = MACHINES.map((m) => ({ x: m.x + m.w / 2, y: m.y + m.h / 2 }));
const HUB = { x: 236, y: 152 };

const ROUTE_LEN = MC.slice(1).map((p, i) => Math.hypot(p.x - MC[i].x, p.y - MC[i].y));
const ROUTE_TOTAL = ROUTE_LEN.reduce((s, l) => s + l, 0);
const walkerAt = (u: number): Pt => {
  let d = u * ROUTE_TOTAL;
  for (let i = 0; i < ROUTE_LEN.length; i++) {
    if (d <= ROUTE_LEN[i]) {
      const t = d / ROUTE_LEN[i];
      return { x: MC[i].x + (MC[i + 1].x - MC[i].x) * t, y: MC[i].y + (MC[i + 1].y - MC[i].y) * t };
    }
    d -= ROUTE_LEN[i];
  }
  return MC[MC.length - 1];
};

/* -------------------------------------------------------------------------- */
/*  LAPISAN PANEL (ruang SVG 500x360)                                         */
/*  t0 = frame saat garis pindai mulai menyapu panel                          */
/* -------------------------------------------------------------------------- */
interface LayerProps {
  frame: number;
  t0: number;
  color: string;
}

/* ---- PRODUCTION: alat ukur jarum + catatan tangan → grafik suhu live ----- */
const GAUGE = { x: 170, y: 190 };
const gAngle = (f: number) => 135 + 270 * f;
const LOG_ROWS = [0, 1, 2, 3, 4, 5, 6].map((n) => ({
  y: 100 + n * 29,
  w: 60 + random(`prod-log-${n}`) * 80,
}));

const ProdAnalog: React.FC<LayerProps> = ({ frame }) => {
  const needle = gAngle(0.51) + 6 * Math.sin(frame / 5) + 3 * Math.sin(frame / 2.3);
  const tip = polar(GAUGE.x, GAUGE.y, 86, needle);
  const tail = polar(GAUGE.x, GAUGE.y, -18, needle);
  return (
    <g>
      <rect width={500} height={BH} fill="#1E2026" />
      <text x={24} y={36} fontSize={15} fontStyle="italic" fill="#CFC6AE" fontFamily={FONTS.body}>
        Baca & catat manual tiap jam
      </text>
      <circle cx={GAUGE.x} cy={GAUGE.y} r={118} fill="#3A3F4A" stroke="#5A6070" strokeWidth={3} />
      <circle cx={GAUGE.x} cy={GAUGE.y} r={108} fill="#E8E1CF" />
      <path d={arcPath(GAUGE.x, GAUGE.y, 101, 297, 405)} stroke="#B03A2E" strokeWidth={6} fill="none" opacity={0.85} />
      {Array.from({ length: 41 }, (_, n) => {
        const ang = gAngle(n / 40);
        const major = n % 5 === 0;
        const p0 = polar(GAUGE.x, GAUGE.y, 93, ang);
        const p1 = polar(GAUGE.x, GAUGE.y, major ? 77 : 85, ang);
        return <line key={n} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#2B2B2B" strokeWidth={major ? 2.4 : 1.2} />;
      })}
      {[0, 20, 40].map((n) => {
        const p = polar(GAUGE.x, GAUGE.y, 62, gAngle(n / 40));
        return (
          <text key={n} x={p.x} y={p.y} fontSize={11} fill="#4A4538" textAnchor="middle" dominantBaseline="central" fontFamily={FONTS.body}>
            {1300 + n * 5 > 1300 ? fmtId(1300 + n * 5) : "1.300"}
          </text>
        );
      })}
      <text x={GAUGE.x} y={GAUGE.y + 58} fontSize={12} fill="#6B6455" textAnchor="middle" fontFamily={FONTS.body}>
        SUHU TUANG °C
      </text>
      <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} stroke="#2B2B2B" strokeWidth={3} strokeLinecap="round" />
      <circle cx={GAUGE.x} cy={GAUGE.y} r={9} fill="#2B2B2B" />

      {/* kertas catatan tulis tangan */}
      <g transform="rotate(2 390 180)">
        <rect x={306} y={64} width={170} height={236} fill="#D9D2C0" />
        <path d={scribble(318, 84, 90, "prod-head")} fill="none" stroke="#2B2B2B" strokeWidth={2.4} strokeLinecap="round" />
        {LOG_ROWS.map((r, n) => (
          <path key={n} d={scribble(318, r.y, r.w, `prod-row-${n}`)} fill="none" stroke="#3B3A5A" strokeWidth={1.8} strokeLinecap="round" />
        ))}
        <line x1={318} y1={LOG_ROWS[3].y} x2={318 + LOG_ROWS[3].w} y2={LOG_ROWS[3].y} stroke="#B03A2E" strokeWidth={2} />
      </g>
    </g>
  );
};

const ProdDigital: React.FC<LayerProps> = ({ frame, t0, color }) => {
  const pts = Array.from({ length: 61 }, (_, n) => {
    const v = 1400 + 9 * Math.sin(n * 0.35 + frame / 8) + 4 * Math.sin(n * 0.9 - frame / 5);
    return { x: 28 + n * 7.4, y: 170 - (v - 1400) * 3.4, v };
  });
  const last = pts[pts.length - 1];
  const oee = 94.8 * easeOut(frame, t0 + 10, t0 + 60);
  return (
    <g>
      <rect width={500} height={BH} fill="#0A1530" />
      {[0, 1, 2, 3, 4, 5, 6].map((n) => (
        <line key={n} x1={28 + n * 74} y1={102} x2={28 + n * 74} y2={238} stroke={COLORS.white} strokeWidth={1} opacity={0.05} />
      ))}
      <text x={28} y={48} fontSize={38} fontWeight={800} fill={color} fontFamily={FONTS.heading}>
        {fmtId(last.v)}°C
      </text>
      <text x={28} y={70} fontSize={13} fill={COLORS.textMuted} fontFamily={FONTS.body}>
        Suhu tuang, dalam toleransi
      </text>
      <text x={472} y={48} fontSize={38} fontWeight={800} fill={COLORS.white} textAnchor="end" fontFamily={FONTS.heading}>
        {oee.toFixed(1)}%
      </text>
      <text x={472} y={70} fontSize={13} fill={COLORS.textMuted} textAnchor="end" fontFamily={FONTS.body}>
        OEE
      </text>

      <rect x={28} y={102} width={444} height={136} fill={a(color, 10)} />
      <line x1={28} y1={102} x2={472} y2={102} stroke={a(color, 55)} strokeWidth={1.5} strokeDasharray="6 5" />
      <line x1={28} y1={238} x2={472} y2={238} stroke={a(color, 55)} strokeWidth={1.5} strokeDasharray="6 5" />
      <text x={466} y={97} fontSize={11} fill={a(color, 80)} textAnchor="end" fontFamily={FONTS.body}>1.420</text>
      <text x={466} y={254} fontSize={11} fill={a(color, 80)} textAnchor="end" fontFamily={FONTS.body}>1.380</text>
      <polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <circle cx={last.x} cy={last.y} r={5} fill={COLORS.white} />
      <circle cx={last.x} cy={last.y} r={5 + ((frame / 2) % 12)} fill="none" stroke={color} strokeWidth={1.5} opacity={1 - ((frame / 2) % 12) / 12} />

      <rect x={28} y={296} width={444} height={8} rx={4} fill={COLORS.white} opacity={0.1} />
      <rect x={28} y={296} width={444 * 0.948 * easeOut(frame, t0 + 10, t0 + 60)} height={8} rx={4} fill={color} />
      <text x={28} y={326} fontSize={14} fill={COLORS.white} fontWeight={700} fontFamily={FONTS.body}>OEE</text>
      <text x={472} y={326} fontSize={14} fill={COLORS.textMuted} textAnchor="end" fontFamily={FONTS.body}>Optimized</text>
    </g>
  );
};

/* ---- QUALITY: formulir kertas dengan centang tangan → inspeksi visual AI -- */
const CHECK_LABELS = ["Dimensi kritis", "Chill check", "Porositas", "Permukaan"];

const QualAnalog: React.FC<LayerProps> = () => (
  <g>
    <rect width={500} height={BH} fill="#1E2026" />
    <rect x={100} y={14} width={300} height={336} rx={14} fill="#6B4F2E" stroke="#4A3720" strokeWidth={2} />
    <rect x={190} y={4} width={120} height={32} rx={6} fill="#A0A5AE" />
    <circle cx={250} cy={20} r={5} fill="#6B7080" />
    <g transform="rotate(-2 250 190)">
      <rect x={116} y={44} width={268} height={292} fill="#E8E1CF" />
      <path d={scribble(130, 68, 130, "qual-head")} fill="none" stroke="#2B2B2B" strokeWidth={2.4} strokeLinecap="round" />
      <line x1={130} y1={82} x2={370} y2={82} stroke="#B8AF98" strokeWidth={1.5} />
      {[0, 1, 2, 3, 4, 5].map((n) => {
        const y = 112 + n * 38;
        return (
          <g key={n}>
            <rect x={132} y={y - 9} width={16} height={16} fill="none" stroke="#333" strokeWidth={1.6} />
            <path d={scribble(160, y, 90 + random(`qual-row-${n}`) * 80, `qual-lbl-${n}`)} fill="none" stroke="#3B3A5A" strokeWidth={1.8} strokeLinecap="round" />
            {n !== 3 && n !== 5 && (
              <path d={`M ${134} ${y - 1} l 5 7 l 12 -15`} fill="none" stroke="#1E3A8A" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            )}
            {n === 3 && <path d={`M 133 ${y - 8} l 14 14 M 147 ${y - 8} l -14 14`} stroke="#B03A2E" strokeWidth={2.4} strokeLinecap="round" />}
            {n === 5 && (
              <text x={335} y={y + 5} fontSize={20} fill="#B07A1E" fontStyle="italic" fontFamily={FONTS.body}>?</text>
            )}
          </g>
        );
      })}
      <ellipse cx={250} cy={188} rx={128} ry={22} fill="none" stroke="#B03A2E" strokeWidth={2} strokeDasharray="10 4" />
      <circle cx={330} cy={290} r={24} fill="none" stroke="#A8845A" strokeWidth={3} opacity={0.5} />
    </g>
  </g>
);

const QualDigital: React.FC<LayerProps> = ({ frame, t0, color }) => {
  const C0 = { x: 150, y: 185 };
  const scanY = 85 + 200 * (0.5 + 0.5 * Math.sin(frame / 14));
  const hole = polar(C0.x, C0.y, 48, 135);
  const L = 26;
  const bx = C0.x - 106;
  const by = C0.y - 106;
  const bs = 212;
  const verified = 100 * easeOut(frame, t0 + 30, t0 + 70);
  return (
    <g>
      <defs>
        <linearGradient id="q-scan" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={color} stopOpacity={0.3} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect width={500} height={BH} fill="#0A1530" />
      {[96, 66, 30].map((r) => (
        <circle key={r} cx={C0.x} cy={C0.y} r={r} fill={r === 96 ? a(color, 6) : "none"} stroke={a(color, r === 96 ? 70 : 50)} strokeWidth={1.5} />
      ))}
      {Array.from({ length: 6 }, (_, n) => {
        const p = polar(C0.x, C0.y, 48, n * 60 + 15);
        return <circle key={n} cx={p.x} cy={p.y} r={9} fill="none" stroke={a(color, 80)} strokeWidth={1.5} />;
      })}

      {/* sapuan pemindai */}
      <rect x={bx} y={scanY - 34} width={bs} height={34} fill="url(#q-scan)" />
      <line x1={bx} y1={scanY} x2={bx + bs} y2={scanY} stroke={COLORS.white} strokeWidth={2} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />

      {/* kotak deteksi */}
      {[
        [bx, by, 1, 1], [bx + bs, by, -1, 1], [bx, by + bs, 1, -1], [bx + bs, by + bs, -1, -1],
      ].map(([x, y, sx, sy], n) => (
        <path key={n} d={`M ${x} ${y + sy * L} V ${y} H ${x + sx * L}`} fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
      ))}
      <rect x={bx} y={by - 30} width={104} height={22} rx={5} fill={color} />
      <text x={bx + 52} y={by - 14} fontSize={13} fontWeight={800} fill="#03140D" textAnchor="middle" fontFamily={FONTS.heading}>
        OK 99.2%
      </text>
      <rect x={hole.x - 15} y={hole.y - 15} width={30} height={30} fill="none" stroke={COLORS.emerald} strokeWidth={2} />
      <text x={hole.x - 15} y={hole.y + 30} fontSize={11} fill={COLORS.emerald} fontFamily={FONTS.body}>chill OK</text>

      {/* daftar periksa otomatis */}
      {CHECK_LABELS.map((lbl, n) => {
        const y = 86 + n * 48;
        const d = easeOut(frame, t0 + 14 + n * 10, t0 + 26 + n * 10);
        return (
          <g key={lbl} opacity={d}>
            <circle cx={306} cy={y} r={12} fill={a(color, 20)} stroke={color} strokeWidth={1.8} />
            <path d={`M ${302} ${y} L ${305} ${y + 3.5} L ${311} ${y - 4}`} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            <text x={328} y={y + 5} fontSize={16} fill={COLORS.white} fontWeight={600} fontFamily={FONTS.body}>{lbl}</text>
          </g>
        );
      })}
      <text x={292} y={322} fontSize={44} fontWeight={800} fill={color} fontFamily={FONTS.heading}>
        {Math.round(verified)}%
      </text>
      <text x={292} y={346} fontSize={14} fill={COLORS.textMuted} fontFamily={FONTS.body}>verified in-line</text>
    </g>
  );
};

/* ---- IoT: cek keliling manual → jaring sensor live ---------------------- */
const IotAnalog: React.FC<LayerProps> = ({ frame }) => {
  const w = walkerAt((frame * 0.004) % 1);
  return (
    <g>
      <rect width={500} height={BH} fill="#1E2026" />
      <text x={24} y={36} fontSize={15} fontStyle="italic" fill="#CFC6AE" fontFamily={FONTS.body}>
        Cek keliling manual
      </text>
      {MACHINES.map((m, n) => (
        <rect key={n} x={m.x} y={m.y} width={m.w} height={m.h} rx={4} fill="#2A2E38" stroke="#6B7080" strokeWidth={1.5} />
      ))}
      <polyline
        points={MC.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="#D9A441"
        strokeWidth={2.5}
        strokeDasharray="7 6"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {[2, 6, 9].map((n) => (
        <text key={n} x={MC[n].x - 4} y={MC[n].y + 6} fontSize={18} fill="#D9A441" fontStyle="italic" fontFamily={FONTS.body}>?</text>
      ))}
      <circle cx={w.x} cy={w.y} r={9} fill="#E8E1CF" />
      <rect x={w.x + 8} y={w.y - 6} width={10} height={13} rx={1.5} fill="#A8845A" />
    </g>
  );
};

const IotDigital: React.FC<LayerProps> = ({ frame, t0, color }) => {
  const sensors = 450 * easeOut(frame, t0 + 8, t0 + 55);
  return (
    <g>
      <rect width={500} height={BH} fill="#0A1530" />
      {MC.map((p, n) => (
        <line key={n} x1={p.x} y1={p.y} x2={HUB.x} y2={HUB.y} stroke={a(color, 35)} strokeWidth={1.5} />
      ))}
      {MACHINES.map((m, n) => (
        <rect key={n} x={m.x} y={m.y} width={m.w} height={m.h} rx={4} fill={a(color, 10)} stroke={a(color, 60)} strokeWidth={1.5} />
      ))}
      {MC.map((p, n) => {
        const u = (frame * 0.02 + n * 0.17) % 1;
        const ring = (frame / 3 + n * 7) % 20;
        return (
          <g key={n}>
            <circle cx={p.x} cy={p.y} r={6 + ring} fill="none" stroke={color} strokeWidth={1.2} opacity={(1 - ring / 20) * 0.5} />
            <circle cx={p.x} cy={p.y} r={6} fill={color} />
            <circle cx={p.x + (HUB.x - p.x) * u} cy={p.y + (HUB.y - p.y) * u} r={3} fill={COLORS.white} />
          </g>
        );
      })}
      <circle cx={HUB.x} cy={HUB.y} r={13} fill="#0A1530" stroke={COLORS.white} strokeWidth={3} />
      <circle cx={HUB.x} cy={HUB.y} r={5} fill={color} />
      <text x={24} y={48} fontSize={38} fontWeight={800} fill={color} fontFamily={FONTS.heading}>
        {Math.round(sensors)}+
      </text>
      <text x={24} y={70} fontSize={13} fill={COLORS.textMuted} fontFamily={FONTS.body}>edge sensors online</text>
      <circle cx={452} cy={40} r={5} fill={color} opacity={0.5 + 0.5 * Math.sin(frame / 5)} />
      <text x={440} y={45} fontSize={13} fontWeight={800} fill={color} textAnchor="end" fontFamily={FONTS.heading}>LIVE</text>
    </g>
  );
};

/* -------------------------------------------------------------------------- */
/*  DATA                                                                      */
/* -------------------------------------------------------------------------- */
interface NodeData {
  name: string;
  color: string;
  Icon: LucideIcon;
  Analog: React.FC<LayerProps>;
  Digital: React.FC<LayerProps>;
}

const NODES: NodeData[] = [
  { name: "PRODUCTION", color: COLORS.cyan, Icon: Factory, Analog: ProdAnalog, Digital: ProdDigital },
  { name: "QUALITY", color: COLORS.emerald, Icon: ShieldCheck, Analog: QualAnalog, Digital: QualDigital },
  { name: "IoT", color: COLORS.blue, Icon: Radio, Analog: IotAnalog, Digital: IotDigital },
];

const panelX = (i: number) => PANEL_LEFT + i * (PANEL_W + PANEL_GAP);
const panelCx = (i: number) => panelX(i) + PANEL_W / 2;

/* ---- timeline ------------------------------------------------------------ */
const enterAt = (i: number) => 12 + i * 6;
const sweepStart = (i: number) => 30 + i * 10;
const lineStart = (i: number) => 80 + i * 3;
const lineEnd = (i: number) => lineStart(i) + LINE_DUR;
const arrival = (i: number) => lineEnd(i) + CYCLE;
const IGNITE = Math.max(...NODES.map((_, i) => arrival(i))) + 4;
const downDepart = (i: number) => IGNITE + i * 4;
const downArrival = (i: number) => downDepart(i) + DOWN_DUR;

/* ---- konduit panel → inti AI -------------------------------------------- */
const GEO = NODES.map((_, i) => {
  const start: Pt = { x: panelCx(i), y: PANEL_TOP + PANEL_H + 6 };
  const end: Pt = { x: CX, y: CORE_Y - CORE_R - 8 };
  const midY = (start.y + end.y) / 2;
  const c1: Pt = { x: start.x, y: midY };
  const c2: Pt = { x: end.x, y: midY };
  return { start, c1, c2, end, d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}` };
});
type Geo = (typeof GEO)[number];

/* ---- partikel aksen halus (subtle & elegant) ------------------------- */
const BURST = Array.from({ length: 8 }, (_, i) => ({
  angle: random(`s4-burst-a-${i}`) * Math.PI * 2,
  speed: 120 + random(`s4-burst-s-${i}`) * 180,
  width: 1.0 + random(`s4-burst-w-${i}`) * 1.5,
}));

const RAIN_COLS = 18;
const RAIN_ROWS = 14;

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

/** Paket data dengan ekor. dir=+1 bergerak searah t naik, -1 sebaliknya. */
const Packet: React.FC<{ g: Geo; t: number; dir: 1 | -1; color: string }> = ({ g, t, dir, color }) => {
  const head = bezier(g.start, g.c1, g.c2, g.end, t);
  return (
    <g opacity={Math.min(1, Math.min(t, 1 - t) * 14 + 0.2)}>
      {Array.from({ length: 8 }, (_, s) => {
        const tt = t - dir * (s + 1) * 0.03;
        if (tt < 0 || tt > 1) return null;
        const pt = bezier(g.start, g.c1, g.c2, g.end, tt);
        return <circle key={s} cx={pt.x} cy={pt.y} r={5.5 * (1 - (s + 1) / 9)} fill={color} opacity={0.55 * (1 - s / 8)} />;
      })}
      <circle cx={head.x} cy={head.y} r={6} fill={COLORS.white} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
      <circle cx={head.x} cy={head.y} r={9} fill="none" stroke={color} strokeWidth={2} opacity={0.8} />
    </g>
  );
};

/** Panel: lapisan analog di bawah, lapisan digital terbuka oleh garis pindai. */
const PanelCard: React.FC<{
  node: NodeData;
  index: number;
  frame: number;
  enter: number;
  p: number; // progres pindai 0..1
  integ: number; // 0..1 setelah terintegrasi AI
  hit: number; // kilatan saat paket emas tiba
}> = ({ node, index, frame, enter, p, integ, hit }) => {
  const { Analog, Digital, Icon, color } = node;
  const t0 = sweepStart(index);
  const accent = integ > 0.5 ? COLORS.purple : color;
  const sx = p * PANEL_W;
  const digital = p > 0.02;
  const chipColor = integ > 0.5 ? COLORS.purple : digital ? color : "#8A90A0";
  const chipText = integ > 0.5 ? "INTEGRATED WITH AI" : digital ? "DIGITAL • LIVE" : "MANUAL";

  return (
    <div
      style={{
        position: "absolute",
        left: panelX(index),
        top: PANEL_TOP,
        width: PANEL_W,
        height: PANEL_H,
        boxSizing: "border-box",
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#0B1B3A",
        border: `1.5px solid ${digital ? a(accent, 45 + p * 45) : "rgba(255, 255, 255, 0.18)"}`,
        boxShadow: `0 0 ${p * 26 + integ * 24 + hit * 40}px ${a(accent, 22 + hit * 30)}`,
        opacity: Math.min(1, enter * 1.5),
        transform: `translateY(${(1 - enter) * 40}px)`,
        zIndex: 15,
        pointerEvents: "none",
      }}
    >
      {/* header */}
      <div
        style={{
          height: HEAD_H,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: `1.5px solid ${digital ? accent : "#8A90A0"}`,
              color: digital ? accent : "#8A90A0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={18} />
          </div>
          <span style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 800, color: COLORS.white }}>
            {node.name}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 16,
            backgroundColor: a(chipColor, 16),
            border: `1px solid ${a(chipColor, 70)}`,
            color: chipColor,
            fontFamily: FONTS.heading,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.1em",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: chipColor,
              opacity: digital ? 0.55 + 0.45 * Math.sin(frame / 5) : 0.6,
            }}
          />
          {chipText}
        </div>
      </div>

      {/* badan: analog + digital + garis pindai */}
      <div style={{ position: "relative", width: PANEL_W, height: BH }}>
        <svg width={PANEL_W} height={BH} viewBox={`0 0 500 ${BH}`} style={{ position: "absolute", inset: 0 }}>
          <Analog frame={frame} t0={t0} color={color} />
        </svg>
        <svg
          width={PANEL_W}
          height={BH}
          viewBox={`0 0 500 ${BH}`}
          style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}
        >
          <Digital frame={frame} t0={t0} color={color} />
        </svg>

        {p > 0 && p < 1 && (
          <>
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: sx - 90,
                width: 90,
                background: `linear-gradient(90deg, rgba(0,0,0,0), ${a(color, 35)})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: sx - 1.5,
                width: 3,
                backgroundColor: COLORS.white,
                boxShadow: `0 0 18px 2px ${color}`,
              }}
            />
            {[10, 32].map((off, c) => (
              <div
                key={off}
                style={{
                  position: "absolute",
                  left: sx + off,
                  top: 8,
                  bottom: 8,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  fontFamily: MONO,
                  fontSize: 14,
                  color,
                  opacity: 0.8 - c * 0.4,
                }}
              >
                {Array.from({ length: 16 }, (_, r) => (
                  <span key={r}>{random(`s4-bin-${index}-${c}-${r}-${Math.floor(frame / 2)}`) > 0.5 ? "1" : "0"}</span>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
/* -------------------------------------------------------------------------- */
export const Scene4_AITransformation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = Math.min(width / STAGE_W, height / STAGE_H);

  const spr = (delay: number, damping = 16, stiffness = 120) =>
    spring({ frame: Math.max(0, frame - delay), fps, config: { damping, stiffness } });

  /* ---- Progres utama -------------------------------------------------- */
  const sweeps = NODES.map((_, i) =>
    interpolate(frame, [sweepStart(i), sweepStart(i) + SWEEP_DUR], [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    })
  );
  const digitalAmt = (sweeps[0] + sweeps[1] + sweeps[2]) / 3;

  const coreS = spr(46, 13, 130);
  const ignite = interpolate(frame, [IGNITE, IGNITE + 14], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const bump = interpolate(frame, [IGNITE, IGNITE + 5, IGNITE + 22], [0, 1, 0], clamp);
  const shakeX = (random(`s4-shake-x-${frame}`) - 0.5) * 8 * bump;
  const shakeY = (random(`s4-shake-y-${frame}`) - 0.5) * 8 * bump;

  /* ---- Riak di inti AI setiap paket naik tiba ------------------------- */
  const ripples: { color: string; age: number }[] = [];
  NODES.forEach((n, i) => {
    [0, 1].forEach((kk) => {
      const tloc = frame - lineEnd(i) - kk * 0.5 * CYCLE;
      if (tloc >= CYCLE) {
        const age = tloc % CYCLE;
        if (age < RIPPLE_LIFE) ripples.push({ color: n.color, age });
      }
    });
  });
  const energy = ripples.reduce((m, r) => Math.max(m, 1 - r.age / RIPPLE_LIFE), 0);

  const auraOpacity = interpolate(frame, [50, 100], [0, 0.18], clamp) + ignite * 0.3 + energy * 0.05 + bump * 0.2;

  /* ---- Teks ----------------------------------------------------------- */
  const kickerIn = spr(4, 18, 110);
  const descIn = spr(26, 18, 100);
  const TITLE_WORDS = ["Menuju", "Transformasi", "AI", "Terintegrasi"];

  return (
    <VirtualCamera durationInFrames={180} zoomFrom={1.0} zoomTo={1.04}>
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
          <BackgroundGrid opacity={0.3} size={60} lineColor="rgba(34, 211, 238, 0.07)" />
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
          {/* Hujan biner: makin pekat seiring dunia berubah digital */}
          {Array.from({ length: RAIN_COLS }, (_, c) => (
            <div
              key={c}
              style={{
                position: "absolute",
                left: ((c + 0.5) * STAGE_W) / RAIN_COLS,
                top: (c * 137) % 260,
                transform: "translateX(-50%)",
                whiteSpace: "pre",
                textAlign: "center",
                fontFamily: MONO,
                fontSize: 16,
                lineHeight: 1.9,
                color: COLORS.cyan,
                opacity: (0.04 + random(`s4-rain-o-${c}`) * 0.07) * (0.2 + digitalAmt * 0.8),
                zIndex: 2,
              }}
            >
              {Array.from({ length: RAIN_ROWS }, (_, r) =>
                random(`s4-rain-${c}-${r}-${Math.floor(frame / 5)}`) > 0.5 ? "1" : "0"
              ).join("\n")}
            </div>
          ))}

          {/* Aura emas di inti AI */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: CORE_Y,
              transform: "translate(-50%, -50%)",
              width: 1000,
              height: 420,
              borderRadius: "50%",
              backgroundColor: COLORS.purple,
              filter: "blur(170px)",
              opacity: auraOpacity,
              pointerEvents: "none",
            }}
          />

          {/* Teks utama */}
          <div
            style={{
              position: "absolute",
              left: (STAGE_W - 1500) / 2,
              width: 1500,
              top: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              textAlign: "center",
              zIndex: 22,
              pointerEvents: "none",
            }}
          >
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
                  padding: "6px 22px",
                  borderRadius: 20,
                }}
              >
                AICC Sustainable AI Transformation
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 20,
                fontFamily: FONTS.heading,
                fontSize: 62,
                fontWeight: 900,
                color: COLORS.white,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                textShadow: `0 4px 30px rgba(0, 0, 0, 0.9), 0 0 ${20 + ignite * 30}px rgba(${AI_RGB}, ${0.05 + ignite * 0.3})`,
              }}
            >
              {TITLE_WORDS.map((w, i) => (
                <MaskWord key={w} text={w} progress={spr(8 + i * 4, 16, 130)} />
              ))}
            </div>

            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.textMuted,
                maxWidth: 1200,
                lineHeight: 1.45,
                opacity: descIn,
                transform: `translateY(${(1 - descIn) * 14}px)`,
              }}
            >
              Menyatukan pilar Production, Quality, dan IoT dalam satu ekosistem kecerdasan yang
              berkelanjutan.
            </div>
          </div>

          {/* Konduit: panel → inti AI, berubah emas setelah AI menyala */}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none" }}
          >
            {NODES.map((n, i) => {
              const g = GEO[i];
              const draw = interpolate(frame, [lineStart(i), lineEnd(i)], [0, 1], {
                ...clamp,
                easing: Easing.inOut(Easing.cubic),
              });
              const flow = interpolate(frame, [lineEnd(i), lineEnd(i) + 10], [0, 0.8], clamp);
              return (
                <g key={n.name}>
                  <path
                    d={g.d}
                    fill="none"
                    stroke={n.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - draw}
                    opacity={0.5 * (1 - ignite)}
                  />
                  <path
                    d={g.d}
                    fill="none"
                    stroke={COLORS.purple}
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.55 * ignite}
                    style={{ filter: `drop-shadow(0 0 8px ${COLORS.purple})` }}
                  />
                  <path
                    d={g.d}
                    fill="none"
                    stroke={ignite > 0.5 ? COLORS.purple : n.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray="2 14"
                    strokeDashoffset={-frame * 0.9}
                    opacity={flow}
                  />

                  {[0, 1].map((kk) => {
                    const tloc = frame - lineEnd(i) - kk * 0.5 * CYCLE;
                    if (tloc < 0) return null;
                    return <Packet key={`u${kk}`} g={g} t={(tloc % CYCLE) / CYCLE} dir={1} color={n.color} />;
                  })}

                  {(() => {
                    const l2 = frame - downDepart(i);
                    if (l2 < 0) return null;
                    const ct = (l2 % (CYCLE + 6)) / DOWN_DUR;
                    if (ct > 1) return null;
                    return <Packet g={g} t={1 - ct} dir={-1} color={COLORS.purple} />;
                  })()}
                </g>
              );
            })}
          </svg>

          {/* Tiga panel: analog → digital */}
          {NODES.map((n, i) => {
            const arr = downArrival(i);
            return (
              <PanelCard
                key={n.name}
                node={n}
                index={i}
                frame={frame}
                enter={spr(enterAt(i), 15, 120)}
                p={sweeps[i]}
                integ={interpolate(frame, [arr, arr + 10], [0, 1], clamp)}
                hit={interpolate(frame, [arr, arr + 4, arr + 20], [0, 1, 0], clamp)}
              />
            );
          })}

          {/* Cincin energi + riak di inti AI */}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, zIndex: 18, pointerEvents: "none" }}
          >
            {[
              { r: CORE_R + 22, dash: "2 12", dir: 1, speed: 0.4 },
              { r: CORE_R + 44, dash: "26 20", dir: -1, speed: 0.22 },
            ].map((ring, i) => (
              <circle
                key={i}
                cx={CX}
                cy={CORE_Y}
                r={ring.r}
                fill="none"
                stroke={COLORS.purple}
                strokeWidth={1.3}
                strokeDasharray={ring.dash}
                opacity={coreS * (0.18 + ignite * 0.4)}
                style={{
                  transformOrigin: `${CX}px ${CORE_Y}px`,
                  transform: `rotate(${frame * ring.speed * ring.dir}deg)`,
                }}
              />
            ))}
            {ripples.map((r, i) => (
              <circle
                key={i}
                cx={CX}
                cy={CORE_Y}
                r={CORE_R + 8 + r.age * 3}
                fill="none"
                stroke={r.color}
                strokeWidth={2}
                opacity={(1 - r.age / RIPPLE_LIFE) * 0.5}
              />
            ))}
          </svg>

          {/* Kilatan + gelombang kejut halus saat AI menyala */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: CORE_Y,
              width: 380,
              height: 380,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: COLORS.purple,
              filter: "blur(60px)",
              opacity: interpolate(frame, [IGNITE - 3, IGNITE + 2, IGNITE + 24], [0, 0.18, 0], clamp),
              pointerEvents: "none",
              zIndex: 17,
            }}
          />
          {[0, 7].map((delay, i) => {
            const start = IGNITE + delay;
            const size = interpolate(frame, [start, start + 40], [160, 480], {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            });
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: CX,
                  top: CORE_Y,
                  width: size,
                  height: size,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `${2.0 - i * 0.5}px solid ${COLORS.purple}`,
                  opacity: interpolate(frame, [start, start + 5, start + 40], [0, 0.28 - i * 0.1, 0], clamp),
                  pointerEvents: "none",
                  zIndex: 16,
                }}
              />
            );
          })}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, zIndex: 19, pointerEvents: "none" }}
          >
            {BURST.map((b, i) => {
              const bt = (frame - IGNITE) / 44;
              if (bt < 0 || bt > 1) return null;
              const travel = b.speed * Easing.out(Easing.cubic)(bt);
              const tail = b.speed * 0.14 * (1 - bt);
              const dx = Math.cos(b.angle);
              const dy = Math.sin(b.angle);
              return (
                <line
                  key={i}
                  x1={CX + dx * travel}
                  y1={CORE_Y + dy * travel}
                  x2={CX + dx * Math.max(0, travel - tail)}
                  y2={CORE_Y + dy * Math.max(0, travel - tail)}
                  stroke={COLORS.purple}
                  strokeWidth={b.width}
                  strokeLinecap="round"
                  opacity={(1 - bt) * 0.35}
                />
              );
            })}
          </svg>

          {/* Inti AI */}
          <div
            style={{
              position: "absolute",
              left: CX - CORE_R,
              top: CORE_Y - CORE_R,
              width: CORE_R * 2,
              height: CORE_R * 2,
              borderRadius: "50%",
              backgroundColor: "#0B1B3A",
              border: `2.5px solid ${COLORS.purple}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.purple,
              opacity: 0.55 + ignite * 0.45,
              transform: `scale(${coreS * (1 + bump * 0.1)})`,
              boxShadow: `0 0 ${18 + energy * 16 + ignite * 34 + bump * 50}px rgba(${AI_RGB}, ${0.3 + ignite * 0.3}), inset 0 0 22px rgba(${AI_RGB}, ${0.08 + ignite * 0.15})`,
              zIndex: 20,
            }}
          >
            <Brain size={52} />
          </div>
          <div
            style={{
              position: "absolute",
              left: CX - 200,
              width: 400,
              top: CORE_Y + CORE_R + 26,
              textAlign: "center",
              fontFamily: FONTS.heading,
              fontSize: 16,
              fontWeight: 800,
              color: COLORS.purple,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: coreS * (0.5 + ignite * 0.5),
              zIndex: 20,
            }}
          >
            Unified AI Platform
          </div>
        </div>
      </AbsoluteFill>
    </VirtualCamera>
  );
};