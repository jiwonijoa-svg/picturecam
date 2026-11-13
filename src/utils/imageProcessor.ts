/**
 * 이미지 처리 및 루마키(Luma-key) 배경 투명화 모듈
 * 웹캠에서 캡처한 도안 종이의 흰색/밝은 회색 배경을 분석하여 투명화하고,
 * 아이가 색칠한 유색/외곽선 픽셀만 스프라이트로 추출합니다.
 */

export interface ProcessResult {
  spriteCanvas: HTMLCanvasElement;
  width: number;
  height: number;
  dataUrl: string;
  creatorName?: string;
}

/**
 * 캡처된 캔버스 이미지에서 종이 배경 제거 (루마키 + 채도 보존 알고리즘)
 * @param sourceCanvas 캡처된 원본 가이드 영역 캔버스
 * @param threshold 밝기 임계값 (기본 215, 180~240 범위 조절 가능)
 * @param feather 부드러운 경계 처리 페더값
 */
export function removePaperBackground(
  sourceCanvas: HTMLCanvasElement,
  threshold: number = 200,
  feather: number = 14
): ProcessResult {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  // 원본 픽셀 데이터 획득을 위한 임시 캔버스
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get 2d context');

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. 외곽 테두리 영역(상하좌우 8% 여백)에서 실제 종이 배경 색상 및 밝기 자동 감지 (Adaptive Paper Calibration)
  const borderMarginX = Math.max(6, Math.floor(w * 0.08));
  const borderMarginY = Math.max(6, Math.floor(h * 0.08));

  let paperSamplesR = 0;
  let paperSamplesG = 0;
  let paperSamplesB = 0;
  let sampleCount = 0;
  const lumaSamples: number[] = [];

  for (let y = 0; y < h; y += 3) {
    for (let x = 0; x < w; x += 3) {
      const isBorder =
        x < borderMarginX || x >= w - borderMarginX ||
        y < borderMarginY || y >= h - borderMarginY;

      if (!isBorder) continue;

      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 50) continue;

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);

      // 너무 어두운 그림자나 진한 펜선(luma < 80 또는 chroma > 65)을 제외한 종이 배경 후보 수집
      if (luma > 85 && chroma < 65) {
        lumaSamples.push(luma);
        paperSamplesR += r;
        paperSamplesG += g;
        paperSamplesB += b;
        sampleCount++;
      }
    }
  }

  // 감지된 종이 특성 계산
  let detectedPaperLuma = 220;
  let paperR = 230;
  let paperG = 230;
  let paperB = 225;

  if (sampleCount > 20 && lumaSamples.length > 0) {
    lumaSamples.sort((a, b) => a - b);
    const p75Idx = Math.floor(lumaSamples.length * 0.75);
    detectedPaperLuma = lumaSamples[p75Idx];
    paperR = Math.round(paperSamplesR / sampleCount);
    paperG = Math.round(paperSamplesG / sampleCount);
    paperB = Math.round(paperSamplesB / sampleCount);
  }

  const paperChroma = Math.max(paperR, paperG, paperB) - Math.min(paperR, paperG, paperB);

  // 사용자 슬라이더(threshold 기본 200)에 따른 적응형 임계값 계산
  const sensitivityOffset = (threshold - 200) * 0.45;
  const effectiveThreshold = Math.max(90, Math.min(245, detectedPaperLuma - 18 - sensitivityOffset));

  // 2. 외곽 테두리 연결 플러드필(Flood-Fill) 배경 판별
  // 종이 배경은 이미지 가장자리 전체를 둘러싸고 있으므로, 가장자리에서 연결된 종이 영역을 확실하게 추적
  const totalPixels = w * h;
  const isBackground = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let queueHead = 0;
  let queueTail = 0;

  // 종이 색상 일치 판별 헬퍼
  const isPaperPixel = (r: number, g: number, b: number, luma: number, chroma: number): boolean => {
    // A. 기준 종이 색상과의 RGB 거리
    const dr = r - paperR;
    const dg = g - paperG;
    const db = b - paperB;
    const distSq = dr * dr + dg * dg + db * db;
    if (distSq < 52 * 52) return true;

    // B. 적응형 임계값 이상이면서 채도가 종이 특성에 가까운 픽셀
    if (luma >= effectiveThreshold) {
      if (chroma <= Math.max(48, paperChroma + 22)) return true;
    }

    // C. 종이 구김이나 조명 그림자로 인해 약간 어두워진 종이 영역
    if (luma >= effectiveThreshold - 26 && chroma <= Math.max(34, paperChroma + 12)) {
      if (distSq < 68 * 68) return true;
    }

    return false;
  };

  // 가장자리 4면의 픽셀을 플러드필 시드로 등록
  for (let x = 0; x < w; x++) {
    // 상단
    const idxTop = x;
    const pTop = idxTop * 4;
    const lumaTop = 0.299 * data[pTop] + 0.587 * data[pTop + 1] + 0.114 * data[pTop + 2];
    const chromaTop = Math.max(data[pTop], data[pTop + 1], data[pTop + 2]) - Math.min(data[pTop], data[pTop + 1], data[pTop + 2]);
    if (isPaperPixel(data[pTop], data[pTop + 1], data[pTop + 2], lumaTop, chromaTop)) {
      isBackground[idxTop] = 1;
      queue[queueTail++] = idxTop;
    }

    // 하단
    const idxBottom = (h - 1) * w + x;
    const pBottom = idxBottom * 4;
    const lumaBottom = 0.299 * data[pBottom] + 0.587 * data[pBottom + 1] + 0.114 * data[pBottom + 2];
    const chromaBottom = Math.max(data[pBottom], data[pBottom + 1], data[pBottom + 2]) - Math.min(data[pBottom], data[pBottom + 1], data[pBottom + 2]);
    if (isPaperPixel(data[pBottom], data[pBottom + 1], data[pBottom + 2], lumaBottom, chromaBottom)) {
      isBackground[idxBottom] = 1;
      queue[queueTail++] = idxBottom;
    }
  }

  for (let y = 1; y < h - 1; y++) {
    // 좌측
    const idxLeft = y * w;
    const pLeft = idxLeft * 4;
    const lumaLeft = 0.299 * data[pLeft] + 0.587 * data[pLeft + 1] + 0.114 * data[pLeft + 2];
    const chromaLeft = Math.max(data[pLeft], data[pLeft + 1], data[pLeft + 2]) - Math.min(data[pLeft], data[pLeft + 1], data[pLeft + 2]);
    if (isPaperPixel(data[pLeft], data[pLeft + 1], data[pLeft + 2], lumaLeft, chromaLeft)) {
      isBackground[idxLeft] = 1;
      queue[queueTail++] = idxLeft;
    }

    // 우측
    const idxRight = y * w + (w - 1);
    const pRight = idxRight * 4;
    const lumaRight = 0.299 * data[pRight] + 0.587 * data[pRight + 1] + 0.114 * data[pRight + 2];
    const chromaRight = Math.max(data[pRight], data[pRight + 1], data[pRight + 2]) - Math.min(data[pRight], data[pRight + 1], data[pRight + 2]);
    if (isPaperPixel(data[pRight], data[pRight + 1], data[pRight + 2], lumaRight, chromaRight)) {
      isBackground[idxRight] = 1;
      queue[queueTail++] = idxRight;
    }
  }

  // 4방향 플러드필 수행 (그림 외곽의 종이 배경을 완전 소거)
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
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);

        if (isPaperPixel(r, g, b, luma, chroma)) {
          isBackground[nIdx] = 1;
          queue[queueTail++] = nIdx;
        }
      }
    }
  }

  // 3. 최종 알파 채널 결정 및 바운딩 박스 계산
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let hasDrawnPixels = false;

  for (let i = 0; i < totalPixels; i++) {
    const p = i * 4;
    const a = data[p + 3];
    if (a < 10) continue;

    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);

    let finalAlpha = a;

    if (isBackground[i] === 1) {
      // 테두리에서 연결된 종이 배경: 100% 완전 투명화
      finalAlpha = 0;
    } else {
      // 내부 픽셀: 외곽선으로 막혀있지 않은 독립 종이 영역 또는 그림 내부
      if (chroma < Math.max(34, paperChroma + 10)) {
        if (luma >= effectiveThreshold) {
          finalAlpha = 0;
        } else if (luma > effectiveThreshold - feather) {
          const ratio = (effectiveThreshold - luma) / feather;
          finalAlpha = Math.floor(a * Math.max(0, Math.min(1, ratio)));
        }
      } else {
        // 채도가 높은 픽셀 (아이의 마커/색연필/크레파스 채색): 완전 보존
        if (luma > 248 && chroma < 35) {
          finalAlpha = 0;
        }
      }
    }

    data[p + 3] = finalAlpha;

    // 유효 그림 픽셀의 바운딩 박스 추적
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

  // 변경된 알파 채널 다시 적용
  ctx.putImageData(imgData, 0, 0);

  // 유효 그림이 감지되지 않은 경우의 세이프티 가드
  if (!hasDrawnPixels || maxX <= minX || maxY <= minY) {
    minX = Math.floor(w * 0.15);
    maxX = Math.floor(w * 0.85);
    minY = Math.floor(h * 0.15);
    maxY = Math.floor(h * 0.85);
  }

  // 4. 여백(Padding) 추가 및 최종 스프라이트 캔버스 생성
  const padding = 8;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(w - cropX, maxX - minX + padding * 2);
  const cropH = Math.min(h - cropY, maxY - minY + padding * 2);

  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = cropW;
  spriteCanvas.height = cropH;
  const sCtx = spriteCanvas.getContext('2d');
  if (sCtx) {
    sCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  }

  return {
    spriteCanvas,
    width: cropW,
    height: cropH,
    dataUrl: spriteCanvas.toDataURL('image/png'),
  };
}

