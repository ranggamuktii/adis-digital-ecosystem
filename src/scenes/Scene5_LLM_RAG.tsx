import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  ArrowUp,
  Brain,
  CheckCircle2,
  Copy,
  FileCheck,
  Mic,
  Plus,
  RefreshCw,
  Search,
  Square,
  ThumbsUp,
  User,
} from "lucide-react";
import { COLORS, FONTS } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { VirtualCamera } from "../components/VirtualCamera";

/* -------------------------------------------------------------------------- */
/*  KONSTANTA                                                                 */
/*  Stage 1920x1080, di-scale otomatis mengikuti resolusi komposisi.          */
/* -------------------------------------------------------------------------- */
const STAGE_W = 1920;
const STAGE_H = 1080;
const CX = STAGE_W / 2;

const CYAN_RGB = "34, 211, 238";
const EMERALD_RGB = "16, 185, 129";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
const easeOut = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

/* -------------------------------------------------------------------------- */
/*  TIMELINE (440 frame)                                                      */
/* -------------------------------------------------------------------------- */
const T = {
  typeStart: 25,
  typeEnd: 110,
  orbIn: 106,
  tokenStart: 118, // token pertama keluar dari orb
  tokenStep: 14,
  phaseAOutStart: 196,
  phaseAOutEnd: 218,
  morphStart: 198, // token terbang ke search bar
  morphEnd: 232,
  headerB: 215,
  barB: 218,
  beam1: 232,
  docIn: 244,
  scanStart: 245,
  scanEnd: 300,
  markEnd: 316,
  beam2: 304,
  answerIn: 308,
  streamStart: 324, // 308 → 324: AI "berpikir" (tiga titik), lalu mulai menulis
  streamEnd: 376,
  citeIn: 380,
  accStart: 382,
  accEnd: 402,
} as const;

/* -------------------------------------------------------------------------- */
/*  DATA                                                                      */
/* -------------------------------------------------------------------------- */
const FULL_PROMPT = "Bagaimana standar toleransi suhu tuang proses casting?";

// Potongan prompt; hl = indeks token semantik yang disorot pada bagian itu
const PROMPT_SEGMENTS: { text: string; hl?: number }[] = [
  { text: "Bagaimana " },
  { text: "standar", hl: 3 },
  { text: " " },
  { text: "toleransi", hl: 1 },
  { text: " " },
  { text: "suhu tuang", hl: 0 },
  { text: " " },
  { text: "proses casting", hl: 2 },
  { text: "?" },
];

const TOKENS = ["Suhu Tuang", "Toleransi", "Proses Casting", "Standar Kerja"];

const ORB = { x: CX, y: 560 };
const ORB_R = 46;
const CONSOLE = { top: 270, height: 150, width: 1240 };

const slotA = (i: number) => ({ x: CX + (i - 1.5) * 300, y: 770 });
const slotB = (i: number) => ({ x: CX + (i - 1.5) * 215, y: 196 });

const BOX = { left: 360, width: 1200 }; // lebar kolom konten fase RAG

// c = penanda sitasi [1] di dalam kalimat jawaban
const ANSWER_SEGMENTS: { t: string; b?: boolean; v?: boolean; c?: boolean }[] = [
  { t: "Berdasarkan dokumen internal " },
  { t: "SUK-QC-MOLDING", b: true },
  { t: ", suhu tuang optimal casting adalah " },
  { t: "1.380°C – 1.420°C", b: true, v: true },
  { t: " (toleransi deviasi ±5°C)." },
  { t: "1", c: true },
];

const ANSWER_WORDS = ANSWER_SEGMENTS.reduce(
  (words, seg) =>
    words.concat(
      (seg.t.match(/\s*\S+\s*/g) ?? []).map((w) => ({ w, b: seg.b, v: seg.v, c: seg.c }))
    ),
  [] as { w: string; b?: boolean; v?: boolean; c?: boolean }[]
);

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

const SUK_SANS = 'Arial, "Liberation Sans", Helvetica, sans-serif';
const SUK_SERIF = '"Times New Roman", Times, "Liberation Serif", serif';
const INK = "#111111";
const LINE = `1px solid ${INK}`;
const HEAD_BG = "#D4D4D8";
const BX: React.CSSProperties = { boxSizing: "border-box" };

// Lebar kolom tabel (ILUSTRASI mengisi sisa lebar)
const COL = { no: 28, work: 300, cycle: 46, point: 100, std: 150 } as const;

const QCDEM = [
  { l: "Q", s: "QUALITY", w: 48 },
  { l: "C", s: "COST", w: 48 },
  { l: "D", s: "DELIVERY", w: 48 },
  { l: "EHS", s: "ENVIRONMENT HEALTH & SAFETY", w: 48 },
  { l: "M", s: "MORALITY", w: 78 },
];

const SukCell: React.FC<{
  w?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ w, style, children }) => (
  <div
    style={{
      ...(w === undefined ? { flex: "1 1 0", minWidth: 0 } : { width: w, flexShrink: 0 }),
      ...BX,
      borderRight: LINE,
      padding: "3px 6px",
      fontFamily: SUK_SANS,
      fontSize: 10.5,
      lineHeight: 1.3,
      color: INK,
      ...style,
    }}
  >
    {children}
  </div>
);

const SukRow: React.FC<{
  h: number;
  no: string;
  work?: React.ReactNode;
  point?: React.ReactNode;
  std?: React.ReactNode;
  illus?: React.ReactNode;
  illusStyle?: React.CSSProperties;
}> = ({ h, no, work, point, std, illus, illusStyle }) => (
  <div style={{ display: "flex", height: h }}>
    <SukCell w={COL.no} style={{ textAlign: "center" }}>{no}</SukCell>
    <SukCell w={COL.work}>{work}</SukCell>
    <SukCell w={COL.cycle} />
    <SukCell w={COL.point}>{point}</SukCell>
    <SukCell w={COL.std}>{std}</SukCell>
    <SukCell style={illusStyle}>{illus}</SukCell>
  </div>
);

