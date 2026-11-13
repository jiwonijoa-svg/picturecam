import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../utils/audio';
import bgImageUrl from '../assets/images/christmas_village_bg_1794294104520.jpg';

export interface CharacterItem {
  id: string;
  sprite: HTMLCanvasElement;
  width: number;
  height: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'spawning' | 'walking' | 'jumping' | 'dissolving';
  spawnProgress: number; // 0 to 1
  spawnStartX: number;
  spawnStartY: number;
  targetGroundY: number;
  facingLeft: boolean;
  walkStep: number;
  wobbleAngle: number;
  bounceOffset: number;
  hopCooldown: number;
  speechBubble: {
    text: string;
    timeLeft: number; // seconds
    maxTime: number;
    offsetY: number;
  } | null;
  dissolveProgress: number; // 0 to 1
  depthScale: number; // 원근 스케일 (0.6 ~ 1.0)
  targetDepthScale: number; // 목표 원근 스케일
  depthYOffset: number; // 뒤로 물러났을 때 Y축 원근 오프셋 (현재)
  targetDepthYOffset: number; // 목표 Y축 원근 오프셋
  isNewest?: boolean; // 가장 최근에 추가된 최전방 주인공 여부
  creatorName?: string; // 그림을 그린 친구 이름 (선택: 빈칸이면 미표시)
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  type: 'star' | 'snow' | 'sparkle' | 'stardust';
}

interface Star {
  x: number;
  y: number;
  radius: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  swayAmp: number;
  swaySpeed: number;
  phase: number;
  alpha: number;
}

interface VillageCanvasProps {
  characters: CharacterItem[];
  onCharacterClick?: (char: CharacterItem) => void;
  onCharacterRemoved?: (id: string) => void;
  onCharactersCountChange?: (count: number) => void;
}

const GREETINGS = [
  '🎄 메리 크리스마스! 🎅',
  '🎁 행복한 성탄절이에요!',
  '⭐ 반짝반짝 빛나요!',
  '⛄ 나랑 눈싸움 할래?',
  '🦌 루돌프와 함께 달려요!',
  '✨ 내가 그린 그림이 살아났어!',
];