/**
 * 투명 캔버스에 직접 그려진 도안의 바운딩 박스를 계산하여 트리밍합니다.
 * (흰색 수염, 흰색 눈사람 등 캐릭터 내부의 흰색을 100% 완전 보존)
 */
export function trimTransparentCanvas(canvas: HTMLCanvasElement): ProcessResult {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get context');

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let hasPixels = false;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a > 15) {
      const idx = i / 4;
      const x = idx % w;
      const y = Math.floor(idx / w);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      hasPixels = true;
    }
  }

  if (!hasPixels || maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = w;
    maxY = h;
  }

  const padding = 8;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(w - cropX, maxX - minX + padding * 2);
  const cropH = Math.min(h - cropY, maxY - minY + padding * 2);

  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = cropW;
  spriteCanvas.height = cropH;
  const sCtx = spriteCanvas.getContext('2d');
  if (sCtx) {
    sCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  }

  return {
    spriteCanvas,
    width: cropW,
    height: cropH,
    dataUrl: spriteCanvas.toDataURL('image/png'),
  };
}

/**
 * 카메라가 없거나 빠른 시연을 위한 내장 크리스마스 캐릭터 도안 생성기
 * (순수 HTML5 Canvas 벡터 패스로 생성, 외부 링크 제로)
 */
