/**
 * Smooth High-End Corporate Sound Design Generator
 * Synthesizes 44.1kHz 16-bit Stereo PCM WAV files engineered specifically for
 * high-end corporate motion graphics (AICC / Isuzu / Apple / Stripe aesthetic).
 * 
 * Includes realistic mechanical/MacBook "thocky" keyboard typing,
 * rapid AI generative text streaming, subtle tactile micro-interactions,
 * airy laser sweeps, and harmonic chimes.
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function createWavHeader(numSamples, numChannels = 2, sampleRate = SAMPLE_RATE) {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = numSamples * numChannels * 2;
  const buffer = Buffer.alloc(44);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16 bits

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

function writeWavFile(filepath, leftChannel, rightChannel) {
  const numSamples = leftChannel.length;
  const header = createWavHeader(numSamples, 2, SAMPLE_RATE);
  const data = Buffer.alloc(numSamples * 4);

  for (let i = 0; i < numSamples; i++) {
    const lClamped = Math.max(-1, Math.min(1, leftChannel[i]));
    const rClamped = Math.max(-1, Math.min(1, rightChannel[i]));

    const lInt = Math.floor(lClamped < 0 ? lClamped * 0x8000 : lClamped * 0x7FFF);
    const rInt = Math.floor(rClamped < 0 ? rClamped * 0x8000 : rClamped * 0x7FFF);

    data.writeInt16LE(lInt, i * 4);
    data.writeInt16LE(rInt, i * 4 + 2);
  }

  const fullBuffer = Buffer.concat([header, data]);
  fs.writeFileSync(filepath, fullBuffer);
  console.log(`✓ Generated: ${path.basename(filepath)} (${(fullBuffer.length / 1024).toFixed(1)} KB)`);
}

// -------------------------------------------------------------
// Keystroke synthesizer: generates a single smooth, "thocky" mechanical keypress
// -------------------------------------------------------------
function synthesizeKeyStroke(leftArr, rightArr, startSample, pitchFactor = 1.0, pan = 0.0, intensity = 1.0) {
  const strokeSamples = Math.floor(0.045 * SAMPLE_RATE); // ~45ms per keystroke
  const panL = 0.5 * (1 - pan * 0.4);
  const panR = 0.5 * (1 + pan * 0.4);

  for (let j = 0; j < strokeSamples; j++) {
    const idx = startSample + j;
    if (idx >= leftArr.length) break;

    const t = j / SAMPLE_RATE;
    // Initial tactile click (filtered noise + high snap)
    const clickEnv = Math.exp(-t * 380);
    const click = (Math.random() * 2 - 1) * 0.35 * clickEnv;

    // Body "thock" resonance: 320Hz fundamental with pitch drop
    const bodyEnv = Math.exp(-t * 90);
    const bodyFreq = (310 + 90 * Math.exp(-t * 180)) * pitchFactor;
    const body = Math.sin(2 * Math.PI * bodyFreq * t) * 0.55 * bodyEnv;

    // Low bottom-out warmth: 160Hz
    const subEnv = Math.exp(-t * 120);
    const sub = Math.sin(2 * Math.PI * 160 * pitchFactor * t) * 0.35 * subEnv;

    const sample = (click + body + sub) * intensity * 0.45;
    leftArr[idx] += sample * panL;
    rightArr[idx] += sample * panR;
  }
}

// -------------------------------------------------------------
// Realistic Keyboard Typing Sequence (Natural human cadence)
// -------------------------------------------------------------
function generateTypingSequence(duration, avgCps = 14) {
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  let currentSample = Math.floor(0.02 * SAMPLE_RATE);

  while (currentSample < numSamples - 0.06 * SAMPLE_RATE) {
    // Natural human variation in keystroke timing
    const isSpace = Math.random() < 0.18;
    const intervalSec = isSpace ? (0.10 + Math.random() * 0.06) : (1 / avgCps + (Math.random() * 0.03 - 0.015));
    
    // Spacebar has slightly lower pitch, keys alternate stereo position
    const pitch = isSpace ? 0.85 : (0.92 + Math.random() * 0.16);
    const pan = (Math.random() * 2 - 1) * 0.6; // across stereo field
    const intensity = isSpace ? 1.15 : (0.8 + Math.random() * 0.35);

    synthesizeKeyStroke(left, right, currentSample, pitch, pan, intensity);
    currentSample += Math.floor(intervalSec * SAMPLE_RATE);
  }

  // Smooth fade-in and fade-out to prevent clicks
  const fadeLen = Math.floor(0.02 * SAMPLE_RATE);
  for (let i = 0; i < fadeLen; i++) {
    const ramp = i / fadeLen;
    left[i] *= ramp;
    right[i] *= ramp;
    left[numSamples - 1 - i] *= ramp;
    right[numSamples - 1 - i] *= ramp;
  }

  return { left, right };
}

// -------------------------------------------------------------
// Rapid AI Generative Text Stream (High-speed soft digital teletype)
// -------------------------------------------------------------
function generateAiStreamTyping(duration) {
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  const charRate = 24; // 24 characters/sec
  const intervalSamples = Math.floor(SAMPLE_RATE / charRate);

  for (let sample = 0; sample < numSamples - 0.04 * SAMPLE_RATE; sample += intervalSamples) {
    const t = sample / numSamples;
    // Envelope for entire stream
    const streamEnv = Math.pow(Math.sin(t * Math.PI), 0.5);

    const pitch = 1.15 + (Math.random() * 0.2 - 0.1);
    const pan = (Math.random() * 2 - 1) * 0.4;
    synthesizeKeyStroke(left, right, sample, pitch, pan, 0.45 * streamEnv);
  }

  return { left, right };
}

// -------------------------------------------------------------
// Smooth Cinematic Whoosh (Only for dramatic spatial motion)
// -------------------------------------------------------------
function generateSmoothWhoosh() {
  const duration = 0.85;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  let lpL = 0, lpR = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    const env = Math.pow(Math.sin(t * Math.PI), 2.2);

    const cutoffHz = 220 + 1400 * Math.sin(t * Math.PI);
    const alpha = (2 * Math.PI * cutoffHz) / SAMPLE_RATE;

    const whiteL = (Math.random() * 2 - 1) * 0.65;
    const whiteR = (Math.random() * 2 - 1) * 0.65;
    const sub = Math.sin(2 * Math.PI * (65 + 35 * (1 - t)) * (i / SAMPLE_RATE)) * 0.2;

    lpL += alpha * (whiteL + sub - lpL);
    lpR += alpha * (whiteR + sub - lpR);

    const panL = Math.cos((t * 0.5) * Math.PI);
    const panR = Math.sin((t * 0.5) * Math.PI);

    left[i] = lpL * env * panL * 0.7;
    right[i] = lpR * env * panR * 0.7;
  }

  return { left, right };
}

// -------------------------------------------------------------
// Layer Rise / Tactile Slide (For 3D plate separations)
// -------------------------------------------------------------
function generateLayerRise() {
  const duration = 0.16; // 160ms
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const time = i / SAMPLE_RATE;
    const t = i / numSamples;
    const env = Math.sin(t * Math.PI) * Math.exp(-t * 2.5);

    const freq = 220 + 160 * Math.pow(t, 0.7);
    const tone = Math.sin(2 * Math.PI * freq * time);
    const friction = (Math.random() * 2 - 1) * 0.08 * (1 - t);

    left[i] = (tone * 0.7 + friction) * env * 0.6;
    right[i] = (tone * 0.7 - friction) * env * 0.6;
  }

  return { left, right };
}

// -------------------------------------------------------------
// Data Beam / Energy Rise (Conduit stream & vertical axis pulse)
// -------------------------------------------------------------
function generateDataBeam() {
  const duration = 0.42; // 420ms
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const time = i / SAMPLE_RATE;
    const t = i / numSamples;
    const env = Math.pow(Math.sin(t * Math.PI), 1.8);

    const freq = 320 + 360 * Math.pow(t, 1.2);
    const tone = Math.sin(2 * Math.PI * freq * time) * 0.7 + Math.sin(2 * Math.PI * freq * 2 * time) * 0.15;

    const chorusL = Math.sin(2 * Math.PI * (freq * 0.998) * time);
    const chorusR = Math.sin(2 * Math.PI * (freq * 1.002) * time);

    left[i] = (tone * 0.6 + chorusL * 0.2) * env * 0.55;
    right[i] = (tone * 0.6 + chorusR * 0.2) * env * 0.55;
  }

  return { left, right };
}

// -------------------------------------------------------------
// Laser Scan / Radar Sweep (Airy, clean, non-abrasive frequency sweep)
// -------------------------------------------------------------
function generateLaserScan() {
  const duration = 0.48; // 480ms
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  let bpL = 0, bpR = 0;

  for (let i = 0; i < numSamples; i++) {
    const time = i / SAMPLE_RATE;
    const t = i / numSamples;
    const env = Math.pow(Math.sin(t * Math.PI), 2.0);

    const centerHz = 750 + 600 * Math.sin(t * Math.PI);
    const alpha = (2 * Math.PI * centerHz) / SAMPLE_RATE;

    const noise = (Math.random() * 2 - 1) * 0.5;
    const sine = Math.sin(2 * Math.PI * centerHz * time) * 0.35;

    bpL += alpha * (noise + sine - bpL);
    bpR += alpha * (noise - sine - bpR);

    left[i] = bpL * env * (1 - t * 0.5) * 0.5;
    right[i] = bpR * env * (0.5 + t * 0.5) * 0.5;
  }

  return { left, right };
}

// -------------------------------------------------------------
// Smooth Sub-Bass Hit (Velvety, prestigious low-end authority)
// -------------------------------------------------------------
function generateSmoothSubHit() {
  const duration = 1.3;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const time = i / SAMPLE_RATE;
    const attack = Math.min(1, time / 0.025);
    const decay = Math.exp(-time * 3.4);
    const env = attack * decay;

    const freq = 44 + 24 * Math.exp(-time * 7.5);
    const phase = 2 * Math.PI * freq * time;
    const tone = Math.sin(phase) * 0.85 + Math.sin(phase * 2) * 0.15;

    left[i] = tone * env * 0.65;
    right[i] = tone * env * 0.65;
  }

  return { left, right };
}

// -------------------------------------------------------------
// Smooth Haptic Tap (Apple / macOS tactile micro-interaction)
// -------------------------------------------------------------
function generateSmoothHapticTap() {
  const duration = 0.06;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const time = i / SAMPLE_RATE;
    const env = Math.exp(-time * 95);

    const freq = 620 + 220 * Math.exp(-time * 140);
    const tone = Math.sin(2 * Math.PI * freq * time);

    left[i] = tone * env * 0.55;
    right[i] = tone * env * 0.55;
  }

  return { left, right };
}

// -------------------------------------------------------------
// Smooth Crystal Chime (Lush harmonic confirmation)
// -------------------------------------------------------------
function generateSmoothCrystalChime() {
  const duration = 1.25;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  const freqs = [1318.5, 1975.5, 2637.0];
  const amps = [0.45, 0.35, 0.2];

  for (let i = 0; i < numSamples; i++) {
    const time = i / SAMPLE_RATE;
    const attack = Math.min(1, time / 0.008);

    let sampleL = 0;
    let sampleR = 0;

    freqs.forEach((f, idx) => {
      const decay = Math.exp(-time * (2.8 + idx * 0.8));
      const env = attack * decay;
      const valL = Math.sin(2 * Math.PI * f * time) * amps[idx] * env;
      const valR = Math.sin(2 * Math.PI * (f * 1.002) * time) * amps[idx] * env;
      sampleL += valL;
      sampleR += valR;
    });

    left[i] = sampleL * 0.6;
    right[i] = sampleR * 0.6;
  }

  return { left, right };
}

// -------------------------------------------------------------
// Main execution
// -------------------------------------------------------------
const outDir = path.join(__dirname, '..', 'public', 'sfx-smooth');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Synthesizing comprehensive high-end corporate sound suite...');

// Typing: Prompt sequence (2.85s for Scene 5)
const typingPrompt = generateTypingSequence(2.85, 16);
writeWavFile(path.join(outDir, 'typing-prompt.wav'), typingPrompt.left, typingPrompt.right);

// Typing: Search sequence (1.70s for Scene 6)
const typingSearch = generateTypingSequence(1.70, 18);
writeWavFile(path.join(outDir, 'typing-search.wav'), typingSearch.left, typingSearch.right);

// AI Stream text typing (1.65s for Scene 5 LLM response)
const aiStream = generateAiStreamTyping(1.65);
writeWavFile(path.join(outDir, 'ai-stream.wav'), aiStream.left, aiStream.right);

// Standard smooth sound effects
const whoosh = generateSmoothWhoosh();
writeWavFile(path.join(outDir, 'whoosh-smooth.wav'), whoosh.left, whoosh.right);

const layerRise = generateLayerRise();
writeWavFile(path.join(outDir, 'layer-rise.wav'), layerRise.left, layerRise.right);

const dataBeam = generateDataBeam();
writeWavFile(path.join(outDir, 'data-beam.wav'), dataBeam.left, dataBeam.right);

const laserScan = generateLaserScan();
writeWavFile(path.join(outDir, 'laser-scan.wav'), laserScan.left, laserScan.right);

const subHit = generateSmoothSubHit();
writeWavFile(path.join(outDir, 'sub-hit-smooth.wav'), subHit.left, subHit.right);

const hapticTap = generateSmoothHapticTap();
writeWavFile(path.join(outDir, 'haptic-tap.wav'), hapticTap.left, hapticTap.right);

const crystalChime = generateSmoothCrystalChime();
writeWavFile(path.join(outDir, 'crystal-chime.wav'), crystalChime.left, crystalChime.right);

console.log('✓ All 10 dedicated smooth corporate sound assets synthesized successfully.');