/* Ilustrasi 1: ladle + probe thermocouple, dengan penanda lingkaran merah */
const LadleThumb: React.FC = () => (
  <svg
    width={158}
    height={56}
    viewBox="0 0 158 56"
    style={{ display: "block", border: "1px solid #94A3B8", backgroundColor: "#F1F5F9" }}
  >
    <path d="M24 26 L84 26 L76 48 Q54 54 32 48 Z" fill="#6B7280" />
    <rect x="26" y="23" width="56" height="5" rx="2.5" fill="#F97316" />
    <line x1="84" y1="30" x2="132" y2="16" stroke="#374151" strokeWidth="4" strokeLinecap="round" />
    <line x1="52" y1="3" x2="52" y2="30" stroke="#0F172A" strokeWidth="2.2" />
    <circle cx="52" cy="30" r="9" fill="none" stroke="#DC2626" strokeWidth="1.5" />
    <text x="66" y="13" fontSize="9" fontWeight="700" fill="#DC2626" fontFamily={SUK_SANS}>
      2.a
    </text>
  </svg>
);

/* Ilustrasi 2: layar pembacaan thermocouple */
const ReadoutThumb: React.FC = () => (
  <svg
    width={158}
    height={56}
    viewBox="0 0 158 56"
    style={{ display: "block", border: "1px solid #94A3B8", backgroundColor: "#F1F5F9" }}
  >
    <rect x="14" y="6" width="116" height="44" rx="4" fill="#0F172A" />
    <text x="72" y="19" textAnchor="middle" fontSize="6.5" fill="#94A3B8" fontFamily={SUK_SANS}>
      THERMOCOUPLE
    </text>
    <text x="64" y="42" textAnchor="middle" fontSize="19" fontWeight="700" fill="#4ADE80" fontFamily='"Courier New", monospace'>
      1.398
    </text>
    <text x="106" y="42" fontSize="10" fontWeight="700" fill="#4ADE80" fontFamily='"Courier New", monospace'>
      °C
    </text>
    <ellipse cx="74" cy="35" rx="48" ry="13" fill="none" stroke="#DC2626" strokeWidth="1.5" />
    <text x="136" y="16" fontSize="9" fontWeight="700" fill="#DC2626" fontFamily={SUK_SANS}>
      2.b
    </text>
  </svg>
);

/* Baris yang dipindai AI (baris 2). mark = 0..1: kekuatan sorotan stabilo. */
const SukScanRow: React.FC<{ mark: number }> = ({ mark }) => {
  const hl: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    borderRadius: 2,
    backgroundColor: `rgba(250, 204, 21, ${mark * 0.6})`,
    boxShadow: `0 0 0 2px rgba(250, 204, 21, ${mark * 0.6})`,
  };
  return (
    <SukRow
      h={70}
      no="2"
      work="Ukur suhu cairan besi pada ladle dengan thermocouple celup, sebelum cairan dituang ke cetakan."
      point="Ukur di tengah cairan, jauh dari dinding ladle"
      std={
        <div style={{ lineHeight: 1.5 }}>
          Suhu tuang
          <br />
          <span style={hl}>1.380°C s/d 1.420°C</span>
          <br />
          Deviasi maks. <span style={hl}>±5°C</span>
        </div>
      }
      illusStyle={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "6px 8px",
      }}
      illus={
        <>
          <LadleThumb />
          <ReadoutThumb />
        </>
      }
    />
  );
};

const SukTableHead: React.FC = () => {
  const h: React.CSSProperties = {
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontWeight: 700,
    fontSize: 8.5,
    lineHeight: 1.05,
    backgroundColor: HEAD_BG,
  };
  return (
    <div style={{ display: "flex", height: 20, ...BX, borderBottom: LINE, backgroundColor: HEAD_BG }}>
      <SukCell w={COL.no} style={h}>NO.</SukCell>
      <SukCell w={COL.work} style={h}>URUTAN KERJA</SukCell>
      <SukCell w={COL.cycle} style={{ ...h, fontSize: 6.5 }}>CYCLE TIME</SukCell>
      <SukCell w={COL.point} style={h}>POIN PRIORITAS</SukCell>
      <SukCell w={COL.std} style={h}>STANDAR</SukCell>
      <SukCell style={h}>ILUSTRASI</SukCell>
    </div>
  );
};

