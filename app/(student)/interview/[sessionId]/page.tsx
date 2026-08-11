'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Institution, InterviewSession, PublicQuestion } from '@/lib/types';
import { CONSENT_POINTS, CONSENT_VERSION } from '@/lib/consent';
import { DeviceCheck } from '@/components/DeviceCheck';
import { InterviewRoom } from '@/components/InterviewRoom';

type Loaded = {
  session: InterviewSession;
  questions: PublicQuestion[];
  institution: Institution;
  demo: { stt: boolean; evaluator: boolean; storage: boolean };
};

export default function InterviewPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [data, setData] = useState<Loaded | null>(null);
  const [stage, setStage] = useState<'loading' | 'consent' | 'check' | 'live' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // LIVE-008: moving from the device check to the interview kept the previous
  // scroll position, so on a phone the question heading started underneath the
  // sticky header and the student saw the middle of the screen first.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [stage]);

  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then((r) => r.json())
      .then((json: { ok: true; data: Loaded } | { ok: false; error: { userMessage: string } }) => {
        if (!json.ok) {
          setError(json.error.userMessage);
          setStage('error');
          return;
        }
        setData(json.data);
        setStage(json.data.session.status === 'in_progress' ? 'check' : 'consent');
      })
      .catch(() => {
        setError('We could not load your interview. Check your internet connection and reload.');
        setStage('error');
      });
  }, [sessionId]);

  if (stage === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-ink" />
          <p className="text-slate-600">Getting your interview ready...</p>
        </div>
      </div>
    );
  }

  if (stage === 'error' || !data) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-3 text-xl font-bold text-ink">We could not open this interview</h1>
        <p className="mb-6 text-slate-600">{error}</p>
        <a
          href="/universities"
          className="inline-flex w-full items-center justify-center rounded-xl bg-ink px-6 py-3.5 text-base font-semibold text-white"
        >
          Start a new interview
        </a>
      </div>
    );
  }

  async function acceptConsent() {
    setConsentBusy(true);
    setConsentError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: CONSENT_VERSION }),
      });
      const json = (await res.json()) as
        | { ok: true }
        | { ok: false; error: { userMessage: string } };
      if (!json.ok) {
        setConsentError(json.error.userMessage);
        return;
      }
      setStage('check');
    } catch {
      setConsentError('We could not save your agreement. Check your connection and try again.');
    } finally {
      setConsentBusy(false);
    }
  }

  if (stage === 'consent') {
    return (
      <main className="mx-auto max-w-lg p-5 sm:p-6">
        <h1 className="mb-2 text-2xl font-bold text-ink">Before you start</h1>
        <p className="mb-5 leading-relaxed text-slate-600">
          This works like the real interview, so please read these four things.
        </p>

        <ul className="mb-6 space-y-3">
          {CONSENT_POINTS.map(([t, d]) => (
            <li key={t} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-0.5 font-semibold text-ink">{t}</p>
              <p className="text-sm leading-relaxed text-slate-600">{d}</p>
            </li>
          ))}
        </ul>

        {consentError && (
          <p className="mb-3 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
            {consentError}
          </p>
        )}

        <button
          onClick={acceptConsent}
          disabled={consentBusy}
          className="w-full rounded-xl bg-ink px-6 py-4 text-lg font-bold text-white disabled:bg-slate-300"
        >
          {consentBusy ? 'Saving...' : 'I understand, continue'}
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">
          We record that you agreed, and when. Version {CONSENT_VERSION}.
        </p>
      </main>
    );
  }

  if (stage === 'check') {
    return <DeviceCheck onReady={() => setStage('live')} />;
  }

  return (
    <InterviewRoom
      sessionId={sessionId}
      institution={data.institution}
      questions={data.questions}
      startIndex={data.session.currentIndex}
      demo={data.demo}
    />
  );
}
