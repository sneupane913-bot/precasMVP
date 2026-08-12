'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Institution, PublicQuestion } from '@/lib/types';
import { FLAG_META } from '@/lib/types';
import { useMonitor } from '@/lib/useMonitor';
import { MonitorPanel } from '@/components/MonitorPanel';
import { TrialGate } from '@/components/TrialGate';

type Phase =
  | 'ready'        // question shown, not yet recording
  | 'recording'
  | 'uploading'
  | 'reviewed'     // transcript came back, student can move on
  | 'retry'        // transcription failed, student must choose
  | 'finishing'
  | 'trial_gate';

/**
 * PEE plus wrap-up. This is the house method for every answer in the product:
 * the chips here, the model answers in the question bank, the evaluator prompt,
 * and the results page all teach the same four steps. A student should be able
 * to recite them by the end of one session.
 */
const STRUCTURE = [
  {
    n: 'P',
    label: 'Point',
    hint: 'Answer the question directly, in one sentence. No long introduction.',
  },
  {
    n: 'E',
    label: 'Evidence',
    hint: 'Give a real fact: a name, a number, a date, a module, a place.',
  },
  {
    n: 'E',
    label: 'Explanation',
    hint: 'Say why that evidence matters to you. This is the part students skip.',
  },
  {
    n: 'W',
    label: 'Wrap-up',
    hint: 'One sentence linking it to your plan, then stop talking.',
  },
];

