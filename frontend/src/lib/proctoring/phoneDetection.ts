/** Minimum COCO confidence for "cell phone" (0–1). */
export const PHONE_SCORE_THRESHOLD = 0.35;

const MIN_BBOX_AREA_RATIO = 0.004;
const MAX_BBOX_AREA_RATIO = 0.5;

export type PhoneDetector = {
  detectCanvas: (canvas: HTMLCanvasElement) => Promise<boolean>;
  dispose: () => void;
};

type CocoPrediction = {
  class: string;
  score: number;
  bbox: [number, number, number, number];
};

function isValidPhoneBox(
  pred: CocoPrediction,
  videoWidth: number,
  videoHeight: number,
): boolean {
  if (pred.class !== "cell phone") return false;
  if (pred.score < PHONE_SCORE_THRESHOLD) return false;

  const [x, y, w, h] = pred.bbox;
  if (w <= 0 || h <= 0) return false;

  const frameArea = videoWidth * videoHeight;
  const boxArea = w * h;
  const areaRatio = boxArea / frameArea;
  if (areaRatio < MIN_BBOX_AREA_RATIO || areaRatio > MAX_BBOX_AREA_RATIO) {
    return false;
  }

  const aspect = w / h;
  if (aspect < 0.18 || aspect > 3.2) return false;

  return true;
}

function runCocoOnSource(
  model: { detect: (input: HTMLCanvasElement) => Promise<CocoPrediction[]> },
  canvas: HTMLCanvasElement,
): Promise<boolean> {
  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return Promise.resolve(false);

  return model.detect(canvas).then((predictions) =>
    predictions.some((p) => isValidPhoneBox(p, w, h)),
  );
}

/** Loads COCO-SSD in the browser. */
export async function createPhoneDetector(): Promise<PhoneDetector | null> {
  try {
    const tf = await import("@tensorflow/tfjs");
    try {
      await tf.setBackend("webgl");
      await tf.ready();
    } catch {
      await tf.setBackend("cpu");
      await tf.ready();
    }

    const coco = await import("@tensorflow-models/coco-ssd");
    const model = await coco.load();

    let disposed = false;

    return {
      detectCanvas(canvas: HTMLCanvasElement) {
        if (disposed) return Promise.resolve(false);
        return runCocoOnSource(model, canvas);
      },
      dispose() {
        disposed = true;
      },
    };
  } catch {
    return null;
  }
}

function luminance(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): number {
  const i = (y * width + x) * 4;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
}

/** Fallback when ML / vision API unavailable — tuned for handheld screen in frame. */
export function detectPhoneHeuristic(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  const cols = 14;
  const rows = 10;
  const cellW = Math.max(4, Math.floor(width / cols));
  const cellH = Math.max(4, Math.floor(height / rows));

  const active = new Set<string>();

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = col * cellW;
      const y0 = row * cellH;
      let sum = 0;
      let sumSq = 0;
      let edgeSum = 0;
      let n = 0;

      for (let y = y0; y < Math.min(y0 + cellH, height - 1); y += 2) {
        for (let x = x0; x < Math.min(x0 + cellW, width - 1); x += 2) {
          const lum = luminance(data, width, x, y);
          sum += lum;
          sumSq += lum * lum;
          edgeSum +=
            Math.abs(lum - luminance(data, width, x + 1, y)) +
            Math.abs(lum - luminance(data, width, x, y + 1));
          n += 1;
        }
      }
      if (n === 0) continue;
      const mean = sum / n;
      const variance = Math.max(0, sumSq / n - mean * mean);
      const edge = edgeSum / n;

      const screenLike =
        variance > 220 && mean > 50 && mean < 240 && edge > 10;
      if (screenLike) active.add(`${row},${col}`);
    }
  }

  let bestArea = 0;
  let bestAspect = 0;
  const seen = new Set<string>();

  for (const key of active) {
    if (seen.has(key)) continue;
    const queue = [key];
    seen.add(key);
    let minR = rows;
    let maxR = 0;
    let minC = cols;
    let maxC = 0;
    let area = 0;

    while (queue.length > 0) {
      const cur = queue.pop()!;
      const [rs, cs] = cur.split(",");
      const r = Number(rs);
      const c = Number(cs);
      area += 1;
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
      for (const [nr, nc] of [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ]) {
        const nk = `${nr},${nc}`;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (!active.has(nk) || seen.has(nk)) continue;
        seen.add(nk);
        queue.push(nk);
      }
    }

    const bw = maxC - minC + 1;
    const bh = maxR - minR + 1;
    if (area > bestArea) {
      bestArea = area;
      bestAspect = bw / Math.max(1, bh);
    }
  }

  const gridArea = rows * cols;
  if (bestArea < gridArea * 0.02 || bestArea > gridArea * 0.32) return false;
  const portrait = bestAspect >= 0.35 && bestAspect <= 0.85;
  const landscape = bestAspect >= 1.15 && bestAspect <= 2.4;
  return portrait || landscape;
}

export function captureFrameBase64(
  canvas: HTMLCanvasElement,
  maxWidth = 512,
): string {
  const srcW = canvas.width;
  const srcH = canvas.height;
  if (srcW <= 0 || srcH <= 0) return "";

  const scale = Math.min(1, maxWidth / srcW);
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const scratch = document.createElement("canvas");
  scratch.width = outW;
  scratch.height = outH;
  const ctx = scratch.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(canvas, 0, 0, outW, outH);
  const dataUrl = scratch.toDataURL("image/jpeg", 0.75);
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : "";
}

export type VisionPhoneResult = {
  phone: boolean;
  visionEnabled: boolean;
};

export async function detectPhoneViaVisionApi(
  canvas: HTMLCanvasElement,
): Promise<VisionPhoneResult> {
  const imageBase64 = captureFrameBase64(canvas);
  if (!imageBase64) return { phone: false, visionEnabled: false };

  const res = await fetch("/api/proctor/detect-phone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) return { phone: false, visionEnabled: false };
  const data = (await res.json()) as {
    phone?: boolean;
    visionEnabled?: boolean;
  };
  return {
    phone: data.phone === true,
    visionEnabled: data.visionEnabled === true,
  };
}

/** Combines COCO, vision API, and heuristic fallback. */
export async function detectPhoneInFrame(
  canvas: HTMLCanvasElement,
  frameData: Uint8ClampedArray,
  detector: PhoneDetector | null,
  visionEnabled: boolean,
): Promise<{ phone: boolean; visionEnabled: boolean }> {
  let visionActive = visionEnabled;

  if (detector) {
    const cocoHit = await detector.detectCanvas(canvas);
    if (cocoHit) return { phone: true, visionEnabled: visionActive };
  }

  if (visionActive) {
    const vision = await detectPhoneViaVisionApi(canvas);
    visionActive = vision.visionEnabled;
    if (vision.phone) return { phone: true, visionEnabled: visionActive };
  }

  const heuristic = detectPhoneHeuristic(frameData, canvas.width, canvas.height);
  return { phone: heuristic, visionEnabled: visionActive };
}
