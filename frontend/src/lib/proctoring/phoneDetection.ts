/** Minimum COCO confidence for "cell phone" (0–1). */
export const PHONE_SCORE_THRESHOLD = 0.48;

/** Fraction of frame area the bounding box must cover. */
const MIN_BBOX_AREA_RATIO = 0.008;
const MAX_BBOX_AREA_RATIO = 0.42;

export type PhoneDetector = {
  detect: (video: HTMLVideoElement) => Promise<boolean>;
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
  if (aspect < 0.22 || aspect > 2.8) return false;

  if (x + w < 0 || y + h < 0 || x > videoWidth || y > videoHeight) {
    return false;
  }

  return true;
}

/** Loads COCO-SSD in the browser and detects cell phones in webcam frames. */
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
    const model = await coco.load({ base: "lite_mobilenet_v2" });

    let disposed = false;

    return {
      async detect(video: HTMLVideoElement) {
        if (disposed || video.readyState < 2) return false;

        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        const predictions = (await model.detect(video)) as CocoPrediction[];

        return predictions.some((p) => isValidPhoneBox(p, w, h));
      },
      dispose() {
        disposed = true;
      },
    };
  } catch {
    return null;
  }
}

/** JPEG base64 (no data: prefix) for vision API fallback. */
export function captureFrameBase64(
  canvas: HTMLCanvasElement,
  maxWidth = 480,
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
  const dataUrl = scratch.toDataURL("image/jpeg", 0.72);
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : "";
}

export async function detectPhoneViaVisionApi(
  canvas: HTMLCanvasElement,
): Promise<boolean> {
  const imageBase64 = captureFrameBase64(canvas);
  if (!imageBase64) return false;

  const res = await fetch("/api/proctor/detect-phone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { phone?: boolean };
  return data.phone === true;
}