export function generateSampleDrawing(
  type: 'santa' | 'rudolph' | 'snowman' | 'tree'
): ProcessResult {
  const size = 360;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'santa') {
    // 🎅 귀여운 크리스마스 산타할아버지 (전신 풀바디: 모자가 머리에 자연스럽게 씌워진 도안)
    // 1. 얼굴/머리 (모자 아래에 먼저 그려 모자가 이마 위에 덮이도록 배치)
    ctx.fillStyle = '#FFD5B4';
    ctx.beginPath();
    ctx.arc(180, 126, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. 모자 (머리 위에 제대로 푹 씌워짐)
    // 붉은 모자 삼각 고깔
    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.moveTo(116, 96);
    ctx.quadraticCurveTo(145, 20, 225, 28);
    ctx.quadraticCurveTo(270, 48, 258, 98);
    ctx.lineTo(240, 96);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 모자 끝 하얀 방울 (순백색)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(260, 104, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 모자 털 테두리 (순백색: 이마 윗부분을 둥글고 포근하게 감쌈)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(102, 84, 156, 28, 14);
    ctx.fill();
    ctx.stroke();

    // 3. 이목구비
    // 초롱초롱한 눈
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(164, 122, 5, 0, Math.PI * 2);
    ctx.arc(196, 122, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(166, 120, 2, 0, Math.PI * 2);
    ctx.arc(198, 120, 2, 0, Math.PI * 2);
    ctx.fill();

    // 붉은 코
    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.arc(180, 134, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 볼터치
    ctx.fillStyle = 'rgba(255, 138, 128, 0.65)';
    ctx.beginPath();
    ctx.arc(148, 135, 7.5, 0, Math.PI * 2);
    ctx.arc(212, 135, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 풍성한 수염 (완전한 순백색 유지)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(135, 138);
    ctx.quadraticCurveTo(124, 210, 180, 218);
    ctx.quadraticCurveTo(236, 210, 225, 138);
    ctx.quadraticCurveTo(200, 164, 180, 150);
    ctx.quadraticCurveTo(160, 164, 135, 138);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. 다리 & 부츠 (전신: 몸통 뒤에 먼저 그려 자연스러운 깊이감)
    // 빨간 바지
    ctx.fillStyle = '#C62828';
    ctx.beginPath();
    ctx.roundRect(144, 255, 28, 42, 6);
    ctx.roundRect(188, 255, 28, 42, 6);
    ctx.fill();
    ctx.stroke();

    // 검은 부츠
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.roundRect(138, 286, 38, 26, [10, 10, 6, 6]);
    ctx.roundRect(184, 286, 38, 26, [10, 10, 6, 6]);
    ctx.fill();
    ctx.stroke();

    // 부츠 흰 털 테두리 (순백색)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(136, 282, 42, 11, 5);
    ctx.roundRect(182, 282, 42, 11, 5);
    ctx.fill();
    ctx.stroke();

    // 4. 산타 코트 몸통
    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.roundRect(130, 180, 100, 85, [18, 18, 10, 10]);
    ctx.fill();
    ctx.stroke();

    // 코트 아랫단 흰 털 테두리 (순백색)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(124, 252, 112, 16, 8);
    ctx.fill();
    ctx.stroke();

    // 코트 앞단 세로 흰 털
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(173, 180, 14, 75);

    // 벨트
    ctx.fillStyle = '#212121';
    ctx.fillRect(130, 218, 100, 16);
    // 황금 버클
    ctx.fillStyle = '#FBC02D';
    ctx.fillRect(166, 214, 28, 24);
    ctx.strokeStyle = '#F57F17';
    ctx.lineWidth = 2;
    ctx.strokeRect(166, 214, 28, 24);
    ctx.fillStyle = '#212121';
    ctx.fillRect(174, 220, 12, 12);
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 4;

    // 5. 귀여운 팔과 초록 장갑 (한쪽 손은 반갑게 흔들기)
    // 왼쪽 팔 (우리 기준 왼쪽)
    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.roundRect(98, 188, 38, 22, 10);
    ctx.fill();
    ctx.stroke();
    // 왼쪽 소매 털 (순백색)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(92, 187, 12, 24, 6);
    ctx.fill();
    ctx.stroke();
    // 왼쪽 장갑 (초록 요정 장갑)
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(86, 199, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 오른쪽 팔 (우리 기준 오른쪽, 손 흔들기)
    ctx.save();
    ctx.translate(225, 195);
    ctx.rotate(-0.45);
    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.roundRect(0, -11, 40, 22, 10);
    ctx.fill();
    ctx.stroke();
    // 오른쪽 소매 털 (순백색)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(35, -12, 12, 24, 6);
    ctx.fill();
    ctx.stroke();
    // 오른쪽 장갑 (손 흔들기)
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(52, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (type === 'rudolph') {
    // 🦌 빨간 코 루돌프 (전신 풀바디: 뿔, 귀, 얼굴, 목도리, 몸통, 꼬리, 네 발/굽)
    // 1. 다리와 굽 (몸통 뒤에 먼저 그림)
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 4;

    // 뒷다리 (조금 뒤)
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.roundRect(138, 250, 18, 48, 6);
    ctx.roundRect(204, 250, 18, 48, 6);
    ctx.fill();
    ctx.stroke();

    // 뒷발 굽
    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.roundRect(136, 286, 22, 14, 4);
    ctx.roundRect(202, 286, 22, 14, 4);
    ctx.fill();
    ctx.stroke();

    // 앞다리 (앞쪽)
    ctx.fillStyle = '#A1887F';
    ctx.beginPath();
    ctx.roundRect(154, 255, 20, 52, 7);
    ctx.roundRect(186, 255, 20, 52, 7);
    ctx.fill();
    ctx.stroke();

    // 앞발 굽
    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.roundRect(152, 295, 24, 14, 4);
    ctx.roundRect(184, 295, 24, 14, 4);
    ctx.fill();
    ctx.stroke();

    // 2. 꼬리 (왼쪽 뒤)
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.ellipse(126, 218, 14, 18, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 꼬리 팁 (크림 흰색)
    ctx.fillStyle = '#EFEBE9';
    ctx.beginPath();
    ctx.arc(120, 212, 8, 0, Math.PI * 2);
    ctx.fill();

    // 3. 통통한 사슴 몸통
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.ellipse(180, 225, 52, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 가슴/배 크림색 털
    ctx.fillStyle = '#EFEBE9';
    ctx.beginPath();
    ctx.ellipse(180, 230, 32, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. 뿔
    ctx.fillStyle = '#8D6E63';
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 4;

    // 왼쪽 뿔
    ctx.beginPath();
    ctx.moveTo(145, 95);
    ctx.lineTo(115, 38);
    ctx.lineTo(100, 52);
    ctx.moveTo(115, 38);
    ctx.lineTo(125, 24);
    ctx.stroke();

    // 오른쪽 뿔
    ctx.beginPath();
    ctx.moveTo(215, 95);
    ctx.lineTo(245, 38);
    ctx.lineTo(260, 52);
    ctx.moveTo(245, 38);
    ctx.lineTo(235, 24);
    ctx.stroke();

    // 5. 귀
    ctx.fillStyle = '#A1887F';
    ctx.beginPath();
    ctx.ellipse(122, 115, 15, 26, -0.5, 0, Math.PI * 2);
    ctx.ellipse(238, 115, 15, 26, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 귓속 핑크
    ctx.fillStyle = '#FFCDD2';
    ctx.beginPath();
    ctx.ellipse(122, 115, 8, 16, -0.5, 0, Math.PI * 2);
    ctx.ellipse(238, 115, 8, 16, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 6. 얼굴
    ctx.fillStyle = '#BCAAA4';
    ctx.beginPath();
    ctx.ellipse(180, 135, 48, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 입/주둥이
    ctx.fillStyle = '#EFEBE9';
    ctx.beginPath();
    ctx.ellipse(180, 156, 34, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 눈 (초롱초롱한 아기 사슴 눈)
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(162, 126, 6.5, 0, Math.PI * 2);
    ctx.arc(198, 126, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(164, 123, 2.5, 0, Math.PI * 2);
    ctx.arc(200, 123, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 볼터치
    ctx.fillStyle = 'rgba(255, 138, 128, 0.55)';
    ctx.beginPath();
    ctx.arc(150, 145, 6, 0, Math.PI * 2);
    ctx.arc(210, 145, 6, 0, Math.PI * 2);
    ctx.fill();

    // 반짝이는 빨간 코
    ctx.fillStyle = '#FF1744';
    ctx.beginPath();
    ctx.arc(180, 152, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 코 반사광
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(175, 147, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 7. 초록 목도리 (목을 두르고 자락이 늘어짐)
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.roundRect(135, 180, 90, 22, 10);
    ctx.fill();
    ctx.stroke();

    // 목도리 줄무늬
    ctx.fillStyle = '#C62828';
    ctx.fillRect(152, 180, 12, 22);
    ctx.fillRect(184, 180, 12, 22);

    // 늘어진 목도리 자락
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.roundRect(196, 196, 18, 30, [4, 4, 8, 8]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#C62828';
    ctx.fillRect(196, 210, 18, 8);
  } else if (type === 'snowman') {
    // ⛄ 아기 눈사람
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 4;

    // 모자
    ctx.fillStyle = '#37474F';
    ctx.fillRect(130, 45, 60, 45);
    ctx.fillRect(115, 85, 90, 12);
    ctx.fillStyle = '#D32F2F';
    ctx.fillRect(130, 75, 60, 10);

    // 머리
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(160, 140, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 눈
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(145, 130, 4, 0, Math.PI * 2);
    ctx.arc(175, 130, 4, 0, Math.PI * 2);
    ctx.fill();

    // 당근 코
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.moveTo(160, 138);
    ctx.lineTo(195, 145);
    ctx.lineTo(160, 150);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 미소 입
    ctx.fillStyle = '#263238';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(160 + i * 8, 160 + Math.abs(i) * 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 빨간 목도리
    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.roundRect(122, 175, 76, 18, 8);
    ctx.fill();
    ctx.stroke();
    // 목도리 끝자락
    ctx.fillRect(165, 190, 16, 35);
    ctx.strokeRect(165, 190, 16, 35);

    // 몸통
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(160, 245, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 단추
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(150, 230, 4.5, 0, Math.PI * 2);
    ctx.arc(150, 255, 4.5, 0, Math.PI * 2);
    ctx.arc(150, 280, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 나뭇가지 팔
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 4;
    // 왼쪽 팔
    ctx.beginPath();
    ctx.moveTo(105, 230);
    ctx.lineTo(65, 200);
    ctx.moveTo(75, 207);
    ctx.lineTo(75, 190);
    ctx.stroke();
    // 오른쪽 팔
    ctx.beginPath();
    ctx.moveTo(215, 230);
    ctx.lineTo(255, 205);
    ctx.moveTo(245, 212);
    ctx.lineTo(252, 195);
    ctx.stroke();
  } else {
    // 🎄 장식된 크리스마스트리
    ctx.strokeStyle = '#1B5E20';
    ctx.lineWidth = 4;

    // 맨 위 별
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    const cx = 160;
    const cy = 60;
    const spikes = 5;
    const outerRadius = 24;
    const innerRadius = 11;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#F57F17';
    ctx.stroke();

    // 트리 1단
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.moveTo(160, 75);
    ctx.lineTo(210, 135);
    ctx.lineTo(185, 135);
    ctx.lineTo(230, 195);
    ctx.lineTo(205, 195);
    ctx.lineTo(250, 260);
    ctx.lineTo(70, 260);
    ctx.lineTo(115, 195);
    ctx.lineTo(90, 195);
    ctx.lineTo(135, 135);
    ctx.lineTo(110, 135);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1B5E20';
    ctx.stroke();

    // 화려한 오너먼트 구슬들
    const baubles = [
      { x: 130, y: 130, c: '#E53935' },
      { x: 175, y: 120, c: '#FFB300' },
      { x: 120, y: 185, c: '#00E676' },
      { x: 160, y: 175, c: '#00E5FF' },
      { x: 195, y: 180, c: '#E040FB' },
      { x: 100, y: 245, c: '#FFD700' },
      { x: 145, y: 235, c: '#FF1744' },
      { x: 185, y: 245, c: '#00E676' },
      { x: 220, y: 240, c: '#FF9100' },
    ];
    baubles.forEach((b) => {
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 나무 기둥
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(145, 260, 30, 45);
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 3;
    ctx.strokeRect(145, 260, 30, 45);
  }

  // 흰색(수염, 눈사람 몸통 등)이 루마키로 지워지지 않고 100% 완전하게 표현되도록 투명 바운딩 트리밍 적용
  return trimTransparentCanvas(canvas);
}
