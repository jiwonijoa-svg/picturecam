import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Volume2, VolumeX, Trash2, HelpCircle, X } from 'lucide-react';
import { VillageCanvas, CharacterItem } from './components/VillageCanvas';
import { CameraModal } from './components/CameraModal';
import { ProcessResult, generateSampleDrawing } from './utils/imageProcessor';
import { soundEngine } from './utils/audio';

export default function App() {
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBgmOn, setIsBgmOn] = useState(false);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  // 초기 시작 시 귀여운 산타와 루돌프 2명을 기본 소환하여 생동감 있는 마을 연출
  const initialSpawnRef = useRef(false);
  useEffect(() => {
    if (initialSpawnRef.current) return;
    initialSpawnRef.current = true;

    // 잠시 후 첫 번째 캐릭터(산타) 소환
    const t1 = setTimeout(() => {
      const santa = generateSampleDrawing('santa');
      spawnCharacter(santa, window.innerWidth * 0.35);
    }, 600);

    // 두 번째 캐릭터(루돌프) 소환
    const t2 = setTimeout(() => {
      const rudolph = generateSampleDrawing('rudolph');
      spawnCharacter(rudolph, window.innerWidth * 0.65);
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // BGM 토글 핸들러
  const handleToggleBgm = () => {
    const nextState = soundEngine.toggleBGM();
    setIsBgmOn(nextState);
  };

  // 캐릭터 소환 함수 (FIFO 10개 정원 관리)
  const spawnCharacter = useCallback((result: ProcessResult, customStartX?: number) => {
    const id = `char_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const baseW = 230; // 소환 캐릭터 기본 크기 2배 확대 (115px -> 230px)
    const aspect = result.width / (result.height || 1);
    const targetW = baseW;
    const targetH = targetW / aspect;

    const startX = customStartX ?? window.innerWidth * (0.3 + Math.random() * 0.4);
    const startY = window.innerHeight * 0.22;
    const creatorName = result.creatorName?.trim() || undefined;

    // 사운드: 뾰로롱 마법 차임벨
    soundEngine.playSpawnChime();

    setCharacters((prev) => {
      let current = [...prev];

      // 활성 캐릭터(소멸 중이 아닌 캐릭터) 확인
      const activeChars = current.filter((c) => c.state !== 'dissolving');

      // 선입선출 (FIFO): 10개 정원 초과 시 가장 먼저 들어온 1번 캐릭터를 눈꽃 소멸 상태로 전환
      if (activeChars.length >= 10) {
        const oldestId = activeChars[0].id;
        current = current.map((c) => {
          if (c.id === oldestId) {
            soundEngine.playDissolve();
            return { ...c, state: 'dissolving' as const, dissolveProgress: 0 };
          }
          return c;
        });
      }

      const newChar: CharacterItem = {
        id,
        sprite: result.spriteCanvas,
        width: targetW,
        height: targetH,
        x: startX,
        y: startY,
        vx: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.6 + 0.9),
        vy: 0,
        state: 'spawning',
        spawnProgress: 0,
        spawnStartX: startX,
        spawnStartY: startY,
        targetGroundY: window.innerHeight - 100,
        facingLeft: Math.random() > 0.5,
        walkStep: Math.random() * Math.PI,
        wobbleAngle: 0,
        bounceOffset: 0,
        hopCooldown: Math.random() * 4 + 2,
        speechBubble: null,
        dissolveProgress: 0,
        depthScale: 1.0,
        targetDepthScale: 1.0,
        depthYOffset: 0,
        targetDepthYOffset: 0,
        isNewest: true,
        creatorName,
      };

      return [...current, newChar];
    });
  }, []);

  // 소멸 완료된 캐릭터 완전히 배열에서 제거
  const handleRemoveCharacter = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // 마을 청소 (모든 캐릭터 눈꽃으로 초기화)
  const handleCleanVillage = () => {
    soundEngine.playDissolve();
    setCharacters((prev) =>
      prev.map((c) => ({
        ...c,
        state: 'dissolving',
        dissolveProgress: 0,
      }))
    );
    setIsCleanModalOpen(false);
  };

  // 키보드 단축키 (스페이스바: 카메라 모달 열기)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isCameraOpen && !isCleanModalOpen && !isHelpOpen) {
        // 인풋이나 텍스트 편집 중이 아닐 때만
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          setIsCameraOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCameraOpen, isCleanModalOpen, isHelpOpen]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      {/* 1. 메인 인터랙티브 캔버스 (크리스마스 밤하늘, 설경, 움직이는 캐릭터) */}
      <VillageCanvas
        characters={characters}
        onCharacterRemoved={handleRemoveCharacter}
        onCharactersCountChange={setActiveCount}
      />

      {/* 2. 상단 헤더 및 조작 바 */}
      <header className="phone-header absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-4 px-6 py-4 pointer-events-none">
        {/* 좌측: 타이틀 (크게 강조) */}
        <div className="phone-title-card flex items-center gap-3.5 pointer-events-auto bg-slate-900/85 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-700/60 shadow-xl">
          <span className="phone-title-emoji text-3xl animate-bounce">🎄</span>
          <h1 className="phone-title-text text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
            <span className="bg-gradient-to-r from-amber-200 via-rose-100 to-amber-100 bg-clip-text text-transparent drop-shadow-sm">
              빛나는 크리스마스 마을
            </span>
          </h1>
        </div>

        {/* 우측 액션 버튼들 */}
        <div className="phone-actions flex items-center gap-2.5 pointer-events-auto">
          {/* 그림 소환하기 버튼 (주요 액션) */}
          <button
            onClick={() => setIsCameraOpen(true)}
            className="phone-summon-btn flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 active:scale-95 text-white text-sm font-bold rounded-2xl shadow-lg shadow-rose-950/40 border border-rose-400/30 transition-all cursor-pointer"
            title="웹캠으로 그린 그림을 소환합니다 (단축키: 스페이스바)"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="phone-summon-label-mobile">그림올리기</span>
            <span className="phone-summon-label-desktop">그림올리기</span>
            <span className="phone-key-badge text-[10px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-md">
              Space
            </span>
          </button>

          {/* BGM ON/OFF 버튼 */}
          <button
            onClick={handleToggleBgm}
            className={`phone-icon-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border backdrop-blur-md transition-all cursor-pointer text-xs font-semibold ${
              isBgmOn
                ? 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-400/40 text-white shadow-lg shadow-emerald-950/30'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
            }`}
            title="캐롤 실로폰 BGM 켜기/끄기"
          >
            {isBgmOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span className="phone-btn-label">BGM {isBgmOn ? 'ON' : 'OFF'}</span>
          </button>

          {/* 마을 청소 버튼 */}
          <button
            onClick={() => setIsCleanModalOpen(true)}
            disabled={activeCount === 0}
            className="phone-icon-btn flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900/80 hover:bg-rose-950/50 border border-slate-700/60 hover:border-rose-700/60 text-slate-300 hover:text-rose-200 rounded-2xl backdrop-blur-md transition-all cursor-pointer text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            title="모든 캐릭터를 눈꽃으로 초기화"
          >
            <Trash2 className="w-4 h-4" />
            <span className="phone-btn-label">마을비우기</span>
          </button>

          {/* 도움말 안내 버튼 */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="phone-icon-btn p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white rounded-2xl backdrop-blur-md transition-all cursor-pointer"
            title="체험 부스 이용 가이드"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. 하단 우측 은은한 안내 텍스트 */}
      <footer className="absolute bottom-4 right-6 z-20 pointer-events-none">
        <div className="bg-slate-950/45 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-slate-800/40 text-[11px] text-slate-400/80 shadow-sm flex items-center gap-1.5">
          <span className="opacity-70">👆</span>
          <span>캐릭터를 클릭하면 뿅! 점프하고 인사해요</span>
        </div>
      </footer>

      {/* 4. 카메라 캡처 모달 */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={spawnCharacter}
      />

      {/* 5. 마을 청소 확인 팝업 */}
      {isCleanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-600/40 flex items-center justify-center text-2xl text-rose-400">
              🧹
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white">마을을 청소할까요?</h3>
              <p className="text-xs text-slate-300">
                마을에 있는 모든 그림 친구들이 예쁜 눈꽃으로 변해 하늘로 날아갑니다.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full mt-2">
              <button
                onClick={() => setIsCleanModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCleanVillage}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-900/30"
              >
                청소하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 체험부스 운영 가이드 팝업 */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎪</span>
                <h3 className="text-base font-bold text-white">체험부스 운영 가이드</h3>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-base">1️⃣</span>
                <div>
                  <strong className="text-white block">도안 종이에 그림 그리기</strong>
                  아이들이 흰 종이에 색연필이나 사인펜으로 좋아하는 캐릭터를 그립니다.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-base">2️⃣</span>
                <div>
                  <strong className="text-white block">웹캠 가이드 박스에 맞추기</strong>
                  [그림 올리기]를 누르고 네모난 초록/빨강 점선 박스 안에 그림을 비춥니다.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-base">3️⃣</span>
                <div>
                  <strong className="text-white block">3초 타이머 찰칵!</strong>
                  3초 후 자동으로 흰 배경이 투명해지며 크리스마스 마을에 살아납니다!
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-base">4️⃣</span>
                <div>
                  <strong className="text-white block">클릭 상호작용 & 정원 관리</strong>
                  캐릭터를 누르면 높게 점프하며 크리스마스 인사를 건넵니다. 마을에는 최대 10명의 친구가 머무를 수 있습니다.
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors mt-1"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
