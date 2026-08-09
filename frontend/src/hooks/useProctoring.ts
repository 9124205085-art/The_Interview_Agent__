"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPhoneDetector,
  detectPhoneInFrame,
  type PhoneDetector,
} from "@/lib/proctoring/phoneDetection";

export type ProctorViolation = {
  id: string;
  type:
    | "tab_switch"
    | "copy_paste"
    | "camera_covered"
    | "camera_off"
    | "gaze"
    | "phone_detected"
    | "fullscreen_exit";
  message: string;
  at: number;
};

type UseProctoringOptions = {
  enabled: boolean;
  onViolation?: (v: ProctorViolation) => void;
};

function pushViolation(
  list: ProctorViolation[],
  type: ProctorViolation["type"],
  message: string,
): ProctorViolation[] {
  const entry: ProctorViolation = {
    id: `${type}-${Date.now()}`,
    type,
    message,
    at: Date.now(),
  };
  return [entry, ...list].slice(0, 20);
}

function analyzeFrame(data: Uint8ClampedArray): {
  mean: number;
  variance: number;
  skinRatio: number;
  brightClusterRatio: number;
} {
  let sum = 0;
  let sumSq = 0;
  let skin = 0;
  let bright = 0;
  const pixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += lum;
    sumSq += lum * lum;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (r > 95 && g > 40 && b > 20 && r > g && r > b && max - min > 15) {
      skin += 1;
    }
    if (lum > 235) bright += 1;
  }

  const mean = sum / pixels;
  const variance = sumSq / pixels - mean * mean;
  return {
    mean,
    variance,
    skinRatio: skin / pixels,
    brightClusterRatio: bright / pixels,
  };
}

