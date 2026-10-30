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
import { BookOpen, FileText, Search } from "lucide-react";
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

const BOX = { left: 360, width: 1200 };
const CYAN_RGB = "34, 211, 238";
const EMERALD_RGB = "16, 185, 129";

const SEARCH_QUERY = "Standar Urutan Kerja (SUK) - Casting & Finishing";
const INDEXED_DOCS = 1420;

// Kartu file hasil pencarian
const CARD_GAP = 28;
const CARD_W = (BOX.width - CARD_GAP * 2) / 3;
const THUMB_H = 266;
const CARD_H = 442;
const CARDS_TOP = 530;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const easeOut = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

const formatThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/* -------------------------------------------------------------------------- */
/*  TIMELINE (200 frame)                                                      */
/* -------------------------------------------------------------------------- */
const T = {
  typeStart: 15,
  typeEnd: 65,
  scanStart: 68, // gelombang pindai melintasi indeks
  scanEnd: 94,
  focusStart: 108, // hasil teratas disorot, sisanya meredup
  focusEnd: 124,
} as const;

/* -------------------------------------------------------------------------- */
/*  DATA                                                                      */
/* -------------------------------------------------------------------------- */
const FILE_TYPE_COLOR = { pdf: "#EF4444", docx: "#3B82F6" } as const;

const SUK_ENTRIES = [
  {
    file: "SUK-042-CST_Rev4.pdf",
    type: "pdf",
    title: "Standar Operasional Penuangan Logam & Suhu Casting",
    dept: "PRODUKSI COR",
    pages: 24,
    size: "2,4 MB",
    score: 99.8,
    delay: 76,
    highlight: true,
  },
  {
    file: "SUK-019-QC_Rev2.pdf",
    type: "pdf",
    title: "Pemeriksaan Chill & Dimensi Kritis Kualitas",
    dept: "KONTROL MUTU",
    pages: 12,
    size: "1,1 MB",
    score: 98.5,
    delay: 88,
    highlight: false,
  },
  {
    file: "SUK-088-MLD_Rev3.docx",
    type: "docx",
    title: "Standar Maintenance Cetakan & Pola Pasir",
    dept: "MOLDING MAINTENANCE",
    pages: 18,
    size: "860 KB",
    score: 97.4,
    delay: 100,
    highlight: false,
  },
] as const;

// Matriks indeks: setiap ikon halaman mewakili sekelompok dokumen
const COLS = 60;
const ROWS = 5;
const DOT_GAP = 20;
const BAND_TOP = 376;
const DOTS = Array.from({ length: COLS * ROWS }, (_, i) => ({
  c: i % COLS,
  r: Math.floor(i / COLS),
  phase: random(`s6-dot-${i}`) * Math.PI * 2,
}));
// Tiga dokumen yang "cocok" dengan pencarian
const MATCHED = new Set([1 * COLS + 14, 3 * COLS + 33, 2 * COLS + 49]);

// Ikon halaman mini (10x13) dengan sudut terlipat
const MINI_PAGE = "M0 0H7L10 3V13H0Z";

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

/* ---- Pratinjau halaman dokumen (gaya thumbnail file) --------------------- */
const PW = 164;
const PH = 232;
const FOLD = 19;
const M = 15;
const INK = "#0B1B3A";
const GRAY = "#B8C4D8";
const GRAY2 = "#9AA9C2";
const PAPER = "#EEF3FA";
const PAGE_PATH = `M0 0H${PW - FOLD}L${PW} ${FOLD}V${PH}H0Z`;

/**
 * v: variasi isi (0 = tabel spesifikasi, 1 = daftar periksa, 2 = gambar cetakan)
 * p: progres "tercetak" 0..1, hl: kekuatan sorotan bagian yang cocok 0..1
 */
