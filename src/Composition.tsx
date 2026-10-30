import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { COLORS, VIDEO_CONFIG } from "./theme";
import { Scene1_GatewayHook } from "./scenes/Scene1_GatewayHook";
import { Scene2_CentralPortal } from "./scenes/Scene2_CentralPortal";
import { Scene3_FourPillars } from "./scenes/Scene3_FourPillars";
import { Scene4_AITransformation } from "./scenes/Scene4_AITransformation";
import { Scene5_LLM_RAG } from "./scenes/Scene5_LLM_RAG";
import { Scene6_IKADigital } from "./scenes/Scene6_IKADigital";
import { Scene7_ClosingFinale } from "./scenes/Scene7_ClosingFinale";
import { SubtitleBar } from "./components/SubtitleBar";
import { SceneTransition } from "./components/SceneTransition";
import { CorporateHeaderLogo } from "./components/CorporateHeaderLogo";
import {
  typingPrompt,
  typingSearch,
  aiStream,
  whooshSmooth,
  layerRise,
  dataBeam,
  laserScan,
  subHitSmooth,
  hapticTap,
  crystalChime,
} from "./remotion-sfx";

export const TOTAL_DURATION = VIDEO_CONFIG.durationInFrames; // 1740 frames = 58s @ 30fps

interface SfxProps {
  src: string;
  from: number;
  volume?: number;
}

