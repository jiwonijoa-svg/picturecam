import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Camera, X, Sparkles, RefreshCw, Palette, Eye, Sliders } from 'lucide-react';
import { removePaperBackground, generateSampleDrawing, ProcessResult } from '../utils/imageProcessor';
import { soundEngine } from '../utils/audio';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (result: ProcessResult) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  const [threshold, setThreshold] = useState(200);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'samples' | 'draw'>('camera');
  const [creatorName, setCreatorName] = useState('');
  const [selectedSample, setSelectedSample] = useState<'santa' | 'rudolph' | 'snowman' | 'tree'>('santa');

  // 실제 소환되는 풀바디 도안 스프라이트 미리보기 이미지 캐싱
  const samplePreviews = useMemo(() => {
    return {
      santa: generateSampleDrawing('santa').dataUrl,
      rudolph: generateSampleDrawing('rudolph').dataUrl,
      snowman: generateSampleDrawing('snowman').dataUrl,
      tree: generateSampleDrawing('tree').dataUrl,
    };
  }, []);

  // 직접 그리기 캔버스 ref
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [drawColor, setDrawColor] = useState('#E53935');
  const [drawLineWidth, setDrawLineWidth] = useState(8);

  // 실시간 미리보기용 캔버스
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewAnimRef = useRef<number | null>(null);

  // 카메라 스트림 시작
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      setCameraError('웹캠을 연결하거나 브라우저 카메라 권한을 허용해주세요.');
    }
  };

  // 카메라 정지
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (previewAnimRef.current) {
      cancelAnimationFrame(previewAnimRef.current);
      previewAnimRef.current = null;
    }
  };

  // 모달 열림/닫힘 생명주기
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
      setIsCountingDown(false);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  // 실시간 투명화 미리보기 루프
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera' || !showLivePreview) {
      if (previewAnimRef.current) cancelAnimationFrame(previewAnimRef.current);
      return;
    }

    const updatePreview = () => {
      const video = videoRef.current;
      const previewCanvas = previewCanvasRef.current;
      if (video && previewCanvas && video.readyState >= 2) {
        const pCtx = previewCanvas.getContext('2d');
        if (pCtx) {
          // 비디오 중심 사각 영역 캡처
          const vW = video.videoWidth || 640;
          const vH = video.videoHeight || 480;
          const boxSize = Math.min(vW, vH) * 0.65;
          const sx = (vW - boxSize) / 2;
          const sy = (vH - boxSize) / 2;

          const tempC = document.createElement('canvas');
          tempC.width = 240;
          tempC.height = 240;
          const tCtx = tempC.getContext('2d')!;

          // 거울 모드 반전 적용
          tCtx.save();
          tCtx.translate(240, 0);
          tCtx.scale(-1, 1);
          tCtx.drawImage(video, sx, sy, boxSize, boxSize, 0, 0, 240, 240);
          tCtx.restore();

          const result = removePaperBackground(tempC, threshold, 14);

          previewCanvas.width = 240;
          previewCanvas.height = 240;
          pCtx.clearRect(0, 0, 240, 240);
          pCtx.drawImage(result.spriteCanvas, 0, 0, 240, 240);
        }
      }
      previewAnimRef.current = requestAnimationFrame(updatePreview);
    };

    previewAnimRef.current = requestAnimationFrame(updatePreview);

    return () => {
      if (previewAnimRef.current) cancelAnimationFrame(previewAnimRef.current);
    };
  }, [isOpen, activeTab, showLivePreview, threshold]);

  // 가이드 박스 영역 캡처 실행
  const captureGuideArea = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    soundEngine.playShutter();

    const vW = video.videoWidth || 640;
    const vH = video.videoHeight || 480;

    // 비디오 정중앙의 정사각 가이드 박스 크기
    const boxSize = Math.min(vW, vH) * 0.68;
    const sx = (vW - boxSize) / 2;
    const sy = (vH - boxSize) / 2;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 500;
    captureCanvas.height = 500;
    const cCtx = captureCanvas.getContext('2d');
    if (!cCtx) return;

    // 아이가 웹캠 거울을 보고 그림을 맞추었으므로, 거울 반전(scale -1) 상태를 정방향으로 풀어
    // 실제 도안의 원래 방향(글자/형태)으로 보정하여 저장합니다.
    cCtx.save();
    cCtx.translate(500, 0);
    cCtx.scale(-1, 1);
    cCtx.drawImage(video, sx, sy, boxSize, boxSize, 0, 0, 500, 500);
    cCtx.restore();

    // 루마키 배경 지우기 알고리즘 실행
    const processed = removePaperBackground(captureCanvas, threshold, 16);
    onCapture({
      ...processed,
      creatorName: creatorName.trim() || undefined,
    });
    setCreatorName('');
    onClose();
  };

  // 3초 카운트다운 소환
  const startCountdown = () => {
    if (isCountingDown) return;
    setIsCountingDown(true);
    setCountdownNum(3);
    soundEngine.playCountdownBeep(false);

    let count = 3;
    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
        soundEngine.playCountdownBeep(false);
      } else {
        clearInterval(timer);
        setIsCountingDown(false);
        soundEngine.playCountdownBeep(true);
        captureGuideArea();
      }
    }, 1000);
  };

  // ESC 키 닫기 & 스페이스바 캡처 지원
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && activeTab === 'camera' && !isCountingDown) {
        // 이름 입력 인풋 필드에 포커스되어 있는 경우 스페이스바(띄어쓰기) 허용
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA'
        ) {
          return;
        }
        e.preventDefault();
        startCountdown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, isCountingDown, creatorName]);

  // 직접 그리기 캔버스 초기화
  useEffect(() => {
    if (activeTab === 'draw' && drawCanvasRef.current) {
      const c = drawCanvasRef.current;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, c.width, c.height);
      }
    }
  }, [activeTab]);

  const handleDrawStart = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = drawCanvasRef.current;
    if (!c) return;
    isDrawingRef.current = true;
    const rect = c.getBoundingClientRect();
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawLineWidth;
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  };

  const handleDrawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const c = drawCanvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;

    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const handleDrawEnd = () => {
    isDrawingRef.current = false;
  };

  const handleClearDrawCanvas = () => {
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, c.width, c.height);
    }
  };

  const handleSummonDrawn = () => {
    const c = drawCanvasRef.current;
    if (!c) return;
    soundEngine.playShutter();
    const result = removePaperBackground(c, 235, 12);
    onCapture({
      ...result,
      creatorName: creatorName.trim() || undefined,
    });
    setCreatorName('');
    onClose();
  };

  const handleSelectSample = (type: 'santa' | 'rudolph' | 'snowman' | 'tree') => {
    soundEngine.playShutter();
    const result = generateSampleDrawing(type);
    onCapture({
      ...result,
      creatorName: creatorName.trim() || undefined,
    });
    setCreatorName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="phone-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="phone-modal-card relative w-full max-w-2xl h-[650px] max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* 모달 헤더 */}
        <div className="phone-modal-header flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="phone-modal-title-wrap flex items-center gap-2">
            <span className="phone-modal-title-emoji text-xl">🎨</span>
            <h2 className="phone-modal-title text-lg font-bold tracking-tight text-white">
              <span>그림 올리기</span>
            </h2>
          </div>

          {/* 탭 전환 (카메라 / 샘플 도안 / 직접 그리기) */}
          <div className="phone-modal-tabs flex items-center gap-1 p-1 bg-slate-800/90 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('camera')}
              className={`phone-modal-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span>찰칵</span>
            </button>
            <button
              onClick={() => setActiveTab('samples')}
              className={`phone-modal-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'samples'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="phone-only-inline">샘플도안</span>
              <span className="phone-hide-inline">샘플 도안</span>
            </button>
            <button
              onClick={() => setActiveTab('draw')}
              className={`phone-modal-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'draw'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span className="phone-only-inline">스케치</span>
              <span className="phone-hide-inline">화면 스케치</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="phone-modal-close p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="닫기 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 친구이름 입력 바 (가로 중앙 배치, 조금 더 크게 확대된 텍스트 및 입력창) */}
        <div className="phone-modal-namebar px-6 py-3 bg-slate-800/70 border-b border-slate-800 flex items-center justify-center gap-3 shrink-0">
          <label htmlFor="creator-name-input" className="phone-modal-name-label text-sm sm:text-base font-extrabold text-amber-300 shrink-0 cursor-pointer tracking-tight">
            친구이름
          </label>
          <div className="phone-modal-name-wrap relative w-52 sm:w-56">
            <input
              id="creator-name-input"
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="예: 민준이"
              maxLength={10}
              className="phone-modal-name-input w-full bg-slate-950/90 border border-slate-700/90 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 rounded-xl px-4 py-2 text-sm font-semibold text-white placeholder-slate-500 outline-none transition-all pr-8 text-center shadow-inner"
            />
            {creatorName && (
              <button
                type="button"
                onClick={() => setCreatorName('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-700/60 transition-colors cursor-pointer"
                title="이름 지우기"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 탭 1: 웹캠 카메라 모드 */}
        {activeTab === 'camera' && (
          <div className="phone-modal-body flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-5 gap-3.5">
            {/* 메인 스테이지 */}
            <div className="phone-landscape-row w-full flex-1 min-h-0 flex flex-col items-center justify-center">
              {cameraError ? (
                <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center gap-3 bg-slate-800/60 rounded-2xl p-6 text-center border border-dashed border-rose-500/40">
                  <Camera className="w-10 h-10 text-rose-400 animate-pulse" />
                  <p className="text-sm text-slate-300 max-w-xs">{cameraError}</p>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> 다시 시도
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('samples')}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> 샘플 도안 보기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="phone-camera-box relative w-full max-w-[270px] sm:max-w-[290px] aspect-square bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-slate-700/80 flex items-center justify-center shrink-0">
                  {/* 실시간 웹캠 비디오 (거울 모드: scaleX(-1)) */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />

                  {/* 중앙 도안 가이드 영역 (초록 점선의 둥근 사각 박스) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-3">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]" />

                    <div className="phone-camera-guide relative w-48 h-48 sm:w-52 sm:h-52 rounded-3xl border-4 border-dashed border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)] z-10 flex items-center justify-center bg-transparent">
                      <div className="absolute -top-2.5 -left-2.5 w-5 h-5 border-t-4 border-l-4 border-rose-500 rounded-tl-lg" />
                      <div className="absolute -top-2.5 -right-2.5 w-5 h-5 border-t-4 border-r-4 border-rose-500 rounded-tr-lg" />
                      <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 border-b-4 border-l-4 border-rose-500 rounded-bl-lg" />
                      <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 border-b-4 border-r-4 border-rose-500 rounded-br-lg" />

                      {/* 실시간 배경 투명화 미리보기 오버레이 */}
                      {showLivePreview && (
                        <canvas
                          ref={previewCanvasRef}
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-2xl bg-black/40"
                        />
                      )}

                      {/* 카운트다운 큰 숫자 */}
                      {isCountingDown && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 rounded-2xl">
                          <span className="text-7xl font-black text-amber-300 drop-shadow-[0_0_25px_rgba(251,191,36,0.9)] animate-ping">
                            {countdownNum}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="z-10 mt-2 px-3 py-0.5 bg-slate-900/90 border border-slate-700/80 rounded-full text-[10px] sm:text-[11px] font-semibold text-emerald-300 shadow-md flex items-center gap-1">
                      <span>✨</span>
                      <span className="phone-only-inline">박스 안에 맞춰주세요!</span>
                      <span className="phone-hide-inline">네모 박스 안에 그린 그림을 맞춰주세요!</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 보조 컨트롤 (종이 감도 & 투명화 미리보기) */}
              {!cameraError && (
                <div className="phone-controls-bar w-full max-w-md flex items-center justify-between px-3.5 py-1.5 bg-slate-800/60 rounded-xl text-xs text-slate-300 border border-slate-800 shrink-0 mt-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-300 whitespace-nowrap">
                      <span className="phone-only-inline">감도</span>
                      <span className="phone-hide-inline">종이 감도:</span>
                    </span>
                    <input
                      type="range"
                      min="140"
                      max="240"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="phone-slider w-20 accent-rose-500 cursor-pointer"
                      title="조명 환경에 맞춰 종이 배경 감도를 조절합니다"
                    />
                    <span className="text-[11px] font-mono text-slate-400">{threshold}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer shrink-0 ${
                      showLivePreview
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-700/40 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span className="phone-only-inline">미리보기</span>
                    <span className="phone-hide-inline">투명화 미리보기</span>
                  </button>
                </div>
              )}
            </div>

            {/* 하단 단일 일원화된 소환 버튼 바 */}
            <div className="w-full flex justify-center shrink-0 pt-1">
              <div className="w-full max-w-md flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={startCountdown}
                  disabled={isCountingDown || !!cameraError}
                  className="phone-modal-cta flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 hover:from-rose-500 hover:to-red-400 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base shadow-xl shadow-rose-950/50 border border-rose-400/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-amber-300 shrink-0" />
                  <span>찰칵! (3초)</span>
                  <span className="phone-key-badge text-[11px] font-normal text-rose-200 bg-rose-800/60 px-2 py-0.5 rounded-md hidden sm:inline">Space</span>
                </button>

                <button
                  type="button"
                  onClick={captureGuideArea}
                  disabled={isCountingDown || !!cameraError}
                  className="phone-modal-cta-sub py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  title="기다리지 않고 즉시 캡처합니다"
                >
                  <span>바로올리기</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 탭 2: 크리스마스캐릭터도안 (팝업창 가득 차는 2x2 카드형 배치 + 하단 단일 소환 버튼) */}
        {activeTab === 'samples' && (
          <div className="phone-modal-body flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-5 gap-3.5">
            {/* 4개의 이미지를 팝업창에 가득 차게 2x2 그리드로 배치 (폰 가로에서는 4열) */}
            <div className="phone-samples-grid grid grid-cols-2 gap-3.5 sm:gap-4 w-full flex-1 min-h-0">
              {[
                { type: 'santa' as const, label: '산타할아버지' },
                { type: 'rudolph' as const, label: '빨간코 루돌프' },
                { type: 'snowman' as const, label: '아기 눈사람' },
                { type: 'tree' as const, label: '크리스마스트리' },
              ].map((item) => {
                const isSelected = selectedSample === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setSelectedSample(item.type)}
                    className={`phone-sample-card relative flex flex-col items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl transition-all text-center cursor-pointer shadow-lg overflow-hidden border-2 h-full ${
                      isSelected
                        ? 'bg-slate-800/95 border-amber-400 ring-4 ring-amber-400/30 shadow-amber-950/40 scale-[1.01]'
                        : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-700/80 hover:border-slate-600 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* 캐릭터 이미지 (별도 내부 박스/테두리 없이 단일 카드 내에 자연스럽게 배치) */}
                    <div className="phone-sample-img-wrap flex-1 w-full min-h-0 flex items-center justify-center p-1.5">
                      <img
                        src={samplePreviews[item.type]}
                        alt={item.label}
                        className="max-h-full max-w-full object-contain filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)] transition-transform duration-200"
                      />
                    </div>

                    {/* 캐릭터 이름만 표시 */}
                    <span
                      className={`phone-sample-label text-base sm:text-lg font-black transition-colors shrink-0 ${
                        isSelected ? 'text-amber-300 drop-shadow' : 'text-slate-200'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 하단 단일 소환하기 버튼 */}
            <div className="w-full flex justify-center shrink-0 pt-1">
              <button
                type="button"
                onClick={() => handleSelectSample(selectedSample)}
                className="phone-modal-cta w-full max-w-md py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 hover:from-rose-500 hover:to-red-400 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base shadow-xl shadow-rose-950/50 border border-rose-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                <span>
                  {selectedSample === 'santa'
                    ? '산타할아버지'
                    : selectedSample === 'rudolph'
                    ? '루돌프'
                    : selectedSample === 'snowman'
                    ? '아기 눈사람'
                    : '크리스마스트리'}{' '}
                  올리기
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 탭 3: 화면에서 직접 그리기 */}
        {activeTab === 'draw' && (
          <div className="phone-modal-body flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-5 gap-3.5">
            {/* 메인 스테이지 */}
            <div className="phone-landscape-row w-full flex-1 min-h-0 flex flex-col items-center justify-center">
              <div className="relative border-2 border-slate-700/80 rounded-2xl overflow-hidden shadow-xl bg-white flex items-center justify-center max-w-full">
                <canvas
                  ref={drawCanvasRef}
                  width={420}
                  height={260}
                  onPointerDown={handleDrawStart}
                  onPointerMove={handleDrawMove}
                  onPointerUp={handleDrawEnd}
                  onPointerLeave={handleDrawEnd}
                  className="phone-draw-canvas cursor-crosshair touch-none w-[340px] sm:w-[420px] h-[210px] sm:h-[240px] object-contain"
                />
              </div>

              {/* 도구 모음 (색상 선택 및 지우기) - 웹캠 탭과 동일한 너비와 패딩 */}
              <div className="phone-controls-bar w-full max-w-md flex items-center justify-between px-3.5 py-1.5 bg-slate-800/60 rounded-xl text-xs text-slate-300 border border-slate-800 shrink-0 mt-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-300 text-xs hidden sm:inline">색상:</span>
                  <div className="flex items-center gap-1.5">
                    {['#E53935', '#2E7D32', '#FFB300', '#1E88E5', '#8D6E63', '#EC4899', '#212121'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDrawColor(c)}
                        style={{ backgroundColor: c }}
                        className={`phone-color-dot w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          drawColor === c ? 'border-amber-400 scale-125 shadow-md' : 'border-slate-700 hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearDrawCanvas}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-600/70 transition-colors cursor-pointer"
                    title="캔버스 내용을 모두 지웁니다"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>지우기</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 하단 단일 일원화된 소환 버튼 바 */}
            <div className="w-full flex justify-center shrink-0 pt-1">
              <button
                type="button"
                onClick={handleSummonDrawn}
                className="phone-modal-cta w-full max-w-md py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 hover:from-rose-500 hover:to-red-400 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base shadow-xl shadow-rose-950/50 border border-rose-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                <span className="phone-only-inline">올리기</span>
                <span className="phone-hide-inline">내가 그린 그림 올리기</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