export function useProctoring({ enabled, onViolation }: UseProctoringOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gazeMissRef = useRef(0);
  const phoneStreakRef = useRef(0);
  const lastPhoneReportRef = useRef(0);
  const phoneDetectorRef = useRef<PhoneDetector | null>(null);
  const phoneDetectBusyRef = useRef(false);
  const phonePendingRef = useRef(false);
  const useVisionPhoneRef = useRef(true);
  const phoneModelReadyRef = useRef(false);
  const examFullscreenActiveRef = useRef(false);
  const lastFullscreenViolationRef = useRef(0);
  const [violations, setViolations] = useState<ProctorViolation[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState("Camera idle");

  const report = useCallback(
    (type: ProctorViolation["type"], message: string) => {
      setViolations((prev) => {
        const next = pushViolation(prev, type, message);
        const latest = next[0];
        if (latest) onViolation?.(latest);
        return next;
      });
    },
    [onViolation],
  );

  const startCamera = useCallback(async (): Promise<boolean> => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraReady(true);
      setLiveStatus("Proctoring active");
      return true;
    } catch {
      setCameraError(
        "Webcam access is required. Allow camera permission to start the test.",
      );
      setCameraReady(false);
      return false;
    }
  }, []);

  const bindVideoStream = useCallback(async (): Promise<boolean> => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream) return false;
    if (!video) return false;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    try {
      await video.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setLiveStatus("Camera stopped");
  }, []);

  const reportFullscreenExit = useCallback(
    (message: string) => {
      const now = Date.now();
      if (now - lastFullscreenViolationRef.current < 800) return;
      lastFullscreenViolationRef.current = now;
      report("fullscreen_exit", message);
    },
    [report],
  );

  const notePhoneSignal = useCallback(
    (detected: boolean) => {
      if (detected) {
        phoneStreakRef.current += 1;
      } else {
        phoneStreakRef.current = 0;
        return;
      }

      if (phoneStreakRef.current < 2) return;

      const now = Date.now();
      if (now - lastPhoneReportRef.current < 12_000) return;

      lastPhoneReportRef.current = now;
      phoneStreakRef.current = 0;
      report(
        "phone_detected",
        "Mobile phone or secondary device detected in the webcam — remove it from view.",
      );
      setLiveStatus("Phone detected in frame");
    },
    [report],
  );

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        report(
          "tab_switch",
          "Tab switch or window hidden detected during the interview.",
        );
      }
    };

    const onBlur = () => {
      report("tab_switch", "Interview window lost focus.");
    };

    const blockClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      report("copy_paste", "Copy, cut, or paste is not allowed during the test.");
    };

    const blockContext = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      reportFullscreenExit(
        "ESC pressed during the proctored exam — stay in full screen (−10 integrity points).",
      );
    };

    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        examFullscreenActiveRef.current = true;
        return;
      }
      if (examFullscreenActiveRef.current) {
        reportFullscreenExit(
          "Full-screen mode exited during the test (−10 integrity points). Press ESC is monitored.",
        );
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("copy", blockClipboard);
    document.addEventListener("cut", blockClipboard);
    document.addEventListener("paste", blockClipboard);
    document.addEventListener("contextmenu", blockContext);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
      document.removeEventListener("contextmenu", blockContext);
    };
  }, [enabled, report, reportFullscreenExit]);

  useEffect(() => {
    if (!enabled || !cameraReady) return;

    let cancelled = false;
    phoneModelReadyRef.current = false;
    setLiveStatus("Loading phone detection…");

    void createPhoneDetector()
      .then((detector) => {
        if (cancelled) {
          detector?.dispose();
          return;
        }
        phoneDetectorRef.current = detector;
        if (detector) {
          setLiveStatus("Phone AI ready · monitoring");
        } else {
          setLiveStatus("Using backup phone detection…");
        }
      })
      .finally(() => {
        if (!cancelled) phoneModelReadyRef.current = true;
      });

    return () => {
      cancelled = true;
      phoneDetectorRef.current?.dispose();
      phoneDetectorRef.current = null;
    };
  }, [cameraReady, enabled]);

  useEffect(() => {
    if (!enabled || !cameraReady) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      const stream = streamRef.current;
      if (!video || !stream) return;

      const track = stream.getVideoTracks()[0];
      if (!track || track.readyState !== "live") {
        report("camera_off", "Webcam was turned off or disconnected.");
        setLiveStatus("Camera offline");
        return;
      }

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const stats = analyzeFrame(frame.data);

      if (stats.mean < 35 || (stats.variance < 12 && stats.mean < 55)) {
        report(
          "camera_covered",
          "Webcam appears covered or blocked. Uncover the camera to continue.",
        );
        setLiveStatus("Camera covered");
        phoneStreakRef.current = 0;
        phonePendingRef.current = false;
        return;
      }

      const runPhoneDetection = () => {
        if (phoneDetectBusyRef.current || !phoneModelReadyRef.current) return;

        phoneDetectBusyRef.current = true;
        void detectPhoneInFrame(
          canvas,
          frame.data,
          phoneDetectorRef.current,
          useVisionPhoneRef.current,
        )
          .then(({ phone, visionEnabled }) => {
            useVisionPhoneRef.current = visionEnabled;
            phonePendingRef.current = phone;
            notePhoneSignal(phone);
          })
          .finally(() => {
            phoneDetectBusyRef.current = false;
          });
      };

      runPhoneDetection();

      if (stats.skinRatio < 0.03) {
        gazeMissRef.current += 1;
        if (gazeMissRef.current >= 3) {
          report(
            "gaze",
            "Face not visible — keep your gaze toward the screen and stay in frame.",
          );
          gazeMissRef.current = 0;
        }
        setLiveStatus("Face not in frame");
      } else if (phonePendingRef.current) {
        gazeMissRef.current = 0;
        setLiveStatus("Phone detected — remove from view");
      } else if (!phoneDetectorRef.current && !useVisionPhoneRef.current) {
        gazeMissRef.current = 0;
        setLiveStatus("Monitoring: OK");
      } else if (phoneDetectBusyRef.current) {
        gazeMissRef.current = 0;
        setLiveStatus("Scanning for phone…");
      } else {
        gazeMissRef.current = 0;
        setLiveStatus("Monitoring: OK");
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [cameraReady, enabled, notePhoneSignal, report]);

  useEffect(() => {
    if (!enabled || !cameraReady || !streamRef.current) return;
    void bindVideoStream();
  }, [bindVideoStream, cameraReady, enabled]);

  useEffect(() => {
    if (!enabled) {
      stopCamera();
      setViolations([]);
      gazeMissRef.current = 0;
      phoneStreakRef.current = 0;
      lastPhoneReportRef.current = 0;
      phonePendingRef.current = false;
      phoneModelReadyRef.current = false;
      useVisionPhoneRef.current = true;
      phoneDetectorRef.current?.dispose();
      phoneDetectorRef.current = null;
      examFullscreenActiveRef.current = false;
      lastFullscreenViolationRef.current = 0;
    }
  }, [enabled, stopCamera]);

  return {
    videoRef,
    violations,
    cameraReady,
    cameraError,
    liveStatus,
    startCamera,
    stopCamera,
    bindVideoStream,
    report,
  };
}