export function InterviewRoom({
  sessionId,
  institution,
  questions,
  startIndex,
  demo,
  isTrial,
  fullMockLength,
}: {
  sessionId: string;
  institution: Institution;
  questions: PublicQuestion[];
  startIndex: number;
  demo: { stt: boolean; evaluator: boolean; storage: boolean };
  /** True when this sitting is the free 10 of a 17 question paper. */
  isTrial: boolean;
  /** How long the full paper is, so the gate can say what is still locked. */
  fullMockLength: number;
}) {
  const router = useRouter();

  const [index, setIndex] = useState(Math.min(startIndex, questions.length - 1));
  const [phase, setPhase] = useState<Phase>('ready');
  const [secondsLeft, setSecondsLeft] = useState(questions[0]?.timeLimitSeconds ?? 60);
  const [liveText, setLiveText] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(2);
  const [tipIndex, setTipIndex] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  /** Question read-aloud. Off by default: the browser voice is poor. */
  const [voiceOn, setVoiceOn] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // Held in STATE, not only a ref. useMonitor needs this as a dependency, and a
  // ref assignment does not re-render, so the noise monitor would only ever
  // connect by luck on some later unrelated state change.
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Guards against React StrictMode invoking the effect twice in development. */
  const spokenForRef = useRef<string | null>(null);

  const question = questions[index]!;
  const isLast = index === questions.length - 1;

  const { flags, noiseLevel, raise } = useMonitor({
    sessionId,
    videoRef,
    audioStream: mediaStream,
    currentQuestionId: question.id,
    enabled: true,
  });

  const latestFlag = useMemo(() => {
    const recent = flags.filter((f) => Date.now() - f.at < 9000);
    if (recent.length === 0) return null;
    const order = { critical: 0, moderate: 1, minor: 2 } as const;
    return [...recent].sort(
      (a, b) => order[FLAG_META[a.type].severity] - order[FLAG_META[b.type].severity]
    )[0]!;
  }, [flags]);

  // --- Media --------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setMediaStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        setError(
          'We could not turn on your camera and microphone. Check that you gave permission, then reload this page.'
        );
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // --- Read the question aloud -------------------------------------------
  // OFF by default. The browser's built-in voice sounds robotic and the founder
  // found it actively unpleasant. Production replaces this with pre-generated
  // natural audio per institution, which is also what keeps the cost model
  // intact: see docs/UNIT_ECONOMICS.md, never call a TTS API at runtime.
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // cancel() first, so a second call can never overlap the first and produce
    // what sounds like an echo.
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.lang = 'en-GB';
    window.speechSynthesis.speak(u);
  }, []);

  useEffect(() => {
    setSecondsLeft(question.timeLimitSeconds);
    setLiveText('');
    setFinalTranscript('');
    setMessage(null);
    setTipIndex(0);
    setPhase('ready');

    // React StrictMode runs effects twice in development. Without this guard
    // the question was spoken twice, milliseconds apart, which is exactly what
    // an echo sounds like.
    if (!voiceOn || spokenForRef.current === question.id) return;
    spokenForRef.current = question.id;
    const t = setTimeout(() => speak(question.text), 350);
    return () => clearTimeout(t);
  }, [question, speak, voiceOn]);

  // Silence any speech the moment this screen goes away.
  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  // Rotate tips while the student is thinking or speaking.
  useEffect(() => {
    if (question.tips.length < 2) return;
    const id = setInterval(() => setTipIndex((i) => (i + 1) % question.tips.length), 7000);
    return () => clearInterval(id);
  }, [question]);

  // --- Countdown ----------------------------------------------------------
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // --- Live transcript (display only, server is authoritative) ------------
  const startLiveTranscript = useCallback(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition;
    if (!Ctor) return; // Firefox and Safari. The server transcript still works.
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';
      rec.onresult = (e: SpeechRecognitionEventLike) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) text += e.results[i]![0]!.transcript;
        setLiveText(text);
      };
      rec.onerror = () => undefined;
      rec.start();
      recognitionRef.current = rec;
    } catch {
      /* display-only feature, never block the interview on it */
    }
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) {
      setError('Your microphone is not ready yet. Wait a moment and try again.');
      return;
    }
    window.speechSynthesis?.cancel();

    const audioOnly = new MediaStream(stream.getAudioTracks());
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

    const rec = new MediaRecorder(audioOnly, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => void upload();
    rec.start(250);
    recorderRef.current = rec;
    startedAtRef.current = Date.now();
    setPhase('recording');
    setLiveText('');
    startLiveTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startLiveTranscript]);

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }

  // --- Upload and evaluate ------------------------------------------------
  const upload = useCallback(async () => {
    setPhase('uploading');
    const durationSeconds = (Date.now() - startedAtRef.current) / 1000;
    const blob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || 'audio/webm',
    });

    // Client-side guard: never pay to transcribe silence.
    if (blob.size < 6 * 1024) {
      raise('no_audio', 3000);
      setMessage(
        'We could not hear anything at all. Check that your microphone is not muted, then record again.'
      );
      setPhase('retry');
      return;
    }
    if (durationSeconds < 8) raise('answer_too_short', 3000);

    const form = new FormData();
    form.append('audio', blob, 'answer.webm');
    form.append('questionId', question.id);
    form.append('durationSeconds', String(durationSeconds));

    try {
      const res = await fetch(`/api/session/${sessionId}/answer`, {
        method: 'POST',
        body: form,
      });
      const json = (await res.json()) as UploadResponse;

      if (!json.ok) {
        setMessage(json.error.userMessage);
        setPhase('retry');
        return;
      }

      if (json.data.transcriptStatus !== 'ok') {
        // The competitor auto-advances here and destroys the answer.
        // We stop, explain, and let the student choose. Never auto-advance.
        setAttemptsLeft(json.data.attemptsLeft ?? 0);
        setMessage(json.userMessage ?? 'We could not hear your answer. Please record it again.');
        setPhase('retry');
        return;
      }

      setFinalTranscript(json.data.transcript ?? '');
      setAnsweredIds((prev) => new Set(prev).add(question.id));
      setMessage(
        json.data.evaluationFailed
          ? 'We saved your answer, but our coach could not review it just now. You will still see it in your results.'
          : null
      );
      setPhase('reviewed');
    } catch {
      setMessage(
        'Your answer could not be sent. Check your internet connection and try recording again.'
      );
      setPhase('retry');
    }
  }, [question.id, sessionId, raise]);

  const next = useCallback(() => {
    if (isLast) void finish();
    else setIndex((i) => i + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLast]);

  /** Close the session and release the camera. Shared by both endings. */
  const closeSession = useCallback(async () => {
    stopRecording();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    window.speechSynthesis?.cancel();
    try {
      await fetch(`/api/session/${sessionId}/complete`, { method: 'POST' });
    } catch {
      /* the results page rebuilds the summary anyway */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const finish = useCallback(async () => {
    setPhase('finishing');
    await closeSession();

    // D13: a trial student does NOT get dropped straight onto results. They
    // have just finished the free ten of a seventeen question paper, and this
    // is the moment they decide. Two real choices, report always available.
    if (isTrial) {
      setPhase('trial_gate');
      return;
    }
    router.push(`/results/${sessionId}`);
  }, [router, sessionId, isTrial, closeSession]);

  // Warn before leaving mid-interview.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (phase === 'recording' || phase === 'uploading') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  const answeredCount = answeredIds.size;
  const pct = 1 - secondsLeft / Math.max(1, question.timeLimitSeconds);

  // D13/D14/D15: the gate after the last free question.
  if (phase === 'trial_gate') {
    return (
      <TrialGate
        answered={questions.length}
        total={fullMockLength}
        remaining={Math.max(0, fullMockLength - questions.length)}
        onSeeReport={() => router.push(`/results/${sessionId}`)}
      />
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-3 text-xl font-bold text-ink">We cannot start your interview</h1>
        <p className="mb-6 text-slate-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-xl bg-ink px-6 py-3.5 text-base font-semibold text-white"
        >
          Reload and try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-28 lg:pb-8">
      {/* ---- Exam header: institution, progress, remaining ---- */}
      <header className="sticky top-0 z-30 bg-ink text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-black"
            style={{ backgroundColor: institution.accent }}
          >
            {institution.monogram}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{institution.name}</p>
            <p className="text-[11px] text-white/60">
              {institution.interviewType} mock interview
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold tabular-nums">
              Q {index + 1}/{questions.length}
            </p>
            <p className="text-[11px] text-white/60">
              {answeredCount} done, {questions.length - answeredCount} left
            </p>
          </div>
        </div>
        {/* progress dots */}
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-4 pb-2.5">
          {questions.map((q, i) => (
            <span
              key={q.id}
              aria-label={`Question ${i + 1}`}
              className={`h-2 shrink-0 rounded-full transition-all ${
                i === index
                  ? 'w-6 bg-white'
                  : answeredIds.has(q.id)
                    ? 'w-2 bg-emerald-400'
                    : 'w-2 bg-white/25'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
        {/* ================= Question and answer ================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
              Question {index + 1}
            </span>
            <button
              onClick={() => speak(question.text)}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              ▶ Read this to me
            </button>
            <button
              onClick={() => {
                const on = !voiceOn;
                setVoiceOn(on);
                if (!on) window.speechSynthesis?.cancel();
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                voiceOn ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              {voiceOn ? 'Auto voice: on' : 'Auto voice: off'}
            </button>
          </div>

          {demo.stt && (
            <div className="mb-4 rounded-xl border-2 border-purple-300 bg-purple-50 px-4 py-3">
              <p className="font-bold text-purple-900">Demo mode: we are not really listening yet</p>
              <p className="mt-1 text-sm leading-relaxed text-purple-900/90">
                No speech-to-text key is set, so the transcript below is sample text, not your
                voice. Everything else on this screen is real. Add a Deepgram key to
                <span className="font-mono"> .env.local </span>
                to hear your actual answers.
              </p>
            </div>
          )}

          <h1 className="mb-5 font-serif text-2xl leading-snug text-ink sm:text-3xl">
            {question.text}
          </h1>

          {/* ---- Live flag, placed where the eye already is ---- */}
          {latestFlag && phase === 'recording' && (
            <div
              className={`mb-3 animate-slideUp rounded-xl border-l-4 px-4 py-2.5 text-sm font-medium ${
                FLAG_META[latestFlag.type].severity === 'critical'
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-amber-500 bg-amber-50 text-amber-900'
              }`}
              role="status"
            >
              {FLAG_META[latestFlag.type].studentMessage}
            </div>
          )}

          {/* ---- Answer space ---- */}
          <div className="rounded-2xl bg-gradient-to-b from-sky-50 to-emerald-50/60 p-5">
            {/* Unmistakable state banner. The previous version only changed the
                button label, and it was not obvious that recording had begun. */}
            {phase === 'recording' && (
              <div
                className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-white transition-colors ${
                  secondsLeft <= 10
                    ? 'bg-red-600'
                    : secondsLeft <= 20
                      ? 'bg-amber-600'
                      : 'bg-emerald-600'
                }`}
              >
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-white" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-tight">
                    {secondsLeft <= 10 ? 'Start wrapping up' : 'Speak now. We are listening.'}
                  </p>
                  <p className="text-sm text-white/85">
                    {secondsLeft <= 10
                      ? 'Finish your last sentence.'
                      : 'Press the red button when you have finished.'}
                  </p>
                </div>
                {/* Big countdown, always visible while answering. */}
                <span className="shrink-0 text-4xl font-black tabular-nums leading-none">
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </span>
              </div>
            )}
            {phase === 'ready' && (
              <div className="mb-4 rounded-xl bg-white/70 px-4 py-3">
                <p className="text-base font-bold text-ink">Read the question, then press start</p>
                <p className="text-sm text-slate-600">
                  You have {question.timeLimitSeconds} seconds. Nothing is recorded until you press
                  the button.
                </p>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Your answer</span>
              <span
                className={`flex items-center gap-1.5 text-sm font-bold tabular-nums ${
                  secondsLeft <= 15 && phase === 'recording' ? 'text-amber-600' : 'text-slate-600'
                }`}
              >
                <ClockIcon />
                {String(Math.floor(secondsLeft / 60)).padStart(1, '0')}:
                {String(secondsLeft % 60).padStart(2, '0')}
              </span>
            </div>

            {/* transcript area */}
            <div className="mb-5 min-h-[104px] rounded-xl bg-white/70 p-4 text-[15px] leading-relaxed text-slate-800">
              {phase === 'reviewed' && finalTranscript ? (
                <p>{finalTranscript}</p>
              ) : liveText ? (
                <p>{liveText}</p>
              ) : (
                <p className="text-slate-400">
                  {phase === 'recording'
                    ? 'Listening. Speak clearly and keep going.'
                    : 'Your words will appear here once you start speaking.'}
                </p>
              )}
            </div>

            {/* ---- Record control ---- */}
            <div className="flex flex-col items-center">
              {phase === 'ready' && (
                <button
                  onClick={startRecording}
                  className="group flex flex-col items-center gap-2"
                  aria-label="Start recording your answer"
                >
                  <span className="relative grid h-20 w-20 place-items-center rounded-full bg-white shadow-lg ring-2 ring-emerald-500/40 transition group-active:scale-95">
                    <MicIcon className="h-8 w-8 text-emerald-600" />
                  </span>
                  <span className="text-lg font-bold text-emerald-700">Start answering</span>
                  <span className="text-sm text-slate-500">Tap the microphone to begin</span>
                </button>
              )}

              {phase === 'recording' && (
                <button
                  onClick={stopRecording}
                  className="flex flex-col items-center gap-2"
                  aria-label="Stop recording"
                >
                  <span className="relative grid h-20 w-20 place-items-center rounded-full bg-red-600 shadow-lg">
                    <span
                      className="absolute inset-0 rounded-full bg-red-500/40"
                      style={{ transform: `scale(${1 + noiseLevel * 2.2})`, transition: 'transform 90ms' }}
                    />
                    <span className="relative h-6 w-6 rounded bg-white" />
                  </span>
                  <span className="text-lg font-bold text-red-700">I have finished answering</span>
                  <span className="text-sm text-slate-500">
                    Or wait for the timer to run out
                  </span>
                </button>
              )}

              {phase === 'uploading' && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Spinner />
                  <span className="text-base font-semibold text-slate-700">
                    Listening to your answer...
                  </span>
                  <span className="text-sm text-slate-500">This takes a few seconds.</span>
                </div>
              )}

              {/* ---- Failure. Never auto-advance. The student chooses. ---- */}
              {phase === 'retry' && (
                <div className="w-full animate-slideUp rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                  <p className="mb-1 font-bold text-amber-900">We could not use that answer</p>
                  <p className="mb-4 text-sm leading-relaxed text-amber-900/90">{message}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => {
                        setMessage(null);
                        setSecondsLeft(question.timeLimitSeconds);
                        setPhase('ready');
                      }}
                      disabled={attemptsLeft <= 0}
                      className="flex-1 rounded-xl bg-ink px-5 py-3 text-base font-semibold text-white disabled:opacity-40"
                    >
                      Record again
                      {attemptsLeft > 0 && attemptsLeft < 3 ? ` (${attemptsLeft} left)` : ''}
                    </button>
                    <button
                      onClick={next}
                      className="flex-1 rounded-xl border-2 border-slate-300 px-5 py-3 text-base font-semibold text-slate-700"
                    >
                      Skip this question
                    </button>
                  </div>
                  {attemptsLeft <= 0 && (
                    <p className="mt-2 text-sm font-medium text-red-700">
                      You have used all your tries for this question. Skip it for now and practise it
                      afterwards.
                    </p>
                  )}
                </div>
              )}

              {phase === 'reviewed' && (
                <div className="w-full animate-slideUp">
                  {message && (
                    <p className="mb-3 rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-700">
                      {message}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={next}
                      className="flex-1 rounded-xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-sm"
                    >
                      {isLast ? 'Finish and see my results' : 'Saved. Next question'}
                    </button>
                    {!isLast && (
                      <button
                        onClick={() => {
                          setSecondsLeft(question.timeLimitSeconds);
                          setFinalTranscript('');
                          setLiveText('');
                          setPhase('ready');
                        }}
                        className="rounded-xl border-2 border-slate-300 px-5 py-3.5 text-base font-semibold text-slate-700"
                      >
                        Answer again
                      </button>
                    )}
                  </div>
                </div>
              )}

              {phase === 'finishing' && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Spinner />
                  <span className="font-semibold text-slate-700">Preparing your results...</span>
                </div>
              )}
            </div>
          </div>

          {/* ---- PEE + Wrap-up: the house answer method ---- */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Build every answer this way
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STRUCTURE.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex gap-3 rounded-lg p-3 ${
                    phase === 'recording' ? 'bg-emerald-50/70' : 'bg-slate-50'
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink text-sm font-black text-white">
                    {s.n}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight text-ink">
                      {i + 1}. {s.label}
                    </p>
                    <p className="text-[13px] leading-snug text-slate-600">{s.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Tips ---- */}
          {question.tips.length > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                i
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Tip {tipIndex + 1} of {question.tips.length}
                </p>
                <p className="text-sm leading-relaxed text-slate-700">{question.tips[tipIndex]}</p>
              </div>
              {question.tips.length > 1 && (
                <button
                  onClick={() => setTipIndex((i) => (i + 1) % question.tips.length)}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-200"
                  aria-label="Next tip"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>

        {/* ================= Camera and monitor ================= */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-ink shadow-sm">
            <div className="relative aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${cameraOn ? '' : 'invisible'}`}
              />
              {!cameraOn && (
                <div className="absolute inset-0 grid place-items-center text-sm text-white/50">
                  Camera off
                </div>
              )}
              {phase === 'recording' && (
                <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-xs font-bold tabular-nums text-white">
                  {String(Math.floor(secondsLeft / 60))}:{String(secondsLeft % 60).padStart(2, '0')}
                </span>
              )}
              {phase === 'recording' && (
                <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[11px] font-bold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> REC
                </span>
              )}
              {/* countdown bar */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
                <div
                  className={`h-full transition-all duration-1000 ${
                    secondsLeft <= 15 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, pct * 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                const on = !cameraOn;
                setCameraOn(on);
                streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = on));
              }}
              className="w-full py-2.5 text-xs font-medium text-white/70 hover:bg-white/5"
            >
              {cameraOn ? 'Turn camera off' : 'Turn camera on'}
            </button>
          </div>

          <MonitorPanel
            flags={flags}
            noiseLevel={noiseLevel}
            cameraOn={cameraOn}
            // A track that exists but has ended is not a working microphone.
            micOn={
              mediaStream?.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled) ??
              false
            }
          />

          <button
            onClick={finish}
            className="w-full rounded-xl border-2 border-slate-300 bg-white py-3 text-sm font-semibold text-slate-600"
          >
            End interview and see results
          </button>
        </aside>
      </main>
    </div>
  );
}

/* ------------------------------- icons ---------------------------------- */

function MicIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------- types ---------------------------------- */

type UploadResponse =
  | {
      ok: true;
      userMessage?: string;
      data: {
        transcriptStatus: 'ok' | 'silent' | 'too_short' | 'failed';
        transcript?: string;
        evaluationFailed?: boolean;
        attemptsLeft?: number;
        canRetry?: boolean;
      };
    }
  | { ok: false; error: { code: string; message: string; userMessage: string } };

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