export const VillageCanvas: React.FC<VillageCanvasProps> = ({
  characters,
  onCharacterClick,
  onCharacterRemoved,
  onCharactersCountChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const charactersRef = useRef<CharacterItem[]>(characters);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const snowflakesRef = useRef<Snowflake[]>([]);
  const smokeTimerRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [, setBgLoaded] = useState(false);

  // 16:9 와이드 크리스마스 마을 파노라마 단일 배경 이미지 로드
  useEffect(() => {
    const img = new Image();
    img.src = bgImageUrl;
    img.onload = () => {
      bgImageRef.current = img;
      setBgLoaded(true);
    };
  }, []);

  // characters prop 업데이트 반영
  useEffect(() => {
    charactersRef.current = characters;
    onCharactersCountChange?.(characters.filter((c) => c.state !== 'dissolving').length);
  }, [characters, onCharactersCountChange]);

  // 배경 지면 곡선 함수 (16:9 파노라마 전경의 환하게 비추는 눈길에 맞춤)
  const getGroundY = (x: number, w: number, h: number): number => {
    const base = h * 0.885;
    const wave = Math.sin((x / w) * Math.PI * 2.2) * 6 + Math.cos((x / w) * Math.PI * 3.8) * 3;
    return base + wave;
  };

  // 소환 파티클(황금 별빛 버스트) 방출 함수
  const spawnStarBurst = (x: number, y: number) => {
    const colors = ['#FFE082', '#FFD54F', '#FFF59D', '#FFFFFF', '#80D8FF', '#FF80AB'];
    for (let i = 0; i < 38; i++) {
      const angle = (Math.PI * 2 * i) / 38 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 5.5 + 2.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: Math.random() * 9 + 4,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        life: 0,
        maxLife: Math.random() * 40 + 35,
        type: 'star',
      });
    }
  };

  // 캐릭터 점프 시 하트/별 스파클 방출
  const spawnJumpSparkles = (x: number, y: number) => {
    const colors = ['#FFD54F', '#FF4081', '#00E676', '#40C4FF', '#FFFFFF'];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: Math.random() * 6 + 3,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        life: 0,
        maxLife: Math.random() * 30 + 20,
        type: 'sparkle',
      });
    }
  };

  // 캐릭터 소멸 시 눈송이 결정 파티클 방출
  const spawnDissolveSnow = (x: number, y: number, w: number, h: number) => {
    for (let i = 0; i < 35; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * w,
        y: y + (Math.random() - 0.5) * h,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3.5 - 1.0,
        size: Math.random() * 7 + 4,
        alpha: 1,
        color: Math.random() > 0.4 ? '#FFFFFF' : '#B3E5FC',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.15,
        life: 0,
        maxLife: Math.random() * 45 + 30,
        type: 'snow',
      });
    }
  };

  // 초기 캔버스 및 배경 요소 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      // 배경 별 생성 (75개)
      starsRef.current = [];
      for (let i = 0; i < 75; i++) {
        starsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * (window.innerHeight * 0.65),
          radius: Math.random() * 1.8 + 0.6,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.04 + 0.015,
        });
      }

      // 내리는 눈송이 생성 (65개)
      snowflakesRef.current = [];
      for (let i = 0; i < 65; i++) {
        snowflakesRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: Math.random() * 3.2 + 1.2,
          speedY: Math.random() * 1.2 + 0.8,
          swayAmp: Math.random() * 1.5 + 0.5,
          swaySpeed: Math.random() * 0.03 + 0.01,
          phase: Math.random() * Math.PI * 2,
          alpha: Math.random() * 0.6 + 0.4,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // ==========================================
    // 캔버스 메인 렌더링 & 물리 루프
    // ==========================================
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // ------------------------------------------
      // 1. 16:9 파노라마 크리스마스 마을 단일 배경 (왜곡/어두워짐 없이 원본 그대로의 화사한 색감과 조명)
      // ------------------------------------------
      const bgImg = bgImageRef.current;
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        // 화면 전체를 채우는 선명하고 따뜻한 단일 파노라마 일러스트 렌더링 (인위적인 어두운 필터 없이 원본 그대로)
        const scale = Math.max(width / bgImg.naturalWidth, height / bgImg.naturalHeight);
        const drawW = bgImg.naturalWidth * scale;
        const drawH = bgImg.naturalHeight * scale;
        const drawX = (width - drawW) / 2;
        const drawY = (height - drawH) / 2;

        ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);

        // 밤하늘 반짝이는 별빛
        starsRef.current.forEach((s) => {
          s.twinklePhase += s.twinkleSpeed;
          const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.twinklePhase));
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        // 이미지 로딩 전 기본 밤하늘 그라데이션
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#040916');
        skyGrad.addColorStop(0.5, '#0E1D3B');
        skyGrad.addColorStop(1, '#1A3358');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // ------------------------------------------
      // 6. 파티클 시뮬레이션 (별빛, 스파클, 연기 등)
      // ------------------------------------------
      const activeParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        if (p.type === 'star' || p.type === 'sparkle') {
          p.vy += 0.12; // 중력
          p.vx *= 0.98;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        } else if (p.type === 'stardust') {
          p.vy += 0.012; // 무게감 없이 밤하늘에 살랑살랑 떠다님
          p.vx *= 0.96;
          p.alpha = Math.max(0, (1 - p.life / p.maxLife) * 0.9);
        } else if (p.type === 'snow') {
          p.vx += Math.sin(p.life * 0.1) * 0.08;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        }

        if (p.life < p.maxLife && p.alpha > 0.01) {
          activeParticles.push(p);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;

          if (p.type === 'star') {
            // 4각 반짝이 별 그리기
            ctx.beginPath();
            const s = p.size;
            ctx.moveTo(0, -s);
            ctx.quadraticCurveTo(0, 0, s, 0);
            ctx.quadraticCurveTo(0, 0, 0, s);
            ctx.quadraticCurveTo(0, 0, -s, 0);
            ctx.quadraticCurveTo(0, 0, 0, -s);
            ctx.closePath();
            ctx.fill();
          } else if (p.type === 'stardust') {
            // 은은한 요정 별빛 글로우 물방울
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // 둥근 눈/스파클
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      });
      particlesRef.current = activeParticles;

      // ------------------------------------------
      // 7. 캐릭터 시뮬레이션 및 원근 깊이(Depth & Focus) 렌더링
      // ------------------------------------------
      const chars = charactersRef.current;
      const charsToRemove: string[] = [];

      // A. 원근 깊이 및 주인공 부각 계산
      // 활성 캐릭터 중 가장 마지막에 추가된 캐릭터가 최전방 주인공(rank 0)
      const activeChars = chars.filter((c) => c.state !== 'dissolving');
      const totalActive = activeChars.length;

      activeChars.forEach((c, idx) => {
        const rank = totalActive - 1 - idx; // 0 = 가장 최신 소환 캐릭터 (주인공)
        c.isNewest = rank === 0;

        if (rank === 0) {
          // 가장 최근에 소환된 주인공: 원본 100% 크기(1.0), 최전방 보행로
          c.targetDepthScale = 1.0;
          c.targetDepthYOffset = 0;
        } else {
          // 이전에 소환된 캐릭터들: 새 그림이 들어올 때마다 순차적으로 크기가 작아지며 뒤쪽으로 물러남 (최대 0.62배)
          const scale = Math.max(0.62, 1.0 - rank * 0.09);
          c.targetDepthScale = scale;
          // 뒤쪽으로 물러났을 때 원근감에 맞추어 화면 위쪽(눈길 원경)으로 자연스럽게 올라감
          const yOffset = -Math.min(50, rank * 13);
          c.targetDepthYOffset = yOffset;
        }

        // 부드러운 스케일 및 위치 보간 (뒤로 스르륵 물러나는 자연스러운 애니메이션)
        if (c.depthScale === undefined) c.depthScale = c.targetDepthScale;
        if (c.depthYOffset === undefined) c.depthYOffset = c.targetDepthYOffset;

        c.depthScale += (c.targetDepthScale - c.depthScale) * dt * 2.8;
        c.depthYOffset += (c.targetDepthYOffset - c.depthYOffset) * dt * 2.8;
      });

      // B. 물리 시뮬레이션 루프
      chars.forEach((c) => {
        const currentScale = c.depthScale ?? 1.0;
        const currentYOffset = c.depthYOffset ?? 0;
        const rawGroundY = getGroundY(c.x, width, height);

        // 원근 스케일 및 뒤로 물러난 Y 오프셋을 반영한 지면 착지 좌표
        const groundY = rawGroundY - (c.height * currentScale) * 0.42 + currentYOffset;
        c.targetGroundY = groundY;

        // --- B-1. 소환 상태 (Spawn Animation) ---
        if (c.state === 'spawning') {
          c.spawnProgress += dt * 1.0;
          const t = Math.min(1, c.spawnProgress);

          const currentY = c.spawnStartY + (groundY - c.spawnStartY) * (t * (2 - t));
          c.y = currentY;

          // 나풀나풀 좌우 진동 (flutter)
          c.x = c.spawnStartX + Math.sin(t * Math.PI * 4) * 25;
          c.wobbleAngle = Math.sin(t * Math.PI * 5) * 0.15;

          // 소환 진행 중 작은 별빛 떨어짐
          if (Math.random() < 0.4) {
            particlesRef.current.push({
              x: c.x + (Math.random() - 0.5) * 40,
              y: c.y + (Math.random() - 0.5) * 30,
              vx: (Math.random() - 0.5) * 2,
              vy: Math.random() * 2,
              size: Math.random() * 6 + 3,
              alpha: 0.9,
              color: '#FFE082',
              rotation: Math.random() * Math.PI,
              vRot: 0.1,
              life: 0,
              maxLife: 25,
              type: 'star',
            });
          }

          if (t >= 1) {
            c.state = 'walking';
            c.y = groundY;
            c.spawnProgress = 1;
            c.wobbleAngle = 0;
          }
        }
        // --- B-2. 걷기/점프 상태 (Walking / Jumping) ---
        else if (c.state === 'walking' || c.state === 'jumping') {
          c.x += c.vx;

          // 화면 좌우 벽 충돌 시 방향 반전 (원근 크기 반영)
          const margin = (c.width * currentScale) * 0.55;
          if (c.x < margin) {
            c.x = margin;
            c.vx = Math.abs(c.vx);
            c.facingLeft = false;
          } else if (c.x > width - margin) {
            c.x = width - margin;
            c.vx = -Math.abs(c.vx);
            c.facingLeft = true;
          }

          c.walkStep += dt * 5.2;
          c.wobbleAngle = Math.sin(c.walkStep) * 0.14;
          c.bounceOffset = Math.abs(Math.sin(c.walkStep * 2)) * (6 * currentScale);

          c.vy += 32 * dt;
          c.y += c.vy;

          if (c.y >= groundY) {
            c.y = groundY;
            c.vy = 0;
            if (c.state === 'jumping') {
              c.state = 'walking';
            }
          }

          c.hopCooldown -= dt;
          if (c.hopCooldown <= 0 && c.state === 'walking' && Math.random() < 0.08) {
            c.vy = -5.5 * Math.sqrt(currentScale);
            c.hopCooldown = Math.random() * 4 + 3;
          }

          // 최신 주인공 캐릭터는 주변에 은은한 마법 별빛이 가끔씩 피어오름
          if (c.isNewest && Math.random() < 0.05) {
            particlesRef.current.push({
              x: c.x + (Math.random() - 0.5) * (c.width * currentScale * 0.8),
              y: c.y - c.bounceOffset + (Math.random() - 0.5) * (c.height * currentScale * 0.8),
              vx: (Math.random() - 0.5) * 0.6,
              vy: -Math.random() * 1.2 - 0.4,
              size: Math.random() * 4.5 + 2,
              alpha: 0.95,
              color: Math.random() > 0.4 ? '#FFE082' : '#FFFFFF',
              rotation: Math.random() * Math.PI,
              vRot: 0.1,
              life: 0,
              maxLife: 26,
              type: 'star',
            });
          }
        }
        // --- B-3. 소멸 상태 (Dissolving) ---
        else if (c.state === 'dissolving') {
          c.dissolveProgress += dt * 1.5;
          c.wobbleAngle = Math.sin(c.dissolveProgress * 20) * 0.2;

          if (c.dissolveProgress >= 1) {
            charsToRemove.push(c.id);
          }
        }

        // 말풍선 타이머 업데이트
        if (c.speechBubble) {
          c.speechBubble.timeLeft -= dt;
          c.speechBubble.offsetY += dt * 18;
          if (c.speechBubble.timeLeft <= 0) {
            c.speechBubble = null;
          }
        }
      });

      // C. 원근 깊이 렌더링 루프 (depthScale 오름차순: 뒤에 있는 작은 캐릭터부터 먼저 그리고, 최신 주인공을 맨 마지막에 맨 앞 레이어로 렌더링)
      const sortedChars = [...chars].sort((a, b) => {
        const da = a.depthScale ?? 1.0;
        const db = b.depthScale ?? 1.0;
        return da - db;
      });

      sortedChars.forEach((c) => {
        ctx.save();

        const currentScale = c.depthScale ?? 1.0;
        let renderScale = currentScale;
        let renderAlpha = 1.0;

        if (c.state === 'spawning') {
          renderScale = (1.8 - 0.8 * (c.spawnProgress * c.spawnProgress)) * currentScale;
          renderAlpha = Math.min(1, c.spawnProgress * 2.5);
        } else if (c.state === 'dissolving') {
          renderScale = Math.max(0.2, 1 - c.dissolveProgress * 0.8) * currentScale;
          renderAlpha = Math.max(0, 1 - c.dissolveProgress);
        }

        // 뒤로 물러난 캐릭터는 살짝 부드러운 공기 원근감(소프트 알파) 부여
        if (!c.isNewest) {
          renderAlpha *= Math.max(0.85, 0.70 + currentScale * 0.30);
        }

        ctx.globalAlpha = renderAlpha;

        const drawX = c.x;
        const drawY = c.y - c.bounceOffset;

        ctx.translate(drawX, drawY);

        if (c.facingLeft) {
          ctx.scale(-1, 1);
        }

        ctx.rotate(c.wobbleAngle);
        ctx.scale(renderScale, renderScale);

        // 그림자 그리기 (원근 크기에 맞게 조절)
        if (c.state !== 'dissolving') {
          ctx.save();
          ctx.scale(c.facingLeft ? -1 : 1, 1);
          ctx.fillStyle = 'rgba(28, 50, 80, 0.28)';
          ctx.beginPath();
          const shadowW = c.width * 0.45;
          const shadowH = 9;
          const shadowDist = (c.y - drawY) / renderScale + c.height * 0.45;
          ctx.ellipse(0, shadowDist, shadowW, shadowH, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 스프라이트 렌더링 (가장 최근에 추가된 주인공은 화려한 골드/화이트 글로우로 가장 돋보이게 부각)
        try {
          ctx.save();
          if (c.isNewest) {
            ctx.shadowColor = 'rgba(255, 245, 180, 0.95)';
            ctx.shadowBlur = 20;
          } else {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.40)';
            ctx.shadowBlur = 8;
          }
          ctx.drawImage(c.sprite, -c.width * 0.5, -c.height * 0.5, c.width, c.height);
          ctx.restore();
        } catch {
          // 스프라이트 드로우 예외 안전 처리
        }

        ctx.restore();

        const hasNameTag = Boolean(c.creatorName && c.creatorName.trim().length > 0);

        // --- 캐릭터 이름표 그리기 (입력값이 있을 때만 캐릭터를 따라다니며 표시) ---
        if (hasNameTag && c.state !== 'dissolving') {
          ctx.save();
          ctx.globalAlpha = renderAlpha;

          const nameText = c.creatorName!.trim();
          const nameFontSize = Math.max(12, Math.round(13.5 * Math.sqrt(currentScale)));
          ctx.font = `bold ${nameFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

          const textMetrics = ctx.measureText(nameText);
          const padX = 10;
          const tagW = textMetrics.width + padX * 2 + 18;
          const tagH = nameFontSize + 11;
          const tagX = c.x;
          const tagY = drawY - (c.height * currentScale) * 0.5 - tagH * 0.5 - 6;

          // 배경 라운드 필 뱃지 (최신 주인공은 황금빛 아우라, 다른 캐릭터는 단정한 어두운 유리톤)
          ctx.fillStyle = c.isNewest ? 'rgba(15, 23, 42, 0.90)' : 'rgba(15, 23, 42, 0.75)';
          ctx.shadowColor = c.isNewest ? 'rgba(255, 215, 0, 0.75)' : 'rgba(0, 0, 0, 0.45)';
          ctx.shadowBlur = c.isNewest ? 12 : 5;
          ctx.shadowOffsetY = 2;

          ctx.beginPath();
          ctx.roundRect(tagX - tagW * 0.5, tagY - tagH * 0.5, tagW, tagH, tagH * 0.5);
          ctx.fill();

          // 테두리
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = c.isNewest ? 'rgba(255, 215, 0, 0.95)' : 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = c.isNewest ? 1.8 : 1.2;
          ctx.stroke();

          // 텍스트 (그린 사람 이름)
          ctx.fillStyle = c.isNewest ? '#FFF176' : '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`🏷️ ${nameText}`, tagX, tagY);

          ctx.restore();
        }

        // --- 말풍선 그리기 ("🎄 메리 크리스마스! 🎅") ---
        if (c.speechBubble && c.state !== 'dissolving') {
          ctx.save();
          const bubble = c.speechBubble;
          const bubbleAlpha = Math.min(1, bubble.timeLeft / 0.5);
          ctx.globalAlpha = bubbleAlpha;

          const nameTagExtraH = hasNameTag ? Math.max(26, Math.round(28 * Math.sqrt(currentScale))) : 0;
          const bubbleX = c.x;
          const bubbleY = drawY - (c.height * currentScale) * 0.5 - nameTagExtraH - 18 - bubble.offsetY;

          ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const textMetrics = ctx.measureText(bubble.text);
          const bw = textMetrics.width + 26;
          const bh = 34;

          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 4;
          ctx.beginPath();
          ctx.roundRect(bubbleX - bw * 0.5, bubbleY - bh, bw, bh, 14);
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(bubbleX - 6, bubbleY);
          ctx.lineTo(bubbleX, bubbleY + 8);
          ctx.lineTo(bubbleX + 6, bubbleY);
          ctx.closePath();
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.fillStyle = '#B71C1C';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(bubble.text, bubbleX, bubbleY - bh * 0.5);

          ctx.restore();
        }
      });

      // 소멸 완료된 캐릭터 제거 처리
      if (charsToRemove.length > 0) {
        charsToRemove.forEach((id) => {
          onCharacterRemoved?.(id);
        });
      }

      // ------------------------------------------
      // 8. 상시 내리는 둥근 눈송이 (Snowflakes)
      // ------------------------------------------
      snowflakesRef.current.forEach((flake) => {
        flake.phase += flake.swaySpeed;
        flake.x += Math.sin(flake.phase) * flake.swayAmp;
        flake.y += flake.speedY;

        // 화면 바닥 도달 시 위로 재순환
        if (flake.y > height + 10) {
          flake.y = -10;
          flake.x = Math.random() * width;
        }
        if (flake.x < -10) flake.x = width + 10;
        if (flake.x > width + 10) flake.x = -10;

        ctx.fillStyle = `rgba(255, 255, 255, ${flake.alpha})`;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [onCharacterRemoved]);

  // ==========================================
  // 마우스 클릭 / 터치 상호작용 (캐릭터 뿅 점프 & 말풍선)
  // ==========================================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const chars = charactersRef.current;

    // 최전방(가장 크고 앞에 렌더링된 최신 주인공 우선) 순서로 히트테스트
    const sortedForClick = [...chars].sort((a, b) => (b.depthScale ?? 1) - (a.depthScale ?? 1));

    for (const c of sortedForClick) {
      if (c.state === 'dissolving' || c.state === 'spawning') continue;

      const scale = c.depthScale ?? 1.0;
      const halfW = (c.width * scale) * 0.55;
      const halfH = (c.height * scale) * 0.55;
      const charCenterY = c.y - c.bounceOffset;

      if (
        clickX >= c.x - halfW &&
        clickX <= c.x + halfW &&
        clickY >= charCenterY - halfH &&
        clickY <= charCenterY + halfH
      ) {
        // 캐릭터 점프 트리거!
        c.state = 'jumping';
        c.vy = -12.5; // 위로 뿅! 높게 점프

        // 사운드 재생 (보잉 효과음)
        soundEngine.playBoing();

        // 스파클 파티클 생성
        spawnJumpSparkles(c.x, charCenterY);

        // 귀여운 말풍선 생성 ("🎄 메리 크리스마스! 🎅")
        const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        c.speechBubble = {
          text: randomGreeting,
          timeLeft: 2.2,
          maxTime: 2.2,
          offsetY: 0,
        };

        onCharacterClick?.(c);
        break;
      }
    }
  };

  // 새로운 캐릭터 외부 소환 알림용 리스너 (부모 컴포넌트가 호출할 수 있도록 effect 감지)
  const prevCharsCountRef = useRef(characters.length);
  useEffect(() => {
    if (characters.length > prevCharsCountRef.current) {
      // 새 캐릭터 등장!
      const newChar = characters[characters.length - 1];
      if (newChar && newChar.state === 'spawning') {
        spawnStarBurst(newChar.spawnStartX, newChar.spawnStartY);
      }
    }
    prevCharsCountRef.current = characters.length;
  }, [characters]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      className="absolute inset-0 w-full h-full cursor-pointer select-none touch-none"
    />
  );
};
