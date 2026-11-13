/**
 * Web Audio API 기반 순수 신디사이저 사운드 엔진
 * 외부 오디오 파일(MP3, WAV 등) 없이 코드로 모든 음색 및 효과음을 생성합니다.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private bgmTimeoutId: number | null = null;
  private bgmStep: number = 0;

  // AudioContext 초기화 (사용자 인터랙션 시 자동 호출)
  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ==========================================
  // 1. 효과음: 카메라 셔터음 ("찰칵!")
  // ==========================================
  public playShutter(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // 1단계: 셔터 미러 업 (짧은 노이즈 버스트)
    const bufferSize = ctx.sampleRate * 0.05; // 50ms
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // 2단계: 기계식 셔터 닫힘 클릭음 (60ms 후)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(600, now + 0.06);
    clickOsc.frequency.exponentialRampToValueAtTime(80, now + 0.11);

    clickGain.gain.setValueAtTime(0.6, now + 0.06);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now + 0.06);
    clickOsc.stop(now + 0.13);
  }

  // ==========================================
  // 2. 효과음: 캐릭터 소환 마법 차임벨 ("뾰로롱!")
  // ==========================================
  public playSpawnChime(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // 밝고 영롱한 마법 아르페지오 (C6 -> E6 -> G6 -> B6 -> C7 -> E7)
    const notes = [1046.5, 1318.5, 1567.98, 1975.53, 2093.0, 2637.0];
    const stepDuration = 0.065; // 각 음 간격

    notes.forEach((freq, idx) => {
      const startTime = now + idx * stepDuration;

      // 주음 (맑은 사인파)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // 배음 (영롱함을 더하는 2배수 오버톤)
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2, startTime);

      const duration = 0.5;
      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      overtoneGain.gain.setValueAtTime(0.12, startTime);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.7);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(ctx.destination);
      overtoneGain.connect(ctx.destination);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + duration);
      overtone.stop(startTime + duration);
    });
  }

  // ==========================================
  // 3. 효과음: 캐릭터 클릭 점프 ("포롱 / 보잉!")
  // ==========================================
  public playBoing(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // 귀여운 상승 피치 글라이드 (220Hz -> 680Hz)
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.28);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.34);
  }

  // ==========================================
  // 4. 효과음: 카운트다운 삑 소리 ("3, 2, 1" / "찰칵")
  // ==========================================
  public playCountdownBeep(isFinal: boolean = false): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = isFinal ? 880 : 523.25; // 최종은 높은 라(A5), 일반은 도(C5)
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.25 : 0.12));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (isFinal ? 0.26 : 0.13));
  }

  // ==========================================
  // 5. 효과음: 눈꽃 소멸 및 마을 청소 ("샤르르~")
  // ==========================================
  public playDissolve(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // 하강하는 미세 벨 사운드
    const notes = [1760, 1396, 1174, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0.15, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.36);
    });
  }

  // ==========================================
  // 6. BGM: 맑은 실로폰/글로켄슈필 톤 징글벨 캐롤
  // ==========================================
  public setBGM(enable: boolean): void {
    if (enable) {
      if (this.isBgmPlaying) return;
      this.isBgmPlaying = true;
      this.bgmStep = 0;
      this.playBGMSequence();
    } else {
      this.isBgmPlaying = false;
      if (this.bgmTimeoutId !== null) {
        window.clearTimeout(this.bgmTimeoutId);
        this.bgmTimeoutId = null;
      }
    }
  }

  public toggleBGM(): boolean {
    this.setBGM(!this.isBgmPlaying);
    return this.isBgmPlaying;
  }

  public getIsBgmPlaying(): boolean {
    return this.isBgmPlaying;
  }

  private playBGMSequence(): void {
    if (!this.isBgmPlaying) return;

    const ctx = this.getContext();
    // 징글벨 멜로디 악보 정의 (주파수, 박자 비율: 1 = 4분음표, 0.5 = 8분음표, 2 = 2분음표)
    // 음계 주파수 테이블 (4옥타브 / 5옥타브)
    const C5 = 523.25;
    const D5 = 587.33;
    const E5 = 659.25;
    const F5 = 698.46;
    const G5 = 783.99;
    const A5 = 880.0;
    const REST = 0;

    // 징글벨 후렴구 (E E E-, E E E-, E G C D E- ...)
    const melody: Array<{ freq: number; dur: number }> = [
      // 1마디: 징글벨~
      { freq: E5, dur: 1 },
      { freq: E5, dur: 1 },
      { freq: E5, dur: 2 },
      // 2마디: 징글벨~
      { freq: E5, dur: 1 },
      { freq: E5, dur: 1 },
      { freq: E5, dur: 2 },
      // 3마디: 징글올더웨이~
      { freq: E5, dur: 1 },
      { freq: G5, dur: 1 },
      { freq: C5, dur: 1.5 },
      { freq: D5, dur: 0.5 },
      // 4마디
      { freq: E5, dur: 4 },

      // 5마디: 오왓펀~
      { freq: F5, dur: 1 },
      { freq: F5, dur: 1 },
      { freq: F5, dur: 1.5 },
      { freq: F5, dur: 0.5 },
      // 6마디: 잇이즈투라이드
      { freq: F5, dur: 1 },
      { freq: E5, dur: 1 },
      { freq: E5, dur: 1 },
      { freq: E5, dur: 0.5 },
      { freq: E5, dur: 0.5 },
      // 7마디: 인어원호스
      { freq: E5, dur: 1 },
      { freq: D5, dur: 1 },
      { freq: D5, dur: 1 },
      { freq: E5, dur: 1 },
      // 8마디: 오픈슬레이~
      { freq: D5, dur: 2 },
      { freq: G5, dur: 2 },

      // 반복 2절
      // 9마디: 징글벨~
      { freq: E5, dur: 1 },
      { freq: E5, dur: 1 },
      { freq: E5, dur: 2 },
      // 10마디: 징글벨~
      { freq: E5, dur: 1 },
      { freq: E5, dur: 1 },
      { freq: E5, dur: 2 },
      // 11마디: 징글올더웨이~
      { freq: E5, dur: 1 },
      { freq: G5, dur: 1 },
      { freq: C5, dur: 1.5 },
      { freq: D5, dur: 0.5 },
      // 12마디
      { freq: E5, dur: 4 },

      // 13마디
      { freq: F5, dur: 1 },
      { freq: F5, dur: 1 },
      { freq: F5, dur: 1.5 },
      { freq: F5, dur: 0.5 },
      // 14마디
      { freq: F5, dur: 1 },
      { freq: E5, dur: 1 },
      { freq: E5, dur: 1 },
      { freq: E5, dur: 0.5 },
      { freq: E5, dur: 0.5 },
      // 15마디
      { freq: G5, dur: 1 },
      { freq: G5, dur: 1 },
      { freq: F5, dur: 1 },
      { freq: D5, dur: 1 },
      // 16마디
      { freq: C5, dur: 3 },
      { freq: REST, dur: 1 },
    ];

    const currentNote = melody[this.bgmStep];
    const beatUnitMs = 280; // 4분음표 1박자 길이 (약 107 BPM)
    const noteDurationMs = currentNote.dur * beatUnitMs;

    if (currentNote.freq > 0) {
      this.playGlockenspielNote(currentNote.freq, noteDurationMs / 1000);
    }

    this.bgmStep = (this.bgmStep + 1) % melody.length;

    this.bgmTimeoutId = window.setTimeout(() => {
      this.playBGMSequence();
    }, noteDurationMs);
  }

  // 실로폰/뮤직박스 벨 사운드 합성
  private playGlockenspielNote(freq: number, lengthSec: number): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 맑은 벨 소리를 위한 사인파 + 가벼운 트라이앵글
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // 반짝이는 오버톤
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2.76, now); // 벨 오버톤 비조화 주파수

    // 짧고 통통 튀는 엔벨로프
    const attack = 0.006;
    const decay = Math.min(lengthSec * 1.2, 0.45);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    overtoneGain.gain.setValueAtTime(0, now);
    overtoneGain.gain.linearRampToValueAtTime(0.06, now + attack);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + decay * 0.6);

    osc.connect(gain);
    overtone.connect(overtoneGain);

    gain.connect(ctx.destination);
    overtoneGain.connect(ctx.destination);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + decay);
    overtone.stop(now + decay);
  }
}

export const soundEngine = new SoundEngine();
