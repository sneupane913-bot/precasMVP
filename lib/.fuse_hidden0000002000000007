'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlagType } from '@/lib/types';

export interface LiveFlag {
  type: FlagType;
  at: number;
}

/**
 * How many times each problem may be raised in one session.
 *
 * Environment problems are capped hard. A student practising at home in Nepal
 * will have a fan, a street, a family. That is normal and it is not cheating.
 * Say it once or twice so they know the interviewer will hear it, then stop.
 * The competitor logged 40 violations in five questions and the number became
 * meaningless noise in its own right.
 *
 * Integrity problems (leaving the screen, another person in view) are capped
 * far higher, because those genuinely matter and repetition is the signal.
 */
const MAX_PER_TYPE: Partial<Record<FlagType, number>> = {
  background_noise: 2,
  low_light: 2,
  face_not_visible: 4,
  answer_too_short: 3,
  no_audio: 3,
  fullscreen_exit: 2,
  tab_switch: 20,
  window_blur: 20,
  multiple_faces: 10,
};

/**
 * Loudness of the quiet moments, above which we call the room noisy.
 *
 * Deliberately high. This is not "we can hear something", it is "this is loud
 * enough that the interviewer will struggle to hear you". A ceiling fan and
 * distant traffic sit around 0.02 to 0.05 and must NOT trigger it.
 */
const NOISE_FLOOR_THRESHOLD = 0.085;

/**
 * Live proctoring monitor.
 *
 * Detects, in order of reliability:
 *  - tab switch and window blur      (Page Visibility API, exact)
 *  - fullscreen exit                 (exact)
 *  - low light                       (canvas luminance sampling)
 *  - face not visible / multiple     (FaceDetector where available, else a
 *                                     luminance-variance heuristic)
 *  - background noise                (Web Audio RMS during non-speech)
 *
 * Every detection is debounced per type so a single event does not produce a
 * hundred flags. The competitor accumulated 40 violations in five questions,
 * which made the number meaningless.
 */
export function useMonitor(args: {
  sessionId: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  audioStream: MediaStream | null;
  currentQuestionId: string | null;
  enabled: boolean;
}) {
  const { sessionId, videoRef, audioStream, currentQuestionId, enabled } = args;

  const [flags, setFlags] = useState<LiveFlag[]>([]);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const lastFiredRef = useRef<Partial<Record<FlagType, number>>>({});
  const countsRef = useRef<Partial<Record<FlagType, number>>>({});
  const questionRef = useRef<string | null>(currentQuestionId);
  questionRef.current = currentQuestionId;

  const raise = useCallback(
    (type: FlagType, cooldownMs = 6000) => {
      const now = Date.now();
      const last = lastFiredRef.current[type] ?? 0;
      if (now - last < cooldownMs) return;

      // Per-type ceiling. Once the student has been told, telling them again
      // twenty times adds nothing and buries the flags that actually matter.
      const cap = MAX_PER_TYPE[type] ?? Infinity;
      const seen = countsRef.current[type] ?? 0;
      if (seen >= cap) return;

      lastFiredRef.current[type] = now;
      countsRef.current[type] = seen + 1;

      setFlags((prev) => [...prev, { type, at: now }]);

      // Fire and forget. A failed flag POST must never interrupt the interview.
      void fetch(`/api/session/${sessionId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, questionId: questionRef.current }),
        keepalive: true,
      }).catch(() => undefined);
    },
    [sessionId]
  );

  // --- Tab switching and window focus -------------------------------------
  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.hidden) raise('tab_switch');
    };
    const onBlur = () => raise('window_blur');
    const onFullscreen = () => {
      if (!document.fullscreenElement) raise('fullscreen_exit', 15000);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [enabled, raise]);

  // --- Camera: lighting, face presence ------------------------------------
  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // FaceDetector is Chromium only. Where it is missing we fall back to a
    // luminance-variance heuristic, which catches a dark room and an empty
    // chair but will not catch a second person. Stated honestly in HANDOFF.md.
    const FD = (window as unknown as { FaceDetector?: new (o?: unknown) => FaceDetectorLike })
      .FaceDetector;
    const detector = FD ? new FD({ fastMode: true, maxDetectedFaces: 3 }) : null;

    let alive = true;

    const tick = async () => {
      if (!alive || video.readyState < 2) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let sum = 0;
      let sumSq = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
        sum += lum;
        sumSq += lum * lum;
      }
      const mean = sum / n;
      const variance = sumSq / n - mean * mean;

      if (mean < 42) raise('low_light', 20000);

      if (detector) {
        try {
          const faces = await detector.detect(video);
          if (faces.length === 0) raise('face_not_visible', 8000);
          else if (faces.length > 1) raise('multiple_faces', 10000);
        } catch {
          // Detector unavailable at runtime. Fall through to the heuristic.
          if (variance < 120 && mean > 42) raise('face_not_visible', 15000);
        }
      } else if (variance < 120 && mean > 42) {
        // A flat, featureless frame usually means nobody is in front of it.
        raise('face_not_visible', 15000);
      }
    };

    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [enabled, videoRef, raise]);

  // --- Microphone: level meter and background noise ------------------------
  useEffect(() => {
    if (!enabled || !audioStream) return;

    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const source = ctx.createMediaStreamSource(audioStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    const recent: number[] = [];

    const loop = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i]! - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      setNoiseLevel(rms);

      recent.push(rms);
      // Roughly five seconds of history at 60fps, so a single door slam or a
      // passing motorbike cannot trigger this on its own.
      if (recent.length > 300) recent.shift();

      // Background noise is a persistently raised floor, not a loud peak. Take
      // the 20th percentile of the window: if even the QUIET moments are loud,
      // there is something continuous in the room. A short bang sits at the top
      // of the distribution and is correctly ignored.
      if (recent.length === 300) {
        const sorted = [...recent].sort((a, b) => a - b);
        const floor = sorted[Math.floor(sorted.length * 0.2)]!;
        if (floor > NOISE_FLOOR_THRESHOLD) raise('background_noise', 90000);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void ctx.close();
    };
  }, [enabled, audioStream, raise]);

  return { flags, noiseLevel, raise };
}

interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<unknown[]>;
}
