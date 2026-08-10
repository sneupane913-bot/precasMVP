'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CheckState = 'pending' | 'pass' | 'warn' | 'fail';

interface Check {
  key: 'camera' | 'light' | 'mic' | 'net';
  label: string;
  state: CheckState;
  detail: string;
}

type EchoState = 'idle' | 'recording' | 'analysing' | 'playing' | 'done';

/**
 * Pre-flight check.
 *
 * The sound check measures the ACTUAL RECORDED AUDIO by decoding it, not a
 * React state variable sampled on a timer. The earlier version did the latter
 * and the closure captured a stale value from before the student spoke, so it
 * always reported silence while the playback clearly contained speech. Two
 * parts of the same screen contradicted each other, which is worse than either
 * being wrong on its own.
 *
 * A warning never blocks. Even a hard microphone failure offers a way forward,
 * because a student who cannot fix their microphone must not be locked out.
 */
export function DeviceCheck({ onReady }: { onReady: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const lightIntervalRef = useRef<number | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  /** Live level, read by the sampler. A ref, never state, to avoid stale closures. */
  const levelRef = useRef(0);

  const [checks, setChecks] = useState<Check[]>([
    { key: 'camera', label: 'Camera', state: 'pending', detail: 'Asking for permission...' },
    { key: 'light', label: 'Lighting', state: 'pending', detail: 'Waiting for the camera.' },
    { key: 'mic', label: 'Microphone', state: 'pending', detail: 'Asking for permission...' },
    { key: 'net', label: 'Internet', state: 'pending', detail: 'Checking your connection...' },
  ]);
  const [level, setLevel] = useState(0);
  const [echoState, setEchoState] = useState<EchoState>('idle');
  const [countdown, setCountdown] = useState(0);
  const [echoVerdict, setEchoVerdict] = useState<{ tone: CheckState; text: string } | null>(null);
  const [hardFail, setHardFail] = useState<string | null>(null);
  const [overrideMic, setOverrideMic] = useState(false);

  const set = useCallback(
    (key: Check['key'], state: CheckState, detail: string) =>
      setChecks((cs) => cs.map((c) => (c.key === key ? { ...c, state, detail } : c))),
    []
  );

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        // noiseSuppression off on purpose: we want the student to hear the room
        // exactly as the real interviewer will hear it.
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const track = stream.getAudioTracks()[0];
        set('camera', 'pass', 'We can see you.');
        set(
          'mic',
          track && track.enabled && !track.muted ? 'pending' : 'warn',
          'Microphone is on. Do the sound check below.'
        );
        startLightCheck();
        startLevelMeter(stream);
      })
      .catch((err: unknown) => {
        const name = (err as { name?: string }).name;
        if (name === 'NotAllowedError') {
          setHardFail(
            'You said no to the camera and microphone. Click the small camera icon in your browser address bar, choose Allow, then reload this page.'
          );
        } else if (name === 'NotFoundError') {
          setHardFail(
            'We could not find a camera or a microphone on this device. Try a different device, or use a phone.'
          );
        } else {
          setHardFail('We could not turn on your camera and microphone. Please reload this page.');
        }
        set('camera', 'fail', 'Not working.');
        set('mic', 'fail', 'Not working.');
      });

    const t0 = performance.now();
    fetch('/manifest.json', { cache: 'no-store' })
      .then(() => {
        const ms = performance.now() - t0;
        if (ms < 600) set('net', 'pass', 'Your connection is good.');
        else if (ms < 2000) set('net', 'warn', 'Your connection is a bit slow, but it will work.');
        else set('net', 'warn', 'Your connection is slow. Answers may take longer to send.');
      })
      .catch(() => set('net', 'warn', 'We could not check your connection.'));

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (lightIntervalRef.current !== null) window.clearInterval(lightIntervalRef.current);
      playbackRef.current?.pause();
      void audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startLightCheck() {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 90;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    lightIntervalRef.current = window.setInterval(() => {
      const v = videoRef.current;
      if (!ctx || !v || v.readyState < 2) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      }
      const mean = sum / (data.length / 4);
      if (mean < 45)
        set('light', 'warn', 'Your face is too dark. Sit facing a window or turn on a light.');
      else if (mean > 215) set('light', 'warn', 'Too bright. The light behind you is too strong.');
      else set('light', 'pass', 'The light on your face is good.');
    }, 900);
  }

  function startLevelMeter(stream: MediaStream) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    audioCtxRef.current = ctx;
    // Safari suspends new contexts until a user gesture.
    void ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser); // NOT connected to destination, so this cannot echo
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i]! - 128) / 128;
        s += v * v;
      }
      const rms = Math.sqrt(s / buf.length);
      levelRef.current = rms; // authoritative, closure-safe
      setLevel(rms); // display only
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  /**
   * Analyse the recording itself. Decoding the audio is the only measurement
   * that cannot disagree with what the student hears played back, because it is
   * literally the same bytes.
   */
  async function analyseRecording(blob: Blob): Promise<{ peak: number; floor: number } | null> {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
      const pcm = decoded.getChannelData(0);
      void ctx.close();

      // RMS over 50 ms windows.
      const win = Math.max(1, Math.floor(decoded.sampleRate * 0.05));
      const windows: number[] = [];
      for (let i = 0; i + win <= pcm.length; i += win) {
        let s = 0;
        for (let j = i; j < i + win; j++) s += pcm[j]! * pcm[j]!;
        windows.push(Math.sqrt(s / win));
      }
      if (windows.length < 3) return null;

      const sorted = [...windows].sort((a, b) => a - b);
      return {
        peak: sorted[Math.floor(sorted.length * 0.9)] ?? 0,
        floor: sorted[Math.floor(sorted.length * 0.15)] ?? 0,
      };
    } catch {
      return null; // Safari may refuse to decode webm. Fall back to live samples.
    }
  }

  function runEchoTest() {
    const stream = streamRef.current;
    if (!stream) return;
    void audioCtxRef.current?.resume();

    playbackRef.current?.pause();
    setEchoVerdict(null);

    const audio = new MediaStream(stream.getAudioTracks());
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
    const rec = new MediaRecorder(audio, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    const liveSamples: number[] = [];

    // Reads the REF, so it sees the live value, not a frozen one.
    const sampler = window.setInterval(() => liveSamples.push(levelRef.current), 60);

    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

    rec.onstop = async () => {
      window.clearInterval(sampler);
      setEchoState('analysing');
      setCountdown(0);

      const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });

      let peak: number;
      let floor: number;
      const decoded = await analyseRecording(blob);
      if (decoded) {
        peak = decoded.peak;
        floor = decoded.floor;
      } else {
        const sorted = [...liveSamples].sort((a, b) => a - b);
        peak = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
        floor = sorted[Math.floor(sorted.length * 0.15)] ?? 0;
      }

      if (peak < 0.012) {
        setEchoVerdict({
          tone: 'fail',
          text: 'We could not hear you. Check that your microphone is not muted and that your browser is using the right microphone, then try again.',
        });
        set('mic', 'fail', 'We heard nothing.');
      } else if (floor > 0.022 && floor > peak * 0.4) {
        setEchoVerdict({
          tone: 'warn',
          text: 'We can hear you, but there is noise behind you: a fan, a TV, or people talking. The real interviewer will hear this too. Move somewhere quieter if you can. You can still continue.',
        });
        set('mic', 'warn', 'We heard you, but the room is noisy.');
      } else if (peak < 0.045) {
        setEchoVerdict({
          tone: 'warn',
          text: 'We can hear you, but you are quiet. Sit closer to the microphone and speak a little louder. You can still continue.',
        });
        set('mic', 'warn', 'We heard you, but quietly.');
      } else {
        setEchoVerdict({
          tone: 'pass',
          text: 'We heard you clearly. That is exactly how you should sound in the real interview.',
        });
        set('mic', 'pass', 'We heard you clearly.');
      }

      // Play it back only after the verdict is on screen, so the two agree.
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      playbackRef.current = el;
      setEchoState('playing');
      el.onended = () => {
        URL.revokeObjectURL(url);
        setEchoState('done');
      };
      el.onerror = () => setEchoState('done');
      void el.play().catch(() => setEchoState('done'));
    };

    setEchoState('recording');
    setCountdown(3);
    rec.start();

    const tick = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(tick);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    window.setTimeout(() => {
      if (rec.state !== 'inactive') rec.stop();
    }, 3000);
  }

  function stopPlayback() {
    playbackRef.current?.pause();
    setEchoState('done');
  }

  const cameraOk = checks.find((c) => c.key === 'camera')?.state === 'pass';
  const micState = checks.find((c) => c.key === 'mic')?.state;
  const soundCheckRun = echoState === 'done' || echoState === 'playing';
  const micUsable = micState === 'pass' || micState === 'warn' || overrideMic;
  const canStart = cameraOk && soundCheckRun && micUsable;

  if (hardFail) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-3 text-xl font-bold text-ink">We need your camera and microphone</h1>
        <p className="mb-6 leading-relaxed text-slate-600">{hardFail}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-xl bg-ink px-6 py-3.5 text-base font-semibold text-white"
        >
          Reload this page
        </button>
        <button
          onClick={onReady}
          className="mt-3 w-full rounded-xl border-2 border-slate-300 px-6 py-3.5 text-base font-semibold text-slate-600"
        >
          Continue anyway
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-1 text-2xl font-bold text-ink">Let us check your setup</h1>
      <p className="mb-5 text-slate-600">
        The real interview is recorded with your camera on. Let us make sure everything works first.
      </p>

      <div className="mb-4 overflow-hidden rounded-2xl bg-ink">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="aspect-video w-full object-cover"
        />
      </div>

      <ul className="mb-5 space-y-2">
        {checks.map((c) => (
          <li
            key={c.key}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              c.state === 'pass'
                ? 'border-emerald-200 bg-emerald-50'
                : c.state === 'warn'
                  ? 'border-amber-200 bg-amber-50'
                  : c.state === 'fail'
                    ? 'border-red-200 bg-red-50'
                    : 'border-slate-200 bg-white'
            }`}
          >
            <span className="mt-0.5 w-4 text-center text-lg leading-none">
              {c.state === 'pass' ? '✓' : c.state === 'warn' ? '!' : c.state === 'fail' ? '×' : '·'}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{c.label}</p>
              <p className="text-sm leading-snug text-slate-600">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* ---------------- Sound check ---------------- */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-bold text-ink">Sound check</h2>
        <p className="mb-1 text-sm leading-relaxed text-slate-600">
          Press the button and say your name out loud for three seconds.
        </p>
        <p className="mb-4 text-sm leading-relaxed text-slate-500">
          We will then play your voice back to you. Hearing yourself a few seconds later is normal
          and is meant to happen: it is the only way to know what the interviewer will hear.
        </p>

        {/*
          QA finding LIVE-007: this meter said "Loud and clear" at the same
          moment the verdict said "We heard nothing", because the meter reads
          the live microphone while the verdict reads the finished recording.
          Two truths on one screen is worse than either being wrong. Once a
          verdict exists, the verdict is the only voice.
        */}
        <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>{echoState === 'recording' ? 'Speak now' : 'Microphone level'}</span>
          <span>
            {echoVerdict
              ? echoVerdict.tone === 'fail'
                ? 'Test failed'
                : echoVerdict.tone === 'warn'
                  ? 'Usable, see below'
                  : 'Test passed'
              : level > 0.05
                ? 'Loud and clear'
                : level > 0.012
                  ? 'Hearing you'
                  : 'Very quiet'}
          </span>
        </div>
        <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-75 ${
              level > 0.012 ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
            style={{ width: `${Math.min(100, level * 300)}%` }}
          />
        </div>

        {echoState === 'playing' ? (
          <button
            onClick={stopPlayback}
            className="w-full rounded-xl border-2 border-slate-300 px-5 py-3.5 text-base font-semibold text-slate-700"
          >
            Playing your voice back... tap to stop
          </button>
        ) : (
          <button
            onClick={runEchoTest}
            disabled={echoState === 'recording' || echoState === 'analysing' || !cameraOk}
            className="w-full rounded-xl bg-ink px-5 py-3.5 text-base font-semibold text-white disabled:opacity-50"
          >
            {echoState === 'idle' && 'Start sound check'}
            {echoState === 'recording' && `Recording... ${countdown}`}
            {echoState === 'analysing' && 'Checking what we heard...'}
            {echoState === 'done' && 'Test again'}
          </button>
        )}

        {echoVerdict && (
          <p
            className={`mt-3 rounded-lg px-4 py-3 text-sm leading-relaxed ${
              echoVerdict.tone === 'pass'
                ? 'bg-emerald-50 text-emerald-900'
                : echoVerdict.tone === 'warn'
                  ? 'bg-amber-50 text-amber-900'
                  : 'bg-red-50 text-red-900'
            }`}
          >
            {echoVerdict.text}
          </p>
        )}

        {/* Never a dead end: a failed mic must still have a way forward. */}
        {echoVerdict?.tone === 'fail' && !overrideMic && (
          <button
            onClick={() => setOverrideMic(true)}
            className="mt-2 w-full rounded-xl border-2 border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600"
          >
            I can hear the playback, continue anyway
          </button>
        )}
      </div>

      <button
        onClick={onReady}
        disabled={!canStart}
        className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-sm disabled:bg-slate-300"
      >
        Start my interview
      </button>
      {!canStart && (
        <p className="mt-2 text-center text-sm font-semibold text-red-600">
          {!cameraOk
            ? 'Your camera is not ready yet.'
            : !soundCheckRun
              ? 'Do the sound check above before you start.'
              : 'We could not hear your microphone. Try the sound check again.'}
        </p>
      )}
    </div>
  );
}
