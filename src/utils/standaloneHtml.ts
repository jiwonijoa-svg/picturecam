/**
 * 외부 의존성(CDN, 외부 이미지, 오디오 파일 링크) 없이
 * 단일 파일(Single File HTML)만으로 모든 기능이 완벽하게 동작하는
 * index.html 독립 실행 파일 코드를 생성합니다.
 */

export function generateStandaloneHtmlString(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>빛나는 크리스마스 마을 (내가 그린 그림이 살아나요)</title>
  <style>
    /* ========================================================
       [CSS 스타일링] 외부 라이브러리 없이 순수 CSS로 구성
       ======================================================== */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #040916;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif;
      color: #f1f5f9;
    }
    #village-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
      display: block;
    }
    /* 상단 헤더 */
    header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 20;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      pointer-events: none;
    }
    .brand-card {
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(51, 65, 85, 0.7);
      border-radius: 18px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .brand-card .tree-icon {
      font-size: 26px;
      animation: bounce 2s infinite ease-in-out;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #f43f5e;
      font-weight: normal;
    }
    .brand-counter {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .brand-counter span {
      color: #fcd34d;
      font-weight: 700;
    }
    .btn-group {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      outline: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      backdrop-filter: blur(6px);
    }
    .btn:active {
      transform: scale(0.96);
    }
    .btn-primary {
      background: linear-gradient(135deg, #e11d48, #ef4444);
      color: #ffffff;
      border: 1px solid rgba(253, 164, 175, 0.3);
      box-shadow: 0 4px 15px rgba(225, 29, 72, 0.35);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #f43f5e, #f87171);
    }
    .btn-secondary {
      background: rgba(15, 23, 42, 0.85);
      color: #cbd5e1;
      border: 1px solid rgba(51, 65, 85, 0.7);
    }
    .btn-secondary:hover {
      background: rgba(30, 41, 59, 0.95);
      color: #ffffff;
    }
    .btn-active {
      background: rgba(5, 150, 105, 0.9) !important;
      color: #ffffff !important;
      border-color: rgba(110, 231, 183, 0.4) !important;
    }
    /* 하단 안내 배너 */
    .hint-banner {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(51, 65, 85, 0.6);
      border-radius: 30px;
      padding: 8px 20px;
      font-size: 12px;
      color: #cbd5e1;
      pointer-events: none;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .hint-banner strong {
      color: #fcd34d;
    }
    /* 카메라 모달 오버레이 */
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(4, 9, 22, 0.85);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-overlay.open {
      display: flex;
    }
    .modal-dialog {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 24px;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }
    .modal-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
    }
    .modal-close:hover {
      color: #fff;
      background: #1e293b;
    }
    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .video-viewport {
      position: relative;
      width: 380px;
      height: 380px;
      max-width: 100%;
      background: #000;
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #webcam-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1); /* 거울 모드 */
    }
    /* 도안 가이드 박스 */
    .guide-box {
      position: absolute;
      width: 250px;
      height: 250px;
      border: 4px dashed #34d399;
      border-radius: 20px;
      box-shadow: 0 0 20px rgba(52, 211, 153, 0.4);
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .countdown-display {
      font-size: 80px;
      font-weight: 900;
      color: #fcd34d;
      text-shadow: 0 0 25px rgba(251, 191, 36, 0.9);
      display: none;
    }
    .guide-tip {
      position: absolute;
      bottom: 14px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 11px;
      color: #6ee7b7;
      font-weight: 600;
      pointer-events: none;
    }
    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid #1e293b;
      display: flex;
      gap: 10px;
      width: 100%;
    }
    .sample-bar {
      display: flex;
      gap: 6px;
      justify-content: center;
      width: 100%;
      margin-top: 4px;
    }
    .sample-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #e2e8f0;
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 10px;
      cursor: pointer;
    }
    .sample-btn:hover {
      background: #334155;
      color: #fff;
    }
  </style>
</head>
<body>
  <!-- ========================================================
       [HTML 구조] 메인 캔버스, 헤더 및 모달 UI
       ======================================================== -->
  <canvas id="village-canvas"></canvas>

  <header>
    <div class="brand-card">
      <div class="tree-icon">🎄</div>
      <div>
        <div class="brand-title">
          빛나는 크리스마스 마을
          <span class="brand-subtitle">(내가 그린 그림이 살아나요)</span>
        </div>
        <div class="brand-counter">
          마을 친구들: <span id="char-count">0</span> / 10명 (최대 10명 정원)
        </div>
      </div>
    </div>

    <div class="btn-group">
      <button class="btn btn-primary" id="btn-open-camera">
        📷 그림 소환하기 (Space)
      </button>
      <button class="btn btn-secondary" id="btn-toggle-bgm">
        🎵 BGM OFF
      </button>
      <button class="btn btn-secondary" id="btn-clean-village">
        🧹 마을 청소
      </button>
    </div>
  </header>

  <div class="hint-banner">
    <span>👆 <strong>캐릭터를 클릭</strong>하면 뿅! 점프하며 크리스마스 인사를 건넵니다</span>
    <span>·</span>
    <span>[스페이스바]를 눌러 언제든 새 그림을 소환하세요</span>
  </div>

  <!-- 카메라 캡처 모달 -->
  <div class="modal-overlay" id="camera-modal">
    <div class="modal-dialog">
      <div class="modal-header">
        <div class="modal-title">🎨 내가 그린 그림 소환하기</div>
        <button class="modal-close" id="btn-close-modal">✕</button>
      </div>

      <div class="modal-body">
        <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 10px; background: rgba(15,23,42,0.6); padding: 8px 12px; border-radius: 12px; border: 1px solid rgba(51,65,85,0.7);">
          <span style="font-size: 11px; font-weight: 700; color: #fcd34d;">친구이름</span>
          <input type="text" id="creator-name-input" placeholder="예: 민준이" maxlength="10" style="width: 170px; background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 5px 8px; color: #fff; font-size: 11px; outline: none; text-align: center;">
        </div>

        <div class="video-viewport">
          <video id="webcam-video" autoplay playsinline muted></video>
          <div class="guide-box">
            <div class="countdown-display" id="countdown-text">3</div>
          </div>
          <div class="guide-tip">✨ 네모 박스 안에 그린 그림을 비춰주세요!</div>
        </div>

        <div style="font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 8px;">
          <span>종이 투명화 감도:</span>
          <input type="range" id="threshold-range" min="180" max="240" value="215" style="width: 120px;">
          <span id="threshold-val">215</span>
        </div>

        <div class="sample-bar">
          <span style="font-size: 11px; color: #64748b; line-height: 24px;">빠른 샘플 도안:</span>
          <button class="sample-btn" data-sample="santa">산타 🎅</button>
          <button class="sample-btn" data-sample="rudolph">루돌프 🦌</button>
          <button class="sample-btn" data-sample="snowman">눈사람 ⛄</button>
          <button class="sample-btn" data-sample="tree">트리 🎄</button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-primary" id="btn-capture-timer" style="flex: 2; justify-content: center;">
          찰칵! 소환하기 (3초 타이머)
        </button>
        <button class="btn btn-secondary" id="btn-capture-instant" style="flex: 1; justify-content: center;">
          즉시 소환
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================================
       [JavaScript] 오디오 신디사이저, 픽셀 루마키, 캔버스 렌더러
       ======================================================== -->
  <script>
    /* ========================================================
       1. Web Audio API 신디사이저 (외부 오디오 파일 없는 자체 합성)
       ======================================================== */
    class ChristmasSoundEngine {
      constructor() {
        this.ctx = null;
        this.isBgmOn = false;
        this.bgmTimer = null;
        this.bgmStep = 0;
      }

      getCtx() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        return this.ctx;
      }

      // 카메라 셔터음 ("찰칵!")
      playShutter() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        const bufferSize = ctx.sampleRate * 0.04;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.04);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);

        // 2차 기계 클릭음
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.09);
        oscGain.gain.setValueAtTime(0.5, now + 0.05);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now + 0.05);
        osc.stop(now + 0.11);
      }

      // 소환 마법 아르페지오 차임벨 ("뾰로롱!")
      playSpawnChime() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        const notes = [1046.5, 1318.5, 1567.98, 1975.53, 2093.0, 2637.0]; // C6 ~ E7
        notes.forEach((freq, idx) => {
          const t = now + idx * 0.06;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.46);
        });
      }

      // 캐릭터 클릭/점프 ("포롱 / 보잉!")
      playBoing() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.25);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }

      // 눈꽃 소멸 및 청소음 ("샤르르~")
      playDissolve() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        [1760, 1396, 1174, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          gain.gain.setValueAtTime(0.12, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.32);
        });
      }

      // 카운트다운 삑 소리
      playBeep(isFinal = false) {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isFinal ? 880 : 523, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.2 : 0.1));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + (isFinal ? 0.22 : 0.12));
      }

      // BGM (실로폰/글로켄슈필 톤 징글벨 캐롤 루프)
      toggleBGM() {
        this.isBgmOn = !this.isBgmOn;
        if (this.isBgmOn) {
          this.bgmStep = 0;
          this.playBGMSequence();
        } else {
          if (this.bgmTimer) clearTimeout(this.bgmTimer);
        }
        return this.isBgmOn;
      }

      playBGMSequence() {
        if (!this.isBgmOn) return;
        const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, REST = 0;
        const melody = [
          { f: E5, d: 1 }, { f: E5, d: 1 }, { f: E5, d: 2 },
          { f: E5, d: 1 }, { f: E5, d: 1 }, { f: E5, d: 2 },
          { f: E5, d: 1 }, { f: G5, d: 1 }, { f: C5, d: 1.5 }, { f: D5, d: 0.5 },
          { f: E5, d: 4 },
          { f: F5, d: 1 }, { f: F5, d: 1 }, { f: F5, d: 1.5 }, { f: F5, d: 0.5 },
          { f: F5, d: 1 }, { f: E5, d: 1 }, { f: E5, d: 1 }, { f: E5, d: 0.5 }, { f: E5, d: 0.5 },
          { f: E5, d: 1 }, { f: D5, d: 1 }, { f: D5, d: 1 }, { f: E5, d: 1 },
          { f: D5, d: 2 }, { f: G5, d: 2 },
          // 2절
          { f: E5, d: 1 }, { f: E5, d: 1 }, { f: E5, d: 2 },
          { f: E5, d: 1 }, { f: E5, d: 1 }, { f: E5, d: 2 },
          { f: E5, d: 1 }, { f: G5, d: 1 }, { f: C5, d: 1.5 }, { f: D5, d: 0.5 },
          { f: E5, d: 4 },
          { f: F5, d: 1 }, { f: F5, d: 1 }, { f: F5, d: 1.5 }, { f: F5, d: 0.5 },
          { f: F5, d: 1 }, { f: E5, d: 1 }, { f: E5, d: 1 }, { f: E5, d: 0.5 }, { f: E5, d: 0.5 },
          { f: G5, d: 1 }, { f: G5, d: 1 }, { f: F5, d: 1 }, { f: D5, d: 1 },
          { f: C5, d: 3 }, { f: REST, d: 1 }
        ];

        const note = melody[this.bgmStep];
        const beatMs = 280;
        const durMs = note.d * beatMs;

        if (note.f > 0) {
          const ctx = this.getCtx();
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, now);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.18, now + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.45, durMs / 1000));
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.46);
        }

        this.bgmStep = (this.bgmStep + 1) % melody.length;
        this.bgmTimer = setTimeout(() => this.playBGMSequence(), durMs);
      }
    }

    const sound = new ChristmasSoundEngine();

    /* ========================================================
       2. 이미지 처리 및 루마키 (Luma-key) 배경 투명화 로직
       ======================================================== */
    function removePaperBackground(sourceCanvas, threshold = 200, feather = 14) {
      const w = sourceCanvas.width;
      const h = sourceCanvas.height;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(sourceCanvas, 0, 0);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const borderMarginX = Math.max(6, Math.floor(w * 0.08));
      const borderMarginY = Math.max(6, Math.floor(h * 0.08));

      let paperSamplesR = 0, paperSamplesG = 0, paperSamplesB = 0, sampleCount = 0;
      const lumaSamples = [];

      for (let y = 0; y < h; y += 3) {
        for (let x = 0; x < w; x += 3) {
          const isBorder = x < borderMarginX || x >= w - borderMarginX || y < borderMarginY || y >= h - borderMarginY;
          if (!isBorder) continue;

          const idx = (y * w + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          if (a < 50) continue;

          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const chroma = Math.max(r, g, b) - Math.min(r, g, b);

          if (luma > 85 && chroma < 65) {
            lumaSamples.push(luma);
            paperSamplesR += r; paperSamplesG += g; paperSamplesB += b;
            sampleCount++;
          }
        }
      }

      let detectedPaperLuma = 220;
      let paperR = 230, paperG = 230, paperB = 225;

      if (sampleCount > 20 && lumaSamples.length > 0) {
        lumaSamples.sort((a, b) => a - b);
        detectedPaperLuma = lumaSamples[Math.floor(lumaSamples.length * 0.75)];
        paperR = Math.round(paperSamplesR / sampleCount);
        paperG = Math.round(paperSamplesG / sampleCount);
        paperB = Math.round(paperSamplesB / sampleCount);
      }

      const paperChroma = Math.max(paperR, paperG, paperB) - Math.min(paperR, paperG, paperB);
      const sensitivityOffset = (threshold - 200) * 0.45;
      const effectiveThreshold = Math.max(90, Math.min(245, detectedPaperLuma - 18 - sensitivityOffset));

      const totalPixels = w * h;
      const isBackground = new Uint8Array(totalPixels);
      const queue = new Int32Array(totalPixels);
      let queueHead = 0, queueTail = 0;

      const isPaperPixel = (r, g, b, luma, chroma) => {
        const dr = r - paperR, dg = g - paperG, db = b - paperB;
        if (dr * dr + dg * dg + db * db < 52 * 52) return true;
        if (luma >= effectiveThreshold && chroma <= Math.max(48, paperChroma + 22)) return true;
        if (luma >= effectiveThreshold - 26 && chroma <= Math.max(34, paperChroma + 12) && (dr * dr + dg * dg + db * db < 68 * 68)) return true;
        return false;
      };

      for (let x = 0; x < w; x++) {
        const iTop = x;
        const pT = iTop * 4;
        const lT = 0.299 * data[pT] + 0.587 * data[pT + 1] + 0.114 * data[pT + 2];
        const cT = Math.max(data[pT], data[pT + 1], data[pT + 2]) - Math.min(data[pT], data[pT + 1], data[pT + 2]);
        if (isPaperPixel(data[pT], data[pT + 1], data[pT + 2], lT, cT)) {
          isBackground[iTop] = 1; queue[queueTail++] = iTop;
        }

        const iBot = (h - 1) * w + x;
        const pB = iBot * 4;
        const lB = 0.299 * data[pB] + 0.587 * data[pB + 1] + 0.114 * data[pB + 2];
        const cB = Math.max(data[pB], data[pB + 1], data[pB + 2]) - Math.min(data[pB], data[pB + 1], data[pB + 2]);
        if (isPaperPixel(data[pB], data[pB + 1], data[pB + 2], lB, cB)) {
          isBackground[iBot] = 1; queue[queueTail++] = iBot;
        }
      }

      for (let y = 1; y < h - 1; y++) {
        const iL = y * w;
        const pL = iL * 4;
        const lL = 0.299 * data[pL] + 0.587 * data[pL + 1] + 0.114 * data[pL + 2];
        const cL = Math.max(data[pL], data[pL + 1], data[pL + 2]) - Math.min(data[pL], data[pL + 1], data[pL + 2]);
        if (isPaperPixel(data[pL], data[pL + 1], data[pL + 2], lL, cL)) {
          isBackground[iL] = 1; queue[queueTail++] = iL;
        }

        const iR = y * w + (w - 1);
        const pR = iR * 4;
        const lR = 0.299 * data[pR] + 0.587 * data[pR + 1] + 0.114 * data[pR + 2];
        const cR = Math.max(data[pR], data[pR + 1], data[pR + 2]) - Math.min(data[pR], data[pR + 1], data[pR + 2]);
        if (isPaperPixel(data[pR], data[pR + 1], data[pR + 2], lR, cR)) {
          isBackground[iR] = 1; queue[queueTail++] = iR;
        }
      }

      while (queueHead < queueTail) {
        const curIdx = queue[queueHead++];
        const cx = curIdx % w;
        const cy = Math.floor(curIdx / w);

        const neighbors = [
          cy > 0 ? curIdx - w : -1,
          cy < h - 1 ? curIdx + w : -1,
          cx > 0 ? curIdx - 1 : -1,
          cx < w - 1 ? curIdx + 1 : -1,
        ];

        for (let k = 0; k < 4; k++) {
          const nIdx = neighbors[k];
          if (nIdx !== -1 && isBackground[nIdx] === 0) {
            const p = nIdx * 4;
            const r = data[p], g = data[p + 1], b = data[p + 2];
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);

            if (isPaperPixel(r, g, b, luma, chroma)) {
              isBackground[nIdx] = 1; queue[queueTail++] = nIdx;
            }
          }
        }
      }

      let minX = w, minY = h, maxX = 0, maxY = 0;
      let hasDrawnPixels = false;

      for (let i = 0; i < totalPixels; i++) {
        const p = i * 4;
        const a = data[p + 3];
        if (a < 10) continue;

        const r = data[p], g = data[p + 1], b = data[p + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);

        let finalAlpha = a;

        if (isBackground[i] === 1) {
          finalAlpha = 0;
        } else {
          if (chroma < Math.max(34, paperChroma + 10)) {
            if (luma >= effectiveThreshold) {
              finalAlpha = 0;
            } else if (luma > effectiveThreshold - feather) {
              finalAlpha = Math.floor(a * Math.max(0, Math.min(1, (effectiveThreshold - luma) / feather)));
            }
          } else {
            if (luma > 248 && chroma < 35) finalAlpha = 0;
          }
        }

        data[p + 3] = finalAlpha;

        if (finalAlpha > 35) {
          const x = i % w;
          const y = Math.floor(i / w);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasDrawnPixels = true;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      if (!hasDrawnPixels || maxX <= minX || maxY <= minY) {
        minX = Math.floor(w * 0.15); maxX = Math.floor(w * 0.85);
        minY = Math.floor(h * 0.15); maxY = Math.floor(h * 0.85);
      }

      const pad = 8;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(w - cropX, maxX - minX + pad * 2);
      const cropH = Math.min(h - cropY, maxY - minY + pad * 2);

      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = cropW;
      spriteCanvas.height = cropH;
      const sCtx = spriteCanvas.getContext('2d');
      sCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      return spriteCanvas;
    }

    // 내장 샘플 도안 생성기
    function createSampleDrawing(type) {
      const size = 300;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (type === 'santa') {
        // 얼굴 먼저 그림 (모자가 이마 위에 얹히도록)
        ctx.fillStyle = '#FFD5B4'; ctx.beginPath(); ctx.arc(150, 118, 36, 0, Math.PI * 2); ctx.fill();
        // 모자
        ctx.fillStyle = '#E53935';
        ctx.beginPath();
        ctx.moveTo(105, 95); ctx.quadraticCurveTo(125, 20, 185, 30); ctx.quadraticCurveTo(225, 48, 215, 92); ctx.lineTo(195, 92); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(218, 96, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.roundRect(95, 82, 110, 22, 11); ctx.fill();
        // 눈 & 코 & 수염
        ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(138, 112, 4, 0, Math.PI * 2); ctx.arc(162, 112, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#E53935'; ctx.beginPath(); ctx.arc(150, 122, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.beginPath();
        ctx.moveTo(115, 125); ctx.quadraticCurveTo(110, 185, 150, 195); ctx.quadraticCurveTo(190, 185, 185, 125); ctx.closePath();
        ctx.fill();
        // 다리 & 부츠 (전신)
        ctx.fillStyle = '#C62828'; ctx.fillRect(122, 235, 22, 35); ctx.fillRect(156, 235, 22, 35);
        ctx.fillStyle = '#212121'; ctx.fillRect(116, 260, 30, 20); ctx.fillRect(154, 260, 30, 20);
        ctx.fillStyle = '#FFF'; ctx.fillRect(115, 256, 32, 8); ctx.fillRect(153, 256, 32, 8);
        // 옷 & 벨트
        ctx.fillStyle = '#D32F2F'; ctx.fillRect(105, 165, 90, 75);
        ctx.fillStyle = '#FFF'; ctx.fillRect(100, 230, 100, 12);
        ctx.fillStyle = '#212121'; ctx.fillRect(105, 198, 90, 14);
        ctx.fillStyle = '#FBC02D'; ctx.fillRect(138, 194, 24, 22);
        // 팔 & 장갑
        ctx.fillStyle = '#D32F2F'; ctx.fillRect(78, 170, 30, 18); ctx.fillRect(192, 170, 30, 18);
        ctx.fillStyle = '#2E7D32'; ctx.beginPath(); ctx.arc(72, 179, 11, 0, Math.PI * 2); ctx.arc(228, 179, 11, 0, Math.PI * 2); ctx.fill();
      } else if (type === 'rudolph') {
        // 루돌프 (전신)
        // 다리 & 굽
        ctx.fillStyle = '#795548'; ctx.fillRect(118, 230, 16, 42); ctx.fillRect(166, 230, 16, 42);
        ctx.fillStyle = '#A1887F'; ctx.fillRect(132, 235, 16, 42); ctx.fillRect(152, 235, 16, 42);
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(116, 264, 20, 12); ctx.fillRect(164, 264, 20, 12);
        ctx.fillRect(130, 268, 20, 12); ctx.fillRect(150, 268, 20, 12);
        // 몸통 & 꼬리
        ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(150, 205, 46, 38, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#EFEBE9'; ctx.beginPath(); ctx.ellipse(150, 210, 28, 24, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.arc(106, 195, 10, 0, Math.PI * 2); ctx.fill();
        // 뿔 & 귀
        ctx.strokeStyle = '#3E2723'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(125, 95); ctx.lineTo(105, 50); ctx.lineTo(92, 62); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(175, 95); ctx.lineTo(195, 50); ctx.lineTo(208, 62); ctx.stroke();
        ctx.fillStyle = '#A1887F'; ctx.beginPath(); ctx.ellipse(108, 105, 12, 20, -0.5, 0, Math.PI * 2); ctx.ellipse(192, 105, 12, 20, 0.5, 0, Math.PI * 2); ctx.fill();
        // 얼굴 & 눈 & 코
        ctx.fillStyle = '#BCAAA4'; ctx.beginPath(); ctx.ellipse(150, 125, 42, 46, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#EFEBE9'; ctx.beginPath(); ctx.ellipse(150, 142, 30, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(136, 116, 5, 0, Math.PI * 2); ctx.arc(164, 116, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF1744'; ctx.beginPath(); ctx.arc(150, 138, 12, 0, Math.PI * 2); ctx.fill();
        // 목도리
        ctx.fillStyle = '#2E7D32'; ctx.fillRect(115, 164, 70, 18);
        ctx.fillStyle = '#C62828'; ctx.fillRect(130, 164, 10, 18); ctx.fillRect(158, 164, 10, 18);
      } else if (type === 'snowman') {
        // 눈사람
        ctx.fillStyle = '#37474F'; ctx.fillRect(125, 50, 50, 35); ctx.fillRect(110, 80, 80, 10);
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(150, 130, 40, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(135, 120, 4, 0, Math.PI * 2); ctx.arc(165, 120, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF9800'; ctx.beginPath(); ctx.moveTo(150, 128); ctx.lineTo(180, 135); ctx.lineTo(150, 140); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#E53935'; ctx.fillRect(115, 160, 70, 16);
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(150, 225, 55, 0, Math.PI * 2); ctx.fill();
      } else {
        // 트리
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(150, 50, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath(); ctx.moveTo(150, 60); ctx.lineTo(195, 115); ctx.lineTo(105, 115); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(150, 100); ctx.lineTo(215, 170); ctx.lineTo(85, 170); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(150, 150); ctx.lineTo(235, 235); ctx.lineTo(65, 235); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5D4037'; ctx.fillRect(135, 235, 30, 35);
      }
      return cropTransparentCanvas(canvas);
    }

    function cropTransparentCanvas(c) {
      const w = c.width, h = c.height;
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = 0, maxY = 0, has = false;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 15) {
          const idx = i / 4;
          const x = idx % w, y = Math.floor(idx / w);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          has = true;
        }
      }
      if (!has) { minX = 0; minY = 0; maxX = w; maxY = h; }
      const pad = 6;
      const cx = Math.max(0, minX - pad), cy = Math.max(0, minY - pad);
      const cw = Math.min(w - cx, maxX - minX + pad * 2);
      const ch = Math.min(h - cy, maxY - minY + pad * 2);
      const out = document.createElement('canvas');
      out.width = cw; out.height = ch;
      out.getContext('2d').drawImage(c, cx, cy, cw, ch, 0, 0, cw, ch);
      return out;
    }

    /* ========================================================
       3. 메인 인터랙티브 캔버스 월드 시뮬레이션
       ======================================================== */
    const canvas = document.getElementById('village-canvas');
    const ctx = canvas.getContext('2d');
    const charCountEl = document.getElementById('char-count');

    let width = window.innerWidth;
    let height = window.innerHeight;
    let characters = [];
    let particles = [];
    let stars = [];
    let snowflakes = [];

    const GREETINGS = [
      '🎄 메리 크리스마스! 🎅',
      '🎁 행복한 성탄절이에요!',
      '⭐ 반짝반짝 빛나요!',
      '⛄ 나랑 눈싸움 할래?',
      '🦌 루돌프와 함께 달려요!'
    ];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);

      stars = [];
      for (let i = 0; i < 70; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.65),
          r: Math.random() * 1.8 + 0.6,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.04 + 0.015
        });
      }

      snowflakes = [];
      for (let i = 0; i < 60; i++) {
        snowflakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 3 + 1,
          speedY: Math.random() * 1.2 + 0.8,
          swayAmp: Math.random() * 1.5 + 0.5,
          phase: Math.random() * Math.PI * 2,
          alpha: Math.random() * 0.6 + 0.4
        });
      }
    }
    window.addEventListener('resize', resize);
    resize();

    function getGroundY(x) {
      return height - 110 + Math.sin((x / width) * Math.PI * 2.2) * 24 + Math.cos((x / width) * Math.PI * 4.5) * 12;
    }

    function spawnStarBurst(x, y) {
      const colors = ['#FFE082', '#FFD54F', '#FFF59D', '#FFFFFF', '#80D8FF'];
      for (let i = 0; i < 35; i++) {
        const ang = (Math.PI * 2 * i) / 35 + (Math.random() - 0.5) * 0.3;
        const spd = Math.random() * 5 + 2.5;
        particles.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.5,
          size: Math.random() * 8 + 4,
          alpha: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: 40,
          type: 'star'
        });
      }
    }

    function addCharacter(spriteCanvas, creatorName = '') {
      sound.playSpawnChime();
      const baseW = 230; // 소환 캐릭터 2배 확대 (230px)
      const aspect = spriteCanvas.width / (spriteCanvas.height || 1);
      const w = baseW;
      const h = w / aspect;
      const sx = width * (0.3 + Math.random() * 0.4);
      const sy = height * 0.22;

      // FIFO 10개 정원 관리: 11번째는 1번 캐릭터 소멸
      const active = characters.filter(c => c.state !== 'dissolving');
      if (active.length >= 10) {
        active[0].state = 'dissolving';
        active[0].dissolveProgress = 0;
        sound.playDissolve();
      }

      spawnStarBurst(sx, sy);

      characters.push({
        id: Date.now() + Math.random(),
        sprite: spriteCanvas,
        w, h,
        x: sx, y: sy,
        vx: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.6 + 0.9),
        vy: 0,
        state: 'spawning',
        spawnProgress: 0,
        startX: sx, startY: sy,
        facingLeft: Math.random() > 0.5,
        walkStep: Math.random() * Math.PI,
        wobble: 0,
        bounce: 0,
        hopCooldown: 3,
        speech: null,
        dissolveProgress: 0,
        creatorName: creatorName ? creatorName.trim() : ''
      });
      updateCount();
    }

    function updateCount() {
      const cnt = characters.filter(c => c.state !== 'dissolving').length;
      charCountEl.innerText = cnt;
    }

    // 메인 애니메이션 루프
    let lastT = performance.now();
    function animate(now) {
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;

      // 1. 밤하늘
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#040916');
      sky.addColorStop(0.4, '#0A1832');
      sky.addColorStop(1, '#1C355E');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // 달
      const mx = width * 0.84, my = height * 0.16;
      ctx.fillStyle = '#FFF8E1';
      ctx.beginPath(); ctx.arc(mx, my, 36, 0, Math.PI * 2); ctx.fill();

      // 별
      stars.forEach(s => {
        s.phase += s.speed;
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.phase));
        ctx.fillStyle = 'rgba(255, 255, 255, ' + a + ')';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      });

      // 설산 & 언덕
      ctx.fillStyle = '#223656';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.76);
      ctx.quadraticCurveTo(width * 0.3, height * 0.68, width * 0.6, height * 0.77);
      ctx.quadraticCurveTo(width * 0.85, height * 0.82, width, height * 0.73);
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();

      // 눈 바닥
      const snowGrad = ctx.createLinearGradient(0, height - 150, 0, height);
      snowGrad.addColorStop(0, '#E8F1F8');
      snowGrad.addColorStop(1, '#98B8D8');
      ctx.fillStyle = snowGrad;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 15) {
        ctx.lineTo(x, getGroundY(x));
      }
      ctx.lineTo(width, height); ctx.fill();

      // 파티클
      particles = particles.filter(p => {
        p.life++;
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.1;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.alpha <= 0.01) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      // 캐릭터 원근 깊이 및 주인공 부각 계산
      const activeList = characters.filter(c => c.state !== 'dissolving');
      const totActive = activeList.length;
      activeList.forEach((c, idx) => {
        const rank = totActive - 1 - idx;
        const targetScale = rank === 0 ? 1.0 : Math.max(0.62, 1.0 - rank * 0.09);
        const targetYOff = rank === 0 ? 0 : -Math.min(50, rank * 13);
        if (c.depthScale === undefined) c.depthScale = targetScale;
        if (c.depthYOffset === undefined) c.depthYOffset = targetYOff;
        c.depthScale += (targetScale - c.depthScale) * dt * 2.8;
        c.depthYOffset += (targetYOff - c.depthYOffset) * dt * 2.8;
        c.isNewest = rank === 0;
      });

      characters = characters.filter(c => {
        const currentScale = c.depthScale || 1.0;
        const gy = getGroundY(c.x) - (c.h * currentScale) * 0.42 + (c.depthYOffset || 0);

        if (c.state === 'spawning') {
          c.spawnProgress += dt * 1.0;
          const t = Math.min(1, c.spawnProgress);
          c.y = c.startY + (gy - c.startY) * (t * (2 - t));
          c.x = c.startX + Math.sin(t * Math.PI * 4) * 25;
          c.wobble = Math.sin(t * Math.PI * 5) * 0.15;
          if (t >= 1) {
            c.state = 'walking';
            c.y = gy;
          }
        } else if (c.state === 'walking' || c.state === 'jumping') {
          c.x += c.vx;
          const margin = (c.w * currentScale) * 0.55;
          if (c.x < margin) { c.x = margin; c.vx = Math.abs(c.vx); c.facingLeft = false; }
          if (c.x > width - margin) { c.x = width - margin; c.vx = -Math.abs(c.vx); c.facingLeft = true; }

          c.walkStep += dt * 5.2;
          c.wobble = Math.sin(c.walkStep) * 0.14;
          c.bounce = Math.abs(Math.sin(c.walkStep * 2)) * (6 * currentScale);

          c.vy += 32 * dt;
          c.y += c.vy;
          if (c.y >= gy) {
            c.y = gy;
            c.vy = 0;
            if (c.state === 'jumping') c.state = 'walking';
          }
        } else if (c.state === 'dissolving') {
          c.dissolveProgress += dt * 1.5;
          if (c.dissolveProgress >= 1) {
            updateCount();
            return false;
          }
        }

        // 말풍선
        if (c.speech) {
          c.speech.time -= dt;
          c.speech.yOffset += dt * 18;
          if (c.speech.time <= 0) c.speech = null;
        }

        // 그리기
        ctx.save();
        let scale = currentScale, alpha = 1.0;
        if (c.state === 'spawning') {
          scale = (1.8 - 0.8 * (c.spawnProgress * c.spawnProgress)) * currentScale;
          alpha = Math.min(1, c.spawnProgress * 2);
        } else if (c.state === 'dissolving') {
          scale = Math.max(0.2, 1 - c.dissolveProgress * 0.8) * currentScale;
          alpha = Math.max(0, 1 - c.dissolveProgress);
        }

        ctx.globalAlpha = alpha;
        ctx.translate(c.x, c.y - c.bounce);
        if (c.facingLeft) ctx.scale(-1, 1);
        ctx.rotate(c.wobble);
        ctx.scale(scale, scale);

        ctx.save();
        ctx.shadowColor = c.isNewest ? 'rgba(255, 245, 180, 0.95)' : 'rgba(255, 255, 255, 0.40)';
        ctx.shadowBlur = c.isNewest ? 20 : 8;
        ctx.drawImage(c.sprite, -c.w * 0.5, -c.h * 0.5, c.w, c.h);
        ctx.restore();
        ctx.restore();

        // 이름표 렌더링 (빈칸이면 미표시)
        const hasName = Boolean(c.creatorName && c.creatorName.trim());
        if (hasName && c.state !== 'dissolving') {
          ctx.save();
          const nameTxt = c.creatorName.trim();
          ctx.font = 'bold 12px sans-serif';
          const ntw = ctx.measureText(nameTxt).width;
          const nx = c.x, ny = c.y - c.bounce - (c.h * currentScale) * 0.5 - 12;
          ctx.fillStyle = c.isNewest ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.78)';
          ctx.beginPath();
          ctx.roundRect(nx - (ntw + 24) * 0.5, ny - 10, ntw + 24, 20, 10);
          ctx.fill();
          ctx.strokeStyle = c.isNewest ? '#fbbf24' : 'rgba(255,255,255,0.4)';
          ctx.lineWidth = c.isNewest ? 1.5 : 1;
          ctx.stroke();
          ctx.fillStyle = c.isNewest ? '#fde047' : '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🏷️ ' + nameTxt, nx, ny);
          ctx.restore();
        }

        // 말풍선 렌더링
        if (c.speech && c.state !== 'dissolving') {
          ctx.save();
          const by = c.y - c.bounce - (c.h * currentScale) * 0.5 - (hasName ? 34 : 14) - c.speech.yOffset;
          const bx = c.x;
          ctx.font = 'bold 14px sans-serif';
          const tw = ctx.measureText(c.speech.text).width;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(bx - (tw + 20) * 0.5, by - 30, tw + 20, 30, 12);
          ctx.fill();
          ctx.fillStyle = '#B71C1C';
          ctx.textAlign = 'center';
          ctx.fillText(c.speech.text, bx, by - 10);
          ctx.restore();
        }

        return true;
      });

      // 내리는 눈송이
      snowflakes.forEach(f => {
        f.phase += 0.02;
        f.x += Math.sin(f.phase) * f.swayAmp;
        f.y += f.speedY;
        if (f.y > height + 10) { f.y = -10; f.x = Math.random() * width; }
        ctx.fillStyle = 'rgba(255, 255, 255, ' + f.alpha + ')';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      });

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // 캐릭터 클릭 상호작용
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      for (let i = characters.length - 1; i >= 0; i--) {
        const c = characters[i];
        if (c.state === 'dissolving') continue;
        if (Math.abs(cx - c.x) < c.w * 0.6 && Math.abs(cy - (c.y - c.bounce)) < c.h * 0.6) {
          c.state = 'jumping';
          c.vy = -12.5;
          sound.playBoing();
          c.speech = {
            text: GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
            time: 2.2,
            yOffset: 0
          };
          break;
        }
      }
    });

    /* ========================================================
       4. 웹캠 및 UI 이벤트 제어
       ======================================================== */
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('webcam-video');
    const countdownText = document.getElementById('countdown-text');
    let stream = null;

    async function openModal() {
      modal.classList.add('open');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = stream;
      } catch (err) {
        alert('카메라를 찾을 수 없습니다. 하단 샘플 도안으로 체험할 수 있습니다!');
      }
    }

    function closeModal() {
      modal.classList.remove('open');
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
      video.srcObject = null;
      countdownText.style.display = 'none';
    }

    function captureGuideArea() {
      sound.playShutter();
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const boxSize = Math.min(vw, vh) * 0.68;
      const sx = (vw - boxSize) / 2;
      const sy = (vh - boxSize) / 2;

      const c = document.createElement('canvas');
      c.width = 450; c.height = 450;
      const cCtx = c.getContext('2d');
      // 거울 반전 보정
      cCtx.translate(450, 0);
      cCtx.scale(-1, 1);
      cCtx.drawImage(video, sx, sy, boxSize, boxSize, 0, 0, 450, 450);

      const threshold = parseInt(document.getElementById('threshold-range').value);
      const sprite = removePaperBackground(c, threshold, 14);
      const nameInput = document.getElementById('creator-name-input');
      const creatorName = nameInput ? nameInput.value : '';
      addCharacter(sprite, creatorName);
      if (nameInput) nameInput.value = '';
      closeModal();
    }

    document.getElementById('btn-open-camera').onclick = openModal;
    document.getElementById('btn-close-modal').onclick = closeModal;

    // 3초 카운트다운 캡처
    document.getElementById('btn-capture-timer').onclick = () => {
      countdownText.style.display = 'block';
      let cnt = 3;
      countdownText.innerText = cnt;
      sound.playBeep(false);
      const timer = setInterval(() => {
        cnt--;
        if (cnt > 0) {
          countdownText.innerText = cnt;
          sound.playBeep(false);
        } else {
          clearInterval(timer);
          countdownText.style.display = 'none';
          sound.playBeep(true);
          captureGuideArea();
        }
      }, 1000);
    };

    document.getElementById('btn-capture-instant').onclick = captureGuideArea;

    // 샘플 도안 버튼들
    document.querySelectorAll('.sample-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.sample;
        const sprite = createSampleDrawing(type);
        const nameInput = document.getElementById('creator-name-input');
        const creatorName = nameInput ? nameInput.value : '';
        addCharacter(sprite, creatorName);
        if (nameInput) nameInput.value = '';
        closeModal();
      };
    });

    // BGM 토글
    document.getElementById('btn-toggle-bgm').onclick = () => {
      const on = sound.toggleBGM();
      const btn = document.getElementById('btn-toggle-bgm');
      btn.innerText = on ? '🎵 BGM ON' : '🎵 BGM OFF';
      btn.classList.toggle('btn-active', on);
    };

    // 마을 청소
    document.getElementById('btn-clean-village').onclick = () => {
      if (confirm('모든 그림 친구들을 눈꽃으로 돌려보낼까요?')) {
        sound.playDissolve();
        characters.forEach(c => {
          c.state = 'dissolving';
          c.dissolveProgress = 0;
        });
      }
    };

    // 키보드 단축키 (스페이스바)
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' && !modal.classList.contains('open')) {
        e.preventDefault();
        openModal();
      } else if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });

    // 슬라이더 레이블 갱신
    document.getElementById('threshold-range').oninput = (e) => {
      document.getElementById('threshold-val').innerText = e.target.value;
    };

    // 시작 시 기본 산타, 루돌프 소환
    setTimeout(() => addCharacter(createSampleDrawing('santa')), 600);
    setTimeout(() => addCharacter(createSampleDrawing('rudolph')), 1300);
  </script>
</body>
</html>`;
}