/* Kepala formulir (baris Halaman / Form No. + blok judul, data dokumen, QCDEM) */
const SukHeader: React.FC = () => {
  const small: React.CSSProperties = {
    fontFamily: SUK_SANS,
    fontSize: 8.5,
    fontWeight: 700,
    color: INK,
  };
  const info: [string, string][] = [
    ["No. Dokumen", "042/QC/AICC"],
    ["No. Revisi", "4"],
    ["Tanggal Berlaku", "01 Januari 2026"],
    ["No. Mesin", "-"],
    ["Nama Produk", "-"],
    ["No. Produk", "-"],
    ["Nama Proses", "Pouring"],
    ["Lokasi", "Area Melting & Pouring"],
  ];

  return (
    <div>
      {/* Baris Halaman / Form No. */}
      <div style={{ display: "flex", height: 17, ...BX, borderBottom: LINE }}>
        <div
          style={{
            ...small,
            ...BX,
            width: 96,
            borderRight: LINE,
            padding: "0 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Halaman :</span>
          <span style={{ fontWeight: 600 }}>1/1</span>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            ...small,
            ...BX,
            width: 210,
            borderLeft: LINE,
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>Form No. :</span>
          <span style={{ fontWeight: 600 }}>FSY-05-01B</span>
        </div>
      </div>

      {/* Blok kepala */}
      <div style={{ display: "flex", height: 125, ...BX, borderBottom: LINE }}>
        {/* A: logo, DEPT, SEKSI */}
        <div style={{ ...BX, width: 130, flexShrink: 0, borderRight: LINE, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              ...BX,
              height: 82,
              borderBottom: LINE,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontFamily: SUK_SANS,
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                color: "#D92D3A",
              }}
            >
              AICC
            </div>
            <div style={{ fontFamily: SUK_SANS, fontSize: 5.5, fontWeight: 700, color: INK, marginTop: 3 }}>
              PT. ASIAN ISUZU CASTING CENTER
            </div>
          </div>
          <div style={{ ...small, ...BX, height: 21, borderBottom: LINE, padding: "0 6px", display: "flex", alignItems: "center" }}>
            DEPT : QC
          </div>
          <div style={{ ...small, ...BX, flex: 1, padding: "0 6px", display: "flex", alignItems: "center" }}>
            SEKSI : MOLDING
          </div>
        </div>

        {/* B: judul formulir */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              ...BX,
              height: 46,
              borderBottom: LINE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SUK_SERIF,
              fontSize: 21,
              fontWeight: 700,
              letterSpacing: "0.02em",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              color: INK,
            }}
          >
            STANDAR URUTAN KERJA
          </div>
          <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ ...small, position: "absolute", left: 8, top: 5, fontWeight: 600 }}>JUDUL :</span>
            <span style={{ fontFamily: SUK_SANS, fontSize: 14, fontWeight: 700, color: INK, marginTop: 8 }}>
              PENGENDALIAN SUHU TUANG PROSES CASTING
            </span>
          </div>
        </div>

        {/* C: data dokumen */}
        <div style={{ ...BX, width: 258, flexShrink: 0, borderLeft: LINE, display: "flex", flexDirection: "column" }}>
          {info.map(([k, v], i) => (
            <div
              key={k}
              style={{
                ...BX,
                flex: 1,
                display: "flex",
                alignItems: "center",
                borderBottom: i < info.length - 1 ? LINE : undefined,
                ...small,
                fontWeight: 600,
              }}
            >
              <span style={{ ...BX, width: 86, flexShrink: 0, borderRight: LINE, padding: "0 6px", height: "100%", display: "flex", alignItems: "center" }}>
                {k}
              </span>
              <span style={{ flex: 1, textAlign: "center", fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* D: prioritas QCDEM + proses sebelum/setelah */}
        <div style={{ ...BX, width: 292, flexShrink: 0, borderLeft: LINE, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", height: 70, ...BX, borderBottom: LINE }}>
            <div
              style={{
                ...BX,
                width: 22,
                flexShrink: 0,
                borderRight: LINE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontFamily: SUK_SANS,
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: INK,
                }}
              >
                PRIORITAS
              </span>
            </div>
            {QCDEM.map((q, i) => (
              <div
                key={q.l}
                style={{
                  ...BX,
                  width: q.w,
                  flexShrink: 0,
                  borderRight: i < QCDEM.length - 1 ? LINE : undefined,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: SUK_SERIF,
                    fontSize: q.l === "EHS" ? 20 : 34,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: INK,
                  }}
                >
                  {q.l}
                </div>
                <div
                  style={{
                    fontFamily: SUK_SANS,
                    fontSize: 5,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    textAlign: "center",
                    marginTop: 2,
                    padding: "0 3px",
                    color: INK,
                  }}
                >
                  {q.s}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flex: 1 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {[
                ["PROSES SEBELUM", "-"],
                ["PROSES SETELAH", "-"],
              ].map(([k, v], i) => (
                <div
                  key={k}
                  style={{
                    ...small,
                    ...BX,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    borderBottom: i === 0 ? LINE : undefined,
                  }}
                >
                  <span style={{ width: 120, paddingLeft: 6 }}>{k}</span>
                  <span style={{ flex: 1, textAlign: "center", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ ...small, ...BX, width: 78, flexShrink: 0, borderLeft: LINE, padding: "3px 5px", fontSize: 7 }}>
              PROCESS NO.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Tanda tangan tulisan tangan (tinta biru) */
const Scribble: React.FC<{ variant?: 1 | 2 }> = ({ variant = 1 }) => (
  <svg width={52} height={50} viewBox="0 0 52 50">
    {variant === 1 ? (
      <>
        <path d="M5 34 C12 6, 19 6, 21 28 S30 44, 34 20 S43 6, 48 28" fill="none" stroke="#1E3A8A" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4 41 L50 35" fill="none" stroke="#1E3A8A" strokeWidth="1.2" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M8 10 C20 2, 30 14, 18 26 S10 44, 30 40 S46 30, 40 18" fill="none" stroke="#1E3A8A" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 46 L46 44" fill="none" stroke="#1E3A8A" strokeWidth="1.2" strokeLinecap="round" />
      </>
    )}
  </svg>
);

/* Kolom tanda tangan di kanan tabel: Dislapkan / Diperiksa / Disetujui */
const SukSignCol: React.FC = () => {
  const label: React.CSSProperties = {
    ...BX,
    height: 20,
    backgroundColor: HEAD_BG,
    borderBottom: LINE,
    fontFamily: SUK_SANS,
    fontSize: 8.5,
    fontWeight: 700,
    color: INK,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const meta = (k: string, v: string) => (
    <div
      key={k}
      style={{
        ...BX,
        height: 14,
        borderTop: LINE,
        padding: "0 4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: SUK_SANS,
        fontSize: 7.5,
        color: INK,
      }}
    >
      <span>{k}</span>
      <span style={{ fontFamily: '"Segoe Print", "Comic Sans MS", cursive', color: "#1E3A8A", fontSize: 8 }}>{v}</span>
    </div>
  );
  const sign = (variant: 1 | 2) => (
    <div style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Scribble variant={variant} />
    </div>
  );
  return (
    <div style={{ width: 58, flexShrink: 0 }}>
      <div style={label}>Dislapkan</div>
      {sign(1)}
      {meta("Nama", "AFP")}
      {meta("Tanggal", "29-12-25")}
      <div style={{ ...label, height: 18, borderTop: LINE }}>Diperiksa</div>
      {sign(2)}
      {meta("Nama", "")}
      {meta("Tanggal", "")}
    </div>
  );
};

/** Garis vertikal bergaya aliran data: tergambar lalu dilewati paket cahaya. */
const Beam: React.FC<{
  x: number;
  y1: number;
  y2: number;
  draw: number;
  frame: number;
  color: string;
  packetsFrom: number;
  packetsTo: number;
}> = ({ x, y1, y2, draw, frame, color, packetsFrom, packetsTo }) => {
  const active = frame >= packetsFrom && frame <= packetsTo;
  const t = ((frame - packetsFrom) % 18) / 18;
  return (
    <g>
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={lerp(y1, y2, draw)}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.55}
      />
      {draw >= 1 && (
        <line
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="2 12"
          strokeDashoffset={-frame * 0.9}
          opacity={0.8}
        />
      )}
      {active && (
        <circle
          cx={x}
          cy={lerp(y1, y2, t)}
          r={6}
          fill={COLORS.white}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      )}
    </g>
  );
};

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
/* -------------------------------------------------------------------------- */
export const Scene5_LLM_RAG: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = Math.min(width / STAGE_W, height / STAGE_H);

  const spr = (delay: number, damping = 16, stiffness = 120) =>
    spring({ frame: Math.max(0, frame - delay), fps, config: { damping, stiffness } });

  /* ---- Fase A ---------------------------------------------------------- */
  const typedLength = Math.floor(
    interpolate(frame, [T.typeStart, T.typeEnd], [0, FULL_PROMPT.length], clamp)
  );

  const phaseAOpacity = interpolate(
    frame,
    [0, 16, T.phaseAOutStart, T.phaseAOutEnd],
    [0, 1, 1, 0],
    clamp
  );
  const phaseAShift = interpolate(frame, [T.phaseAOutStart, T.phaseAOutEnd], [0, -24], clamp);

  const kickerIn = spr(4, 18, 110);
  const consoleIn = spr(16, 17, 110);
  const orbS = spr(T.orbIn, 13, 130);
  const orbPulse = interpolate(frame, [T.tokenStart - 4, T.tokenStart + 4, T.tokenStart + 30], [0, 1, 0], clamp);

  // Tombol kirim: aktif saat ada teks, "ditekan" di akhir ketikan
  const sent = frame >= T.typeEnd + 2;
  const sendPress = interpolate(frame, [T.typeEnd + 1, T.typeEnd + 5, T.typeEnd + 13], [1, 0.84, 1], clamp);
  const sendRipple = easeOut(frame, T.typeEnd + 2, T.typeEnd + 24);

  const morph = ease(frame, T.morphStart, T.morphEnd);

  /* ---- Fase B ---------------------------------------------------------- */
  const headerS = spr(T.headerB, 17, 120);
  const barS = spr(T.barB, 17, 120);
  const barSweep = interpolate(frame, [T.morphEnd - 4, T.morphEnd + 18], [0, 1], clamp);
  const btnPress = interpolate(frame, [T.morphEnd - 8, T.morphEnd - 4, T.morphEnd + 2], [1, 0.9, 1], clamp);
  const resultIn = easeOut(frame, T.beam1 + 2, T.beam1 + 16);
  const beam1 = easeOut(frame, T.beam1, T.beam1 + 18);
  const docS = spr(T.docIn, 17, 120);
  const scan = interpolate(frame, [T.scanStart, T.scanEnd], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const mark = easeOut(frame, T.scanEnd, T.markEnd);
  const beam2 = easeOut(frame, T.beam2, T.beam2 + 8);
  const answerS = spr(T.answerIn, 17, 120);

  const wordCount = ANSWER_WORDS.length;
  const streaming = frame >= T.streamStart && frame < T.streamEnd + 6;
  const citeS = spr(T.citeIn, 17, 120);
  const accS = spr(T.citeIn + 6, 17, 120);
  const accuracy = 99.4 * easeOut(frame, T.accStart, T.accEnd);
  const verifiedGlow = interpolate(frame, [T.citeIn, T.citeIn + 8, T.citeIn + 30], [0, 1, 0], clamp);

  // Cahaya ambient: violet (LLM) → cyan (RAG)
  const glowPurple = (1 - ease(frame, 190, 235)) * 0.6;
  const glowCyan = ease(frame, 200, 245) * 0.6;

  return (
    <VirtualCamera durationInFrames={440} zoomFrom={1.0} zoomTo={1.04}>
      <AbsoluteFill style={{ backgroundColor: COLORS.base, overflow: "hidden" }}>
        {/* Grid dengan parallax lambat */}
        <div
          style={{
            position: "absolute",
            inset: -60,
            transform: `translate(${-frame * 0.12}px, ${-frame * 0.07}px)`,
          }}
        >
          <BackgroundGrid opacity={0.35} size={65} lineColor="rgba(99, 102, 241, 0.08)" />
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
          {/* Cahaya ambient dua warna */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: 540,
              width: 1000,
              height: 800,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              backgroundColor: COLORS.surface,
              filter: "blur(200px)",
              opacity: 0.7,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: CX,
              top: 520,
              width: 900,
              height: 600,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              backgroundColor: COLORS.purple,
              filter: "blur(190px)",
              opacity: glowPurple * 0.5,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: CX,
              top: 520,
              width: 1100,
              height: 700,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              backgroundColor: COLORS.cyan,
              filter: "blur(200px)",
              opacity: glowCyan * 0.35,
              pointerEvents: "none",
            }}
          />

          {/* =============================================================== */}
          {/*  FASE A: LLM memahami bahasa manusia                            */}
          {/* =============================================================== */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: phaseAOpacity,
              transform: `translateY(${phaseAShift}px)`,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {/* Kicker + judul */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 96,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
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
                    backgroundColor: `rgba(${CYAN_RGB}, 0.12)`,
                    border: `1px solid rgba(${CYAN_RGB}, 0.3)`,
                    padding: "6px 22px",
                    borderRadius: 20,
                  }}
                >
                  Large Language Model (LLM)
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 20,
                  fontFamily: FONTS.heading,
                  fontSize: 60,
                  fontWeight: 900,
                  color: COLORS.white,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                {["Memahami", "Bahasa", "Manusia"].map((w, i) => (
                  <MaskWord key={w} text={w} progress={spr(8 + i * 5, 16, 130)} />
                ))}
              </div>
            </div>

            {/* Kolom chat: operator mengetik pertanyaan ke AI */}
            <div
              style={{
                position: "absolute",
                left: CX - CONSOLE.width / 2,
                top: CONSOLE.top,
                width: CONSOLE.width,
                height: CONSOLE.height,
                opacity: consoleIn,
                transform: `translateY(${(1 - consoleIn) * 30}px)`,
              }}
            >
              {/* Identitas pengirim */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, height: 34, paddingLeft: 20 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: `rgba(${CYAN_RGB}, 0.16)`,
                    border: `1.5px solid ${COLORS.cyan}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: COLORS.cyan,
                  }}
                >
                  <User size={17} />
                </div>
                <span style={{ fontFamily: FONTS.heading, fontSize: 19, fontWeight: 800, color: COLORS.white }}>
                  Operator
                </span>
                <span style={{ fontFamily: FONTS.body, fontSize: 17, fontWeight: 500, color: COLORS.textMuted }}>
                  bertanya dengan bahasa sehari-hari
                </span>
              </div>

              {/* Kotak input */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 48,
                  height: 96,
                  boxSizing: "border-box",
                  borderRadius: 34,
                  backgroundColor: "#0B1B3A",
                  border: `1.5px solid rgba(${CYAN_RGB}, ${sent ? 0.4 : 0.85})`,
                  boxShadow: `0 0 ${30 + orbPulse * 24}px rgba(${CYAN_RGB}, ${0.14 + orbPulse * 0.1})`,
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "0 22px",
                }}
              >
                {/* Lampirkan */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "1.5px solid rgba(255, 255, 255, 0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: COLORS.textMuted,
                  }}
                >
                  <Plus size={24} />
                </div>

                {/* Teks yang diketik */}
                <div
                  style={{
                    flex: 1,
                    fontFamily: FONTS.heading,
                    fontSize: 33,
                    fontWeight: 600,
                    color: COLORS.white,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                  }}
                >
                  {(() => {
                    let offset = 0;
                    return PROMPT_SEGMENTS.map((seg, si) => {
                      const shown = seg.text.slice(0, Math.max(0, typedLength - offset));
                      offset += seg.text.length;
                      if (seg.hl === undefined) return <span key={si}>{shown}</span>;
                      const p = easeOut(
                        frame,
                        T.tokenStart - 6 + seg.hl * T.tokenStep,
                        T.tokenStart + 8 + seg.hl * T.tokenStep
                      );
                      return (
                        <span
                          key={si}
                          style={{
                            color: p > 0.4 ? COLORS.cyan : COLORS.white,
                            borderBottom: p > 0.05 ? `3px solid ${COLORS.cyan}` : "none",
                            paddingBottom: 2,
                            textShadow: p > 0.4 ? `0 0 18px rgba(${CYAN_RGB}, 0.5)` : undefined,
                          }}
                        >
                          {shown}
                        </span>
                      );
                    });
                  })()}
                  {!sent && frame % 16 < 9 && (
                    <span style={{ color: COLORS.cyan, fontWeight: 300 }}>|</span>
                  )}
                  {typedLength === 0 && (
                    <span style={{ color: COLORS.textMuted, fontWeight: 500, marginLeft: 6 }}>
                      Tanyakan sesuatu tentang standar produksi…
                    </span>
                  )}
                </div>

                <Mic size={26} color={COLORS.textMuted} style={{ flexShrink: 0 }} />

                {/* Tombol kirim → berubah jadi tombol berhenti saat AI memproses */}
                <div style={{ position: "relative", flexShrink: 0, width: 58, height: 58 }}>
                  {sendRipple > 0 && sendRipple < 1 && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        border: `2px solid ${COLORS.cyan}`,
                        opacity: (1 - sendRipple) * 0.7,
                        transform: `scale(${1 + sendRipple * 0.9})`,
                      }}
                    />
                  )}
                  {sent && (
                    <div
                      style={{
                        position: "absolute",
                        inset: -7,
                        borderRadius: "50%",
                        borderStyle: "solid",
                        borderWidth: 2.5,
                        borderColor: `${COLORS.cyan} rgba(${CYAN_RGB}, 0.22) rgba(${CYAN_RGB}, 0.22) rgba(${CYAN_RGB}, 0.22)`,
                        transform: `rotate(${frame * 9}deg)`,
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      backgroundColor: typedLength > 0 ? COLORS.cyan : `rgba(${CYAN_RGB}, 0.22)`,
                      color: typedLength > 0 ? "#031018" : COLORS.textMuted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `scale(${sendPress})`,
                      boxShadow: typedLength > 0 ? `0 0 20px rgba(${CYAN_RGB}, 0.45)` : "none",
                    }}
                  >
                    {sent ? <Square size={20} fill="currentColor" /> : <ArrowUp size={28} strokeWidth={2.75} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Jalur konsol → orb dan orb → token */}
            <svg
              width={STAGE_W}
              height={STAGE_H}
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              <Beam
                x={CX}
                y1={CONSOLE.top + CONSOLE.height}
                y2={ORB.y - ORB_R - 6}
                draw={easeOut(frame, T.typeEnd - 12, T.typeEnd + 6)}
                frame={frame}
                color={COLORS.cyan}
                packetsFrom={T.typeEnd + 4}
                packetsTo={T.tokenStart + 20}
              />

              {TOKENS.map((_, i) => {
                const s = slotA(i);
                const startY = ORB.y + ORB_R + 6;
                const endY = s.y - 34;
                const midY = (startY + endY) / 2;
                const t0 = T.tokenStart + i * T.tokenStep;
                const draw = easeOut(frame, t0 - 4, t0 + 16);
                const d = `M ${ORB.x} ${startY} C ${ORB.x} ${midY}, ${s.x} ${midY}, ${s.x} ${endY}`;
                return (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={COLORS.cyan}
                    strokeWidth={2}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - draw}
                    opacity={0.55}
                  />
                );
              })}
            </svg>

            {/* Orb LLM */}
            <div
              style={{
                position: "absolute",
                left: ORB.x - ORB_R,
                top: ORB.y - ORB_R,
                width: ORB_R * 2,
                height: ORB_R * 2,
                borderRadius: "50%",
                backgroundColor: "#0B1B3A",
                border: `2.5px solid ${COLORS.cyan}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.cyan,
                transform: `scale(${orbS * (1 + orbPulse * 0.12)})`,
                boxShadow: `0 0 ${26 + orbPulse * 40}px rgba(${CYAN_RGB}, ${0.4 + orbPulse * 0.3})`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -14,
                  borderRadius: "50%",
                  border: `1.5px dashed ${COLORS.cyan}`,
                  opacity: 0.4,
                  transform: `rotate(${frame * 0.8}deg)`,
                }}
              />
              <Brain size={46} />
            </div>

            {/* Keterangan baris token */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 836,
                textAlign: "center",
                fontFamily: FONTS.heading,
                fontSize: 18,
                fontWeight: 800,
                color: COLORS.textMuted,
                letterSpacing: 4,
                opacity: interpolate(frame, [T.tokenStart + 3 * T.tokenStep, T.tokenStart + 3 * T.tokenStep + 18], [0, 1], clamp),
              }}
            >
              SEMANTIC TOKENS
            </div>
          </div>

          {/* =============================================================== */}
          {/*  FASE B: RAG, query → dokumen → jawaban bersitasi               */}
          {/* =============================================================== */}
          {/* Header */}
          <div
            style={{
              position: "absolute",
              left: BOX.left,
              width: BOX.width,
              top: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "2px solid rgba(255, 255, 255, 0.15)",
              paddingBottom: 14,
              opacity: headerS,
              transform: `translateY(${(1 - headerS) * -20}px)`,
              zIndex: 12,
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Search size={30} color={COLORS.cyan} />
              <span
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 30,
                  fontWeight: 900,
                  color: COLORS.white,
                  letterSpacing: "-0.02em",
                }}
              >
                RAG: Pencarian Dokumen & Referensi Sumber
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: `rgba(${CYAN_RGB}, 0.15)`,
                border: `1px solid ${COLORS.cyan}`,
                borderRadius: 20,
                padding: "8px 18px",
                fontFamily: FONTS.heading,
                fontSize: 14,
                fontWeight: 800,
                color: COLORS.cyan,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: COLORS.cyan,
                  boxShadow: `0 0 ${8 + Math.sin(frame / 8) * 4}px ${COLORS.cyan}`,
                }}
              />
              Internal Source Grounded
            </div>
          </div>

          {/* Kolom pencarian: token LLM mendarat sebagai kueri, lalu tombol Cari ditekan */}
          <div
            style={{
              position: "absolute",
              left: BOX.left,
              width: BOX.width,
              top: 160,
              height: 72,
              boxSizing: "border-box",
              borderRadius: 36,
              border: `1.5px solid ${COLORS.cyan}`,
              backgroundColor: `rgba(${CYAN_RGB}, 0.06)`,
              boxShadow: `0 0 ${Math.sin(Math.PI * barSweep) * 30}px rgba(${CYAN_RGB}, 0.3)`,
              overflow: "hidden",
              opacity: barS,
              transform: `scaleX(${lerp(0.92, 1, barS)})`,
              zIndex: 11,
              pointerEvents: "none",
            }}
          >
            <div style={{ position: "absolute", left: 28, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
              <Search size={28} color={COLORS.cyan} />
            </div>

            {/* Tombol Cari → berganti jadi jumlah dokumen yang cocok */}
            <div
              style={{
                position: "absolute",
                right: 12,
                top: 12,
                bottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                width: 150,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  height: 48,
                  padding: "0 28px",
                  borderRadius: 24,
                  backgroundColor: COLORS.cyan,
                  color: "#031018",
                  display: "flex",
                  alignItems: "center",
                  fontFamily: FONTS.heading,
                  fontSize: 20,
                  fontWeight: 800,
                  opacity: 1 - resultIn,
                  transform: `scale(${btnPress})`,
                }}
              >
                Cari
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  height: 48,
                  padding: "0 18px",
                  borderRadius: 24,
                  backgroundColor: `rgba(${CYAN_RGB}, 0.16)`,
                  border: `1px solid ${COLORS.cyan}`,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: COLORS.cyan,
                  fontFamily: FONTS.heading,
                  fontSize: 18,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  opacity: resultIn,
                  transform: `translateX(${(1 - resultIn) * 16}px)`,
                }}
              >
                <CheckCircle2 size={20} />3 dokumen
              </div>
            </div>

            {/* Progres pencarian */}
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                height: 3,
                width: `${barSweep * 100}%`,
                backgroundColor: COLORS.cyan,
                boxShadow: `0 0 14px ${COLORS.cyan}`,
                opacity: barSweep > 0 && barSweep < 1 ? 0.95 : 0,
              }}
            />
          </div>

          {/* Jalur & paket */}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none" }}
          >
            <Beam
              x={CX}
              y1={232}
              y2={270}
              draw={beam1}
              frame={frame}
              color={COLORS.cyan}
              packetsFrom={T.beam1 + 18}
              packetsTo={T.scanEnd}
            />
            <Beam
              x={CX}
              y1={630}
              y2={652}
              draw={beam2}
              frame={frame}
              color={COLORS.emerald}
              packetsFrom={T.beam2 + 8}
              packetsTo={T.streamStart + 24}
            />
          </svg>

          {/* Dokumen sumber: Lembar Standar Urutan Kerja (SUK) Otentik AICC */}
          <div
            style={{
              position: "absolute",
              left: BOX.left,
              width: BOX.width,
              top: 270,
              height: 360,
              boxSizing: "border-box",
              borderRadius: 8,
              backgroundColor: "#475569",
              border: "1.5px solid #64748B",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45), 0 2px 10px rgba(0, 0, 0, 0.25)",
              opacity: docS,
              transform: `translateY(${(1 - docS) * 30}px)`,
              zIndex: 10,
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Toolbar PDF viewer */}
            <div
              style={{
                height: 42,
                flexShrink: 0,
                backgroundColor: "#0F172A",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: 12,
                borderBottom: "1px solid #334155",
              }}
            >
              <div
                style={{
                  backgroundColor: "#EF4444",
                  color: "#FFFFFF",
                  fontFamily: FONTS.heading,
                  fontSize: 11,
                  fontWeight: 900,
                  padding: "2px 7px",
                  borderRadius: 3,
                  letterSpacing: "0.08em",
                }}
              >
                PDF
              </div>
              <span style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                SUK-QC-MOLDING-REV4.pdf
              </span>
              {/* <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
                Standar Urutan Kerja • PT Asian Isuzu Casting Center
              </span> */}

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, color: "#CBD5E1" }}>
                  Halaman 1 / 1
                </span>
                {/* <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 12px",
                    borderRadius: 12,
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid #10B981",
                    color: "#10B981",
                    fontFamily: FONTS.heading,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <CheckCircle2 size={13} />
                  Match: 98.4%
                </div> */}
              </div>
            </div>

            {/* Kanvas viewer: halaman formulir di atas latar abu-abu, terpotong di bawah */}
            <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", backgroundColor: "#475569" }}>
              {/* Scrollbar */}
              <div
                style={{
                  position: "absolute",
                  right: 5,
                  top: 8,
                  bottom: 8,
                  width: 8,
                  borderRadius: 4,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    height: "40%",
                    borderRadius: 4,
                    backgroundColor: "rgba(255, 255, 255, 0.35)",
                  }}
                />
              </div>

              {/* Halaman */}
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  top: 6,
                  width: 1160,
                  boxSizing: "border-box",
                  padding: 8,
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div style={{ border: `1.5px solid ${INK}` }}>
                  <SukHeader />

                  <div style={{ display: "flex" }}>
                    {/* Tabel urutan kerja */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SukTableHead />

                      <SukRow h={20} no="0" work="Mulai" />

                      <SukRow
                        h={36}
                        no="1"
                        work="Pastikan thermocouple celup sudah terkalibrasi dan bagian ladle dalam kondisi kering."
                        point="Cek tag kalibrasi"
                        std="Kalibrasi masih berlaku"
                      />

                      {/* Baris yang dipindai AI: lapisan dasar, lapisan hasil pindai, laser */}
                      <div style={{ position: "relative", overflow: "hidden" }}>
                        <div style={{ opacity: 0.85 }}>
                          <SukScanRow mark={0} />
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor: "rgba(224, 242, 254, 0.92)",
                            clipPath: `inset(0 ${(1 - scan) * 100}% 0 0)`,
                          }}
                        >
                          <SukScanRow mark={mark} />
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: `${scan * 100}%`,
                            width: 4,
                            backgroundColor: "#0284C7",
                            boxShadow: "0 0 16px #0284C7",
                            opacity: scan > 0 && scan < 1 ? 0.95 : 0,
                          }}
                        />
                      </div>

                      {/* Baris berikutnya: terpotong tepi viewer */}
                      <SukRow
                        h={150}
                        no="3"
                        work={
                          <>
                            <div>Langkah-langkah penuangan :</div>
                            <div style={{ marginTop: 6 }}>a. Verifikasi suhu pada display thermocouple</div>
                            <div style={{ marginTop: 6 }}>b. Jika sesuai standar, tuang ke cetakan</div>
                            <div style={{ marginTop: 6 }}>c. Catat hasil pada Lembar Kendali Mutu Harian</div>
                          </>
                        }
                      />
                    </div>

                    <SukSignCol />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Jawaban AI: pesan chat dengan avatar, titik "berpikir", teks mengalir, sitasi */}
          <div
            style={{
              position: "absolute",
              left: BOX.left,
              width: BOX.width,
              top: 652,
              display: "flex",
              gap: 20,
              opacity: answerS,
              transform: `translateY(${(1 - answerS) * 30}px)`,
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            {/* Avatar asisten (Solid emerald, no gradient) */}
            <div
              style={{
                flexShrink: 0,
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: COLORS.emerald,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                boxShadow: `0 0 ${12 + verifiedGlow * 30}px rgba(${EMERALD_RGB}, ${0.35 + verifiedGlow * 0.4})`,
              }}
            >
              <Brain size={28} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Nama asisten + status sitasi */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, height: 30, marginBottom: 10 }}>
                <span style={{ fontFamily: FONTS.heading, fontSize: 21, fontWeight: 800, color: COLORS.white }}>
                  AICC Assistant
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    borderRadius: 14,
                    backgroundColor: `rgba(${EMERALD_RGB}, 0.14)`,
                    color: COLORS.emerald,
                    fontFamily: FONTS.heading,
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={16} />
                  Sitasi terverifikasi
                </div>
              </div>

              {/* Gelembung pesan */}
              <div
                style={{
                  position: "relative",
                  boxSizing: "border-box",
                  backgroundColor: `rgba(${EMERALD_RGB}, 0.1)`,
                  border: `1.5px solid rgba(${EMERALD_RGB}, 0.6)`,
                  borderRadius: "6px 24px 24px 24px",
                  boxShadow: `0 0 ${verifiedGlow * 50}px rgba(${EMERALD_RGB}, ${verifiedGlow * 0.5})`,
                  padding: "24px 30px",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    fontFamily: FONTS.heading,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.white,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.5,
                    minHeight: 84,
                  }}
                >
                  {/* Titik "sedang mengetik" sebelum teks mengalir */}
                  {frame < T.streamStart + 4 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: 42,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        opacity: interpolate(frame, [T.streamStart - 2, T.streamStart + 3], [1, 0], clamp),
                      }}
                    >
                      {[0, 1, 2].map((d) => {
                        const wave = Math.sin(frame / 3 - d * 0.9);
                        return (
                          <span
                            key={d}
                            style={{
                              width: 11,
                              height: 11,
                              borderRadius: "50%",
                              backgroundColor: COLORS.emerald,
                              opacity: 0.45 + 0.55 * Math.max(0, wave),
                              transform: `translateY(${wave * -4}px)`,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Teks mengalir kata demi kata, seperti LLM menulis */}
                  {ANSWER_WORDS.map(
                    (aw: { w: string; b?: boolean; v?: boolean; c?: boolean }, i: number) => {
                      const start = T.streamStart + (i / wordCount) * (T.streamEnd - T.streamStart);
                      const o = interpolate(frame, [start, start + 5], [0, 1], clamp);
                      if (aw.c) {
                        return (
                          <span
                            key={i}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 26,
                              height: 26,
                              marginLeft: 8,
                              borderRadius: "50%",
                              backgroundColor: COLORS.cyan,
                              color: "#031018",
                              fontFamily: FONTS.heading,
                              fontSize: 15,
                              fontWeight: 900,
                              position: "relative",
                              top: -3,
                              opacity: o,
                            }}
                          >
                            {aw.w}
                          </span>
                        );
                      }
                      return (
                        <span
                          key={i}
                          style={{
                            whiteSpace: "pre-wrap",
                            opacity: o,
                            fontWeight: aw.b ? 900 : 700,
                            color: aw.v ? COLORS.emerald : COLORS.white,
                          }}
                        >
                          {aw.w}
                        </span>
                      );
                    }
                  )}
                  {streaming && frame % 14 < 8 && <span style={{ color: COLORS.emerald }}>|</span>}
                </div>
              </div>

              {/* Sumber, akurasi, dan aksi pesan */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: 16,
                    padding: "8px 18px 8px 8px",
                    fontFamily: FONTS.body,
                    fontSize: 20,
                    fontWeight: 700,
                    color: COLORS.white,
                    opacity: citeS,
                    transform: `translateX(${(1 - citeS) * -20}px)`,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: COLORS.cyan,
                      color: "#031018",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONTS.heading,
                      fontSize: 15,
                      fontWeight: 900,
                    }}
                  >
                    1
                  </span>
                  <FileCheck size={22} color={COLORS.emerald} />
                  Ref: Dokumen SUK No. 042/QC/AICC
                </div>
                <div
                  style={{
                    backgroundColor: COLORS.emerald,
                    color: "#000000",
                    borderRadius: 16,
                    padding: "10px 18px",
                    fontFamily: FONTS.heading,
                    fontSize: 20,
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                    opacity: accS,
                    transform: `translateX(${(1 - accS) * -20}px)`,
                  }}
                >
                  Akurasi: {(accuracy.toFixed(1).length < 4 ? "0" : "") + accuracy.toFixed(1)}%
                </div>

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20, opacity: accS }}>
                  <Copy size={22} color={COLORS.textMuted} />
                  <ThumbsUp size={22} color={frame > T.accEnd ? COLORS.emerald : COLORS.textMuted} />
                  <RefreshCw size={22} color={COLORS.textMuted} />
                </div>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/*  CHIP TOKEN: lahir dari orb LLM, lalu terbang jadi query RAG    */}
          {/* =============================================================== */}
          {TOKENS.map((tk, i) => {
            const t0 = T.tokenStart + i * T.tokenStep;
            const sp = spr(t0, 15, 130);
            const a = slotA(i);
            const b = slotB(i);

            const ax = lerp(ORB.x, a.x, sp);
            const ay = lerp(ORB.y, a.y, sp);

            const x = lerp(ax, b.x, morph);
            const y = lerp(ay, b.y, morph) - Math.sin(Math.PI * morph) * 60;
            const scale = lerp(1, 0.72, morph) * lerp(0.4, 1, Math.min(sp, 1));

            return (
              <div
                key={tk}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity: Math.min(1, sp * 2),
                  backgroundColor: `rgba(${CYAN_RGB}, 0.16)`,
                  border: `1.5px solid ${COLORS.cyan}`,
                  borderRadius: 40,
                  boxShadow: `0 0 ${14 + Math.sin(Math.PI * morph) * 24}px rgba(${CYAN_RGB}, 0.35)`,
                  padding: "12px 26px",
                  fontFamily: FONTS.heading,
                  fontSize: 26,
                  fontWeight: 800,
                  color: COLORS.cyan,
                  whiteSpace: "nowrap",
                  zIndex: 30,
                  pointerEvents: "none",
                }}
              >
                #{tk}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </VirtualCamera>
  );
};