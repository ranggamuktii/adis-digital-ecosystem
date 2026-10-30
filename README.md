# ADIS Corporate Motion Graphic Film — AICC Digital Ecosystem

Film motion graphic corporate tingkat tinggi yang merepresentasikan ekosistem digital **ADIS (AICC Digital Ecosystem)** di **PT Asian Isuzu Casting Center**.

Diproduksi menggunakan **Remotion**, **React**, dan **TypeScript**, film ini menyatukan narasi audio voiceover resmi berbahasa Indonesia dengan **subtitle dwibahasa simultan (English & Japanese)**, tata suara sinematik (*music bed & synchronized sound effects*), dan grafis visual tech modern berskala After Effects.

---

## 🎬 Spesifikasi Video

* **Resolusi**: 1920 × 1080 (Full HD, 16:9)
* **Frame Rate**: 30 FPS
* **Durasi Total**: 1.740 frame (58,0 detik)
* **Format Output**: MP4 (H.264 / AAC)
* **Subtitles**: Bahasa Inggris (putih kontras tinggi) & Bahasa Jepang (cyan lembut) tampil bersamaan di bagian bawah layar (*safe area*).
* **Desain & Warna**: Obsidian Dark Corporate Tech (`#060D1F`), Cyan (`#22D3EE`), Blue (`#3B82F6`), Gold (`#FBBF24`), Emerald (`#10B981`).
* **Kepatuhan Aturan**: Sesuai Rule 20 (Strictly Solid Colors, NO GRADIENTS. Efek glow/bloom dibuat melalui layer blur solid).

---

## 📖 Alur 7 Adegan Sinematik (Story & Narrative)

| No | Adegan & Frame | Narasi Suara (ID) | Subtitle Inggris (EN) & Jepang (JP) | Konsep & Elemen Visual |
|---|---|---|---|---|
| **1** | **The Gateway Hook**<br>(Frame 0 – 215) | *"Satu portal. Berbagai sistem. Satu ekosistem digital. Inilah ADIS."* | **EN**: *One portal. Multiple systems. One digital ecosystem. This is ADIS.*<br>**JP**: 一つのポータル。複数のシステム。一つのデジタルエコシステム。それがADISです。 | Kartu aplikasi enterprise tersebar di ruang 3D melayang menuju pusat, tersedot ke cincin portal cahaya (*The Single Gateway*). Tipografi **ADIS** muncul megah dengan cincin shockwave. |
| **2** | **Central Enterprise Portal**<br>(Frame 215 – 415) | *"Portal enterprise terpusat AICC yang menghubungkan akses ke berbagai aplikasi internal melalui satu pintu."* | **EN**: *AICC’s centralized enterprise portal, connecting access to internal applications through a single gateway.*<br>**JP**: ADISは、社内アプリケーションへのアクセスを一元化する、AICCの統合ポータルです。 | Kamera meluncur menembus aperture portal. Inti *ADIS Gateway Core* menghubungkan Casting & Molding, Digital QC, IoT Telemetry, dan ITRS Request via jalur sirkuit data yang mengalir mulus (*Single Sign-On*). |
| **3** | **Four Core Pillars**<br>(Frame 415 – 625) | *"Production, Quality, IoT, dan AI menjadi pilar bisnis dalam ekosistem digital AICC."* | **EN**: *Production, Quality, IoT, and AI form the business pillars of AICC’s digital ecosystem.*<br>**JP**: Production、Quality、IoT、AIが、AICCのデジタルエコシステムを支える主要な柱となっています。 | Empat pilar monolit kaca tumbuh ritmis dari grid obsidian: **Production** (Cyan), **Quality** (Emerald), **IoT** (Blue), dan **AI** (Gold) lengkap dengan metrik operasional terverifikasi. |
| **4** | **AI Transformation**<br>(Frame 625 – 805) | *"Kini, AICC melangkah menuju transformasi AI yang terintegrasi dan berkelanjutan."* | **EN**: *Now, AICC is advancing toward an integrated and sustainable AI transformation.*<br>**JP**: 今、AICCは統合的で持続可能なAI変革へと進みます。 | Pilar AI berpendar energi emas hangat. Kamera tilt-up ke garis cakrawala data masa depan (*horizon line*) memperlihatkan jalur integrasi kecerdasan berkelanjutan. |
| **5** | **LLM & RAG Engine**<br>(Frame 805 – 1245) | *"Melalui Large Language Model atau LLM, AI dapat memahami pertanyaan dalam bahasa manusia dan menghasilkan jawaban. Dengan teknologi RAG, AI dapat mencari informasi dari dokumen internal serta menyertakan referensi sumber."* | **EN**: *With Large Language Models, or LLMs, AI can understand questions in human language and generate answers. Through RAG, it can retrieve information from internal documents and provide source references.*<br>**JP**: 大規模言語モデル、LLMは、人間の言葉による質問を理解し、回答を生成します。RAG技術により、社内文書から情報を検索し、参照元を提示できます。 | **5A (LLM)**: Operator mengetik pertanyaan suhu tuang casting, token semantik menyala.<br>**5B (RAG)**: Brankas dokumen internal (`SUK-QC-MOLDING-REV4.pdf`) terbuka, klausul parameter tersorot, dan jawaban terverifikasi muncul bersama sitasi sumber (Akurasi 99.4%). |
| **6** | **IKA Digital & SUK Intelligence**<br>(Frame 1245 – 1445) | *"IKA Digital menjadi salah satu langkah awal, dengan fokus pada pencarian dan pemahaman dokumen SUK."* | **EN**: *IKA Digital is one of the first steps, focusing on searching and understanding SUK documents.*<br>**JP**: IKA Digitalは、その第一歩の一つとして、SUK文書の検索と理解を支援します。 | Milestone *IKA Digital* hadir di atas grid. Pencarian semantik cerdas menyapu ribuan lembar SUK (*Standar Urutan Kerja*) secara instan dengan pencocokan vektor 99.8%. |
| **7** | **Grand Finale & Corporate Lockup**<br>(Frame 1445 – 1740) | *"ADIS. Fondasi digital hari ini, menuju masa depan berbasis AI."* | **EN**: *ADIS. Today’s digital foundation, advancing toward an AI-powered future.*<br>**JP**: ADIS。今日のデジタル基盤から、AIが切り拓く未来へ。 | Sorotan sapuan cahaya sinematik menyapu layar. Lockup agung **ADIS** bertransisi mulus ke identitas resmi **PT Asian Isuzu Casting Center** — *Digital Transformation Division, Powered by IT Department*. |