const PagePreview: React.FC<{ v: number; p: number; hl: number }> = ({ v, p, hl }) => {
  const q = (i: number) => interpolate(p, [i * 0.04, i * 0.04 + 0.35], [0, 1], clamp);
  const bw = (n: number) => 96 + random(`pg-${v}-${n}`) * 38;
  const CW = PW - M * 2;

  return (
    <svg width={PW + 8} height={PH + 6} viewBox={`0 0 ${PW + 8} ${PH + 6}`} style={{ display: "block" }}>
      {/* halaman di belakang: tanda dokumen bertumpuk */}
      <path d={PAGE_PATH} transform="translate(7 6)" fill="#9FB0CB" opacity={0.4} />
      <path d={PAGE_PATH} fill={PAPER} />
      <path d={`M${PW - FOLD} 0L${PW} ${FOLD}H${PW - FOLD}Z`} fill="#C3CFE2" />

      {/* kop dokumen */}
      <rect x={M} y={15} width={13} height={13} rx={3} fill={INK} />
      <rect x={M + 19} y={16.5} width={50 * q(0)} height={4} rx={2} fill={GRAY2} />
      <rect x={M + 19} y={23.5} width={32 * q(1)} height={3} rx={1.5} fill={GRAY} />

      {/* judul */}
      <rect x={M} y={42} width={112 * q(2)} height={7.5} rx={2} fill={INK} />
      <rect x={M} y={55} width={74 * q(3)} height={4} rx={2} fill="#5B6B88" />
      <rect x={M} y={67} width={CW * q(3)} height={1} fill="#C9D3E3" />

      {/* paragraf */}
      {[0, 1, 2, 3].map((n) => (
        <rect
          key={n}
          x={M}
          y={78 + n * 10}
          width={(n === 3 ? 64 : bw(n)) * q(4 + n)}
          height={3.5}
          rx={1.75}
          fill={GRAY}
        />
      ))}

      {/* blok khas tiap dokumen */}
      {v === 0 && (
        <g opacity={q(8)}>
          <rect x={M} y={124} width={CW} height={52} fill="none" stroke={GRAY} strokeWidth={1} />
          <rect x={M} y={124} width={CW} height={13} fill="#DDE6F3" />
          <rect x={M + 0.5} y={156.5} width={CW - 1} height={19} fill={COLORS.cyan} opacity={0.1 + hl * 0.5} />
          <line x1={M} y1={137} x2={M + CW} y2={137} stroke={GRAY} strokeWidth={1} />
          <line x1={M} y1={156.5} x2={M + CW} y2={156.5} stroke={GRAY} strokeWidth={1} />
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={M + 8 + col * 46}
                y={row === 0 ? 129.5 : row === 1 ? 145 : 164.5}
                width={[34, 28, 22][col]}
                height={3}
                rx={1.5}
                fill={row === 0 ? INK : GRAY2}
                opacity={row === 0 ? 0.6 : 1}
              />
            ))
          )}
        </g>
      )}
      {v === 1 && (
        <g opacity={q(8)}>
          {[0, 1, 2, 3].map((n) => (
            <g key={n}>
              <rect x={M} y={127 + n * 13} width={8} height={8} rx={1.5} fill="none" stroke={INK} strokeWidth={1.2} />
              {n < 3 && (
                <path
                  d={`M${M + 1.8} ${131 + n * 13}L${M + 3.8} ${133 + n * 13}L${M + 7} ${128.8 + n * 13}`}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <rect x={M + 15} y={128.5 + n * 13} width={bw(n + 10) - 20} height={3} rx={1.5} fill={GRAY2} />
            </g>
          ))}
        </g>
      )}
      {v === 2 && (
        <g opacity={q(8)}>
          <rect x={M} y={124} width={CW} height={54} fill="#E3EAF5" stroke={GRAY} strokeWidth={1} />
          <rect x={M + 28} y={138} width={78} height={26} fill="none" stroke={INK} strokeWidth={1.2} opacity={0.6} />
          <circle cx={M + 42} cy={151} r={5} fill="none" stroke={INK} strokeWidth={1.2} opacity={0.6} />
          <circle cx={M + 92} cy={151} r={5} fill="none" stroke={INK} strokeWidth={1.2} opacity={0.6} />
          <line x1={M + 8} y1={151} x2={M + CW - 8} y2={151} stroke={GRAY2} strokeWidth={1} strokeDasharray="4 3" />
        </g>
      )}

      {/* paragraf penutup + nomor halaman */}
      <rect x={M} y={188} width={124 * q(10)} height={3.5} rx={1.75} fill={GRAY} />
      <rect x={M} y={198} width={84 * q(11)} height={3.5} rx={1.75} fill={GRAY} />
      <rect x={M} y={PH - 16} width={34} height={3} rx={1.5} fill={GRAY} />
      <rect x={PW - M - 12} y={PH - 16} width={12} height={3} rx={1.5} fill={GRAY} />
    </svg>
  );
};

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
/* -------------------------------------------------------------------------- */
export const Scene6_IKADigital: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = Math.min(width / STAGE_W, height / STAGE_H);

  const spr = (delay: number, damping = 16, stiffness = 120) =>
    spring({ frame: Math.max(0, frame - delay), fps, config: { damping, stiffness } });

  /* ---- Pengetikan ------------------------------------------------------ */
  const typedCount = Math.floor(
    interpolate(frame, [T.typeStart, T.typeEnd], [0, SEARCH_QUERY.length], clamp)
  );
  const displayedSearch = SEARCH_QUERY.slice(0, typedCount);

  /* ---- Header ---------------------------------------------------------- */
  const kickerIn = spr(2, 18, 110);
  const TITLE_WORDS = ["IKA Digital:", "Pencarian", "&", "Pemahaman", "Dokumen", "SUK"];

  /* ---- Search bar ------------------------------------------------------ */
  const barS = spr(8, 17, 120);
  const indexCount = Math.floor(INDEXED_DOCS * easeOut(frame, 12, 52));
  const scanP = interpolate(frame, [T.scanStart, T.scanEnd], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const barFlash = interpolate(frame, [T.scanStart - 2, T.scanStart + 6, T.scanEnd + 14], [0, 1, 0], clamp);

  /* ---- Matriks indeks -------------------------------------------------- */
  const bandIn = interpolate(frame, [10, 34], [0, 1], clamp);
  const waveX = BOX.left + BOX.width * scanP;

  /* ---- Ringkasan hasil + fokus pada hasil teratas ---------------------- */
  const metaIn = interpolate(frame, [T.scanEnd - 8, T.scanEnd + 8], [0, 1], clamp);
  const focus = interpolate(frame, [T.focusStart, T.focusEnd], [0, 1], clamp);

  return (
    <VirtualCamera durationInFrames={200} zoomFrom={1.0} zoomTo={1.05}>
      <AbsoluteFill style={{ backgroundColor: COLORS.base, overflow: "hidden" }}>
        {/* Grid dengan parallax lambat */}
        <div
          style={{
            position: "absolute",
            inset: -60,
            transform: `translate(${-frame * 0.16}px, ${-frame * 0.09}px)`,
          }}
        >
          <BackgroundGrid opacity={0.35} size={65} lineColor="rgba(34, 211, 238, 0.08)" />
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
          {/* Cahaya ambient: menguat saat pindai berlangsung */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: 540,
              width: 900,
              height: 760,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              backgroundColor: COLORS.surface,
              filter: "blur(180px)",
              opacity: 0.7 + barFlash * 0.15,
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              zIndex: 20,
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
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: COLORS.cyan,
                  fontFamily: FONTS.heading,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  backgroundColor: "rgba(34, 211, 238, 0.12)",
                  border: "1px solid rgba(34, 211, 238, 0.3)",
                  padding: "6px 20px",
                  borderRadius: 20,
                }}
              >
                <BookOpen size={18} />
                Langkah Awal Transformasi AI
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 16,
                fontFamily: FONTS.heading,
                fontSize: 54,
                fontWeight: 900,
                color: COLORS.white,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {TITLE_WORDS.map((w, i) => (
                <MaskWord key={i} text={w} progress={spr(6 + i * 4, 16, 130)} />
              ))}
            </div>
          </div>

          {/* Kolom pencarian */}
          <div
            style={{
              position: "absolute",
              left: BOX.left,
              width: BOX.width,
              top: 256,
              height: 84,
              boxSizing: "border-box",
              borderRadius: 42,
              backgroundColor: "#0B1B3A",
              border: `2px solid ${COLORS.cyan}`,
              boxShadow: `0 0 ${35 + barFlash * 40}px rgba(${CYAN_RGB}, ${0.25 + barFlash * 0.25})`,
              padding: "0 18px 0 34px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              overflow: "hidden",
              opacity: barS,
              transform: `translateY(${(1 - barS) * 24}px)`,
              zIndex: 20,
              pointerEvents: "none",
            }}
          >
            <Search size={32} color={COLORS.cyan} style={{ flexShrink: 0 }} />
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 30,
                color: COLORS.white,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                flex: 1,
                minWidth: 0,
                whiteSpace: "nowrap",
              }}
            >
              {displayedSearch}
              {frame % 16 < 9 && <span style={{ color: COLORS.cyan }}>|</span>}
            </div>

            <div
              style={{
                flexShrink: 0,
                backgroundColor: `rgba(${CYAN_RGB}, 0.15)`,
                border: `1px solid ${COLORS.cyan}`,
                borderRadius: 24,
                padding: "10px 20px",
                fontFamily: FONTS.heading,
                fontSize: 14,
                fontWeight: 800,
                color: COLORS.cyan,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {formatThousands(indexCount)}
              {indexCount >= INDEXED_DOCS ? "+" : ""} DOKUMEN TERINDEKS
            </div>

            {/* indikator pencarian di tepi bawah */}
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                height: 3,
                width: `${scanP * 100}%`,
                backgroundColor: COLORS.cyan,
                boxShadow: `0 0 14px ${COLORS.cyan}`,
                opacity: scanP > 0 && scanP < 1 ? 1 : 0,
              }}
            />
          </div>

          {/* Matriks indeks: setiap ikon halaman = sekelompok dokumen + gelombang pindai */}
          <svg
            width={STAGE_W}
            height={STAGE_H}
            style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}
          >
            {DOTS.map((d, i) => {
              const x = BOX.left + DOT_GAP / 2 + d.c * DOT_GAP;
              const y = BAND_TOP + DOT_GAP / 2 + d.r * DOT_GAP;
              const passed = x < waveX && scanP > 0;
              const matched = MATCHED.has(i);
              const twinkle = 0.18 + (Math.sin(frame / 12 + d.phase) + 1) * 0.1;
              const nearFront = scanP > 0 && scanP < 1 ? Math.max(0, 1 - Math.abs(x - waveX) / 70) : 0;

              let opacity = twinkle;
              let r = 2.6;
              let fill: string = COLORS.cyan;

              if (passed) {
                if (matched) {
                  opacity = 1;
                  r = 5.5 + Math.sin(frame / 7 + d.phase) * 0.8;
                  fill = COLORS.white;
                } else {
                  opacity = 0.09;
                }
              }
              opacity = Math.min(1, opacity + nearFront * 0.7) * bandIn;
              const s = (r + nearFront * 1.5) / 2.6;

              return (
                <path
                  key={i}
                  d={MINI_PAGE}
                  transform={`translate(${x} ${y}) scale(${s}) translate(-5 -6.5)`}
                  fill={fill}
                  stroke={passed && matched ? COLORS.cyan : "none"}
                  strokeWidth={1}
                  opacity={opacity}
                  style={
                    passed && matched
                      ? { filter: `drop-shadow(0 0 8px ${COLORS.cyan})` }
                      : undefined
                  }
                />
              );
            })}

            {/* garis depan gelombang */}
            {scanP > 0 && scanP < 1 && (
              <line
                x1={waveX}
                y1={BAND_TOP - 8}
                x2={waveX}
                y2={BAND_TOP + ROWS * DOT_GAP + 8}
                stroke={COLORS.cyan}
                strokeWidth={3}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 12px ${COLORS.cyan})` }}
              />
            )}
          </svg>

          {/* Ringkasan hasil, seperti mesin pencari */}
          <div
            style={{
              position: "absolute",
              left: BOX.left,
              width: BOX.width,
              top: 494,
              display: "flex",
              justifyContent: "space-between",
              fontFamily: FONTS.body,
              fontSize: 17,
              fontWeight: 600,
              color: COLORS.textMuted,
              opacity: metaIn,
              zIndex: 15,
              pointerEvents: "none",
            }}
          >
            <span>
              {SUK_ENTRIES.length} hasil paling relevan dari {formatThousands(INDEXED_DOCS)} dokumen • 0,38 detik
            </span>
            <span>Urutan: relevansi semantik</span>
          </div>

          {/* Hasil pencarian: kartu file dokumen */}
          {SUK_ENTRIES.map((item, i) => {
            const s = spr(item.delay, 16, 125);
            const fill = interpolate(frame, [item.delay + 6, item.delay + 34], [0, 1], {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            });
            const score = item.score * fill;
            const typeColor = FILE_TYPE_COLOR[item.type];

            // sapuan cahaya sekali di kartu teratas
            const sheen = item.highlight
              ? interpolate(frame, [T.focusStart - 12, T.focusEnd + 12], [-0.3, 1.3], clamp)
              : -1;

            const dim = item.highlight ? 1 : 1 - focus * 0.4;

            return (
              <div
                key={item.file}
                style={{
                  position: "absolute",
                  left: BOX.left + i * (CARD_W + CARD_GAP),
                  top: CARDS_TOP,
                  width: CARD_W,
                  height: CARD_H,
                  boxSizing: "border-box",
                  borderRadius: 18,
                  backgroundColor: item.highlight ? "#0E244D" : "#0B1B3A",
                  border: `1.5px solid ${item.highlight ? COLORS.cyan : "rgba(255, 255, 255, 0.14)"}`,
                  boxShadow: item.highlight
                    ? `0 0 ${24 + focus * 26}px rgba(${CYAN_RGB}, ${0.12 + focus * 0.22})`
                    : undefined,
                  overflow: "hidden",
                  opacity: Math.min(1, s * 1.4) * dim,
                  transform: `translateY(${(1 - s) * 60}px)`,
                  zIndex: 15,
                  pointerEvents: "none",
                }}
              >
                {/* Thumbnail halaman dokumen */}
                <div
                  style={{
                    position: "relative",
                    height: THUMB_H,
                    backgroundColor: item.highlight ? `rgba(${CYAN_RGB}, 0.07)` : "rgba(255, 255, 255, 0.035)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ filter: "drop-shadow(0 10px 16px rgba(0, 0, 0, 0.5))" }}>
                    <PagePreview v={i} p={fill} hl={item.highlight ? focus : 0} />
                  </div>

                  {/* lencana tipe file */}
                  <div
                    style={{
                      position: "absolute",
                      left: (CARD_W - (PW + 8)) / 2 - 10,
                      bottom: 16,
                      backgroundColor: typeColor,
                      color: COLORS.white,
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontFamily: FONTS.heading,
                      fontSize: 13,
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.4)",
                      opacity: fill,
                    }}
                  >
                    {item.type.toUpperCase()}
                  </div>
                </div>

                {/* Info file */}
                <div style={{ padding: "16px 22px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FileText size={24} color={typeColor} style={{ flexShrink: 0 }} />
                    <div
                      style={{
                        fontFamily: FONTS.heading,
                        fontSize: 23,
                        fontWeight: 800,
                        color: COLORS.white,
                        letterSpacing: "-0.01em",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.file}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: 17,
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      lineHeight: 1.35,
                      marginTop: 8,
                      minHeight: 46,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      opacity: 0.85,
                      marginTop: 8,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.dept} • {item.pages} hal • {item.size}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      width: 224,
                      boxSizing: "border-box",
                      textAlign: "center",
                      backgroundColor: item.highlight ? `rgba(${EMERALD_RGB}, 0.2)` : "rgba(255, 255, 255, 0.08)",
                      border: `1px solid ${item.highlight ? COLORS.emerald : "transparent"}`,
                      borderRadius: 16,
                      color: item.highlight ? COLORS.emerald : COLORS.textMuted,
                      padding: "6px 0",
                      fontFamily: FONTS.heading,
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {score.toFixed(1)}% SEMANTIC MATCH
                  </div>
                </div>

                {/* sapuan cahaya */}
                {item.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${sheen * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: 120,
                      backgroundColor: "rgba(34, 211, 238, 0.2)",
                      filter: "blur(14px)",
                      opacity: sheen > -0.2 && sheen < 1.2 ? 1 : 0,
                    }}
                  />
                )}

                {/* garis skor di tepi bawah kartu */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    height: 3,
                    width: `${score}%`,
                    backgroundColor: item.highlight ? COLORS.emerald : "rgba(255, 255, 255, 0.35)",
                    boxShadow: item.highlight ? `0 0 12px ${COLORS.emerald}` : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </VirtualCamera>
  );
};