const Sfx: React.FC<SfxProps> = ({ src, from, volume = 0.3 }) => (
  <Sequence from={from} layout="none">
    <Audio src={src} volume={volume} />
  </Sequence>
);

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();

  const cutFrames = [215, 415, 625, 805, 1245, 1445];
  const finaleCut = 1600;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.base }}>
      {/* ── VOICEOVER (Crisp, isolated, zero background interference) ── */}
      <Sequence from={20} layout="none">
        <Audio src={staticFile("audio/voiceover.mp3")} volume={1.0} />
      </Sequence>

      {/* ── HIGH-PRECISION SMOOTH CORPORATE SOUND DESIGN ────── */}
      {/* Scene 1: The Gateway Hook (0 - 215) */}
      <Sfx src={subHitSmooth} from={0} volume={0.28} />
      <Sfx src={whooshSmooth} from={0} volume={0.20} />
      <Sfx src={hapticTap} from={60} volume={0.18} />
      <Sfx src={dataBeam} from={155} volume={0.20} />
      <Sfx src={hapticTap} from={180} volume={0.22} />

      {/* Scene 2: Centralized Enterprise Portal (215 - 415) */}
      <Sfx src={hapticTap} from={230} volume={0.16} />
      <Sfx src={layerRise} from={250} volume={0.18} />
      <Sfx src={crystalChime} from={290} volume={0.22} />

      {/* Scene 3: Four Business Pillars - Exploded View (415 - 625) */}
      {/* 4 Layers Separate Rhythmically: Production, Quality, IoT, AI */}
      <Sfx src={layerRise} from={419} volume={0.15} />
      <Sfx src={layerRise} from={437} volume={0.15} />
      <Sfx src={layerRise} from={455} volume={0.16} />
      <Sfx src={layerRise} from={473} volume={0.18} />
      {/* Data Axis Beam Ignites & Surges Upward */}
      <Sfx src={dataBeam} from={503} volume={0.22} />
      {/* Beam Peaks at AI Layer with Harmonic Ripple */}
      <Sfx src={crystalChime} from={569} volume={0.22} />

      {/* Scene 4: AI Transformation (625 - 805) */}
      {/* Analog-to-Digital Scan Sweep across Panels */}
      <Sfx src={laserScan} from={660} volume={0.20} />
      {/* Digital Binary Matrix Flutter */}
      <Sfx src={aiStream} from={685} volume={0.14} />
      {/* Data Conduits Feed Packets Downward */}
      <Sfx src={dataBeam} from={715} volume={0.18} />
      {/* AI Cognitive Core Ignition */}
      <Sfx src={subHitSmooth} from={743} volume={0.25} />

      {/* Scene 5: LLM & RAG Engine (805 - 1245) */}
      {/* Realistic Keyboard Typing: Prompt Query */}
      <Sfx src={typingPrompt} from={830} volume={0.24} />
      {/* Semantic Tokens Emerge from Orb */}
      <Sfx src={dataBeam} from={925} volume={0.18} />
      {/* Tokens Morph into RAG Search Bar */}
      <Sfx src={layerRise} from={1005} volume={0.18} />
      {/* Laser Scanner Sweeps Authentic SUK Factory Sheet */}
      <Sfx src={laserScan} from={1050} volume={0.22} />
      {/* AI Grounded Answer Streams Text (Rapid Generative Teletype) */}
      <Sfx src={aiStream} from={1130} volume={0.20} />
      {/* Citation Verified Harmonic Confirmation */}
      <Sfx src={crystalChime} from={1185} volume={0.24} />

      {/* Scene 6: IKA Digital & SUK Intelligence (1245 - 1445) */}
      {/* Realistic Keyboard Typing: SUK Search Query */}
      <Sfx src={typingSearch} from={1260} volume={0.22} />
      {/* Radar Scan Wave Across Document Database */}
      <Sfx src={laserScan} from={1315} volume={0.20} />
      {/* Top Document (99.8% Match) Focus & Lock */}
      <Sfx src={crystalChime} from={1360} volume={0.22} />

      {/* Scene 7: Grand Finale & Corporate Resolve (1445 - 1740) */}
      {/* 4 Gating Runners Flow from 4 Screen Corners */}
      <Sfx src={dataBeam} from={1465} volume={0.18} />
      {/* High-Speed Singularity Convergence into Pouring Point */}
      <Sfx src={whooshSmooth} from={1585} volume={0.24} />
      {/* Pukulan Gong / Singularity Hits: Official AICC Vector Logo Revealed */}
      <Sfx src={subHitSmooth} from={1609} volume={0.30} />
      <Sfx src={crystalChime} from={1609} volume={0.24} />

      {/* ── SCENE SEQUENCES ──────────────────────────────── */}
      {/* Scene 1: The Gateway Hook (0 - 215) */}
      <Sequence from={0} durationInFrames={215}>
        <Scene1_GatewayHook />
      </Sequence>

      {/* Scene 2: Centralized Enterprise Portal (215 - 415) */}
      <Sequence from={215} durationInFrames={200}>
        <Scene2_CentralPortal />
      </Sequence>

      {/* Scene 3: Four Business Pillars (415 - 625) */}
      <Sequence from={415} durationInFrames={210}>
        <Scene3_FourPillars />
      </Sequence>

      {/* Scene 4: AI Transformation (625 - 805) */}
      <Sequence from={625} durationInFrames={180}>
        <Scene4_AITransformation />
      </Sequence>

      {/* Scene 5: LLM & RAG Engine (805 - 1245) */}
      <Sequence from={805} durationInFrames={440}>
        <Scene5_LLM_RAG />
      </Sequence>

      {/* Scene 6: IKA Digital & SUK Documents (1245 - 1445) */}
      <Sequence from={1245} durationInFrames={200}>
        <Scene6_IKADigital />
      </Sequence>

      {/* Scene 7: Closing Finale & Corporate Lockup (1445 - 1740) */}
      <Sequence from={1445} durationInFrames={295}>
        <Scene7_ClosingFinale />
      </Sequence>

      {/* ── OVERLAYS: LOGO, FLAT SUBTITLES & TRANSITIONS ───────── */}
      {/* Official AICC Corporate Header Logo (Top-Left) */}
      <CorporateHeaderLogo />

      {/* Bilingual Subtitle Bar (Flat black background, no rounded, no shadow) */}
      <SubtitleBar />

      {/* Cinema Transitions */}
      <SceneTransition
        globalFrame={frame}
        cutFrames={cutFrames}
        finaleCut={finaleCut}
      />
    </AbsoluteFill>
  );
};

export const StarterComposition: React.FC = () => {
  return (
    <Composition
      id="MainVideo"
      component={MainVideo}
      durationInFrames={TOTAL_DURATION}
      fps={VIDEO_CONFIG.fps}
      width={VIDEO_CONFIG.width}
      height={VIDEO_CONFIG.height}
    />
  );
};