---

## 🎵 Sound Design & Audio Architecture

1. **Voice-Over Narration** (`public/audio/voiceover.mp3`): Narasi vokal bahasa Indonesia dengan artikulasi prima, dimulai pada frame 20 untuk memberikan ruang pernapasan awal.
2. **Ambient Music Bed** (`public/audio/ambient-bed.wav`): Dihasilkan melalui sintesis audio matematika 44.1kHz 16-bit PCM (chords Fm - Db - Bbm - C) dengan *audio ducking* dinamis (volume 0.16 saat narasi berbicara, naik halus ke 0.28 pada intro & outro).
3. **Synchronized Sound Effects (SFX)**:
   * `cinematic-impact.mp3`: Hantaman sub-bass saat portal terbangun dan resolusi judul final.
   * `thin-swoosh.mp3`: Sapuan udara halus pada setiap perpindahan adegan dan pergerakan kamera.
   * `ui-tick.wav`: Micro-click mekanis presisi saat kemunculan kartu aplikasi dan 4 pilar.
   * `suspense-riser.mp3`: Riser ketegangan sinematik saat pilar AI berpendar menuju transformasi.
   * `tech-chime.wav`: Denting lonceng harmonik kristal saat jawaban RAG terverifikasi disintesis.
   * `interface.mp3`: Respon digital saat kunci portal ADIS dan pencarian SUK selesai.
   * `logo-reveal.mp3`: Suara megah kemunculan logo resmi PT Asian Isuzu Casting Center.

---

## 📁 Struktur Kode & Modul

```text
src/
├── components/
│   ├── BackgroundGrid.tsx      # Grid latar SVG murni (Rule 20 compliant, NO gradients)
│   ├── GlowingPortal.tsx       # Cincin portal cahaya aperture SVG dengan telemetri rotasi
│   ├── HUD.tsx                 # Watermark brand AICC, status online, dan running timecode
│   ├── SceneTransition.tsx     # Transisi cinematic blur dip & sapuan cahaya luminous
│   ├── SubtitleBar.tsx         # Bar subtitle dwibahasa (EN + JP) tersinkronisasi
│   └── VirtualCamera.tsx       # Kontrol kamera virtual (zoom, pan, tilt, depth of field)
├── data/
│   └── subtitles.ts            # Data subtitle EN & JP lengkap dengan frame start/end
├── scenes/
│   ├── Scene1_GatewayHook.tsx      # Adegan 1: Cincin portal & kemunculan ADIS
│   ├── Scene2_CentralPortal.tsx    # Adegan 2: Satu pintu akses sistem internal AICC
│   ├── Scene3_FourPillars.tsx      # Adegan 3: 4 pilar bisnis (Production, Quality, IoT, AI)
│   ├── Scene4_AITransformation.tsx # Adegan 4: Transformasi AI berkelanjutan & cakrawala
│   ├── Scene5_LLM_RAG.tsx          # Adegan 5: Terminal prompt LLM & brankas sitasi RAG
│   ├── Scene6_IKADigital.tsx       # Adegan 6: Pencarian dan pemahaman dokumen SUK
│   └── Scene7_ClosingFinale.tsx    # Adegan 7: Lockup ADIS & PT AICC Corporate Resolve
├── Composition.tsx             # Orkes komposisi utama, mixing audio bed, VO, & SFX
├── Root.tsx                    # Registrasi Composition
├── theme.ts                    # Token warna solid, tipografi, dan konfigurasi video
└── index.ts                    # Entry point Remotion
public/
├── audio/
│   ├── voiceover.mp3           # Audio narasi vokal resmi
│   └── ambient-bed.wav         # Synthesized ambient synth pad (58 detik)
├── logo/
│   └── logo-light.png          # Logo resmi AICC
└── sfx/                        # Koleksi efek suara terkurasi & tersintesis
out/
└── adis-film.mp4               # Video final Full HD hasil render
```

---

## 🛠️ Perintah Menjalankan & Merender

```bash
# 1. Menjalankan Remotion Studio untuk preview interaktif
npm run dev

# 2. Merender video final MP4
npm run render
```
