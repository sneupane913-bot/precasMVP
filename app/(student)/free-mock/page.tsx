'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooterView } from '@/components/SiteFooter';
import { Page, Card, Button, Field, Input, Select, Textarea, Banner, SectionTitle } from '@/components/ui';
import { universityChoices } from '@/lib/university-check';
import { useSupportNumber } from '@/lib/useSupportNumber';

/**
 * GET A FREE MOCK (8 September 2026, the client's decision).
 *
 * Two ways, both real work for the student and both worth a mock to us:
 *
 *   1. Refer a friend. The link already exists on the account page; when the
 *      friend buys any pack, the referrer gets a mock (lib/entitlement.ts,
 *      rewardReferral, paid on payment approval). This page just puts it
 *      where a student looking for a free mock will find it.
 *
 *   2. Tell us about your real interview. The debrief (lib/debriefs.ts). A
 *      person checks it; only an approved debrief earns the mock. The rules
 *      are printed here in full because a student must be able to see why a
 *      vague list will be refused before they write one.
 */

const CHOICES = universityChoices();
const OTHER = '__other__';

type Mine = {
  debriefs: { id: string; universityName: string; interviewDate: string; status: string; reviewNote: string | null; createdAt: string; questions: number }[];
  approved: number;
  pending: boolean;
  rules: { minQuestions: number; maxApprovedPerStudent: number; rewardMocks: number };
};

export default function FreeMockPage() {
  const support = useSupportNumber();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [copied, setCopied] = useState(false);

  const [uniChoice, setUniChoice] = useState('');
  const [uniOther, setUniOther] = useState('');
  const [date, setDate] = useState('');
  const [format, setFormat] = useState('cas_shield_video');
  const [count, setCount] = useState('');
  const [minutes, setMinutes] = useState('');
  const [outcome, setOutcome] = useState('waiting');
  const [questions, setQuestions] = useState<string[]>(['', '', '', '', '']);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/me').then((r) => r.json());
        if (me?.ok && me.data?.referralCode) {
          setSignedIn(true);
          setReferralLink(`${window.location.origin}/start?ref=${me.data.referralCode}`);
        } else {
          setSignedIn(false);
        }
        const d = await fetch('/api/student/debrief').then((r) => r.json());
        if (d?.ok) setMine(d.data);
      } catch {
        setSignedIn(false);
      }
    })();
  }, []);

  const universityName = uniChoice === OTHER ? uniOther : uniChoice;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/student/debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityName,
          interviewDate: date,
          format,
          questionCount: count ? Number(count) : null,
          minutes: minutes ? Number(minutes) : null,
          questions,
          outcome,
          notes,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        setError(j?.error?.userMessage ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone(true);
      const d = await fetch('/api/student/debrief').then((r) => r.json());
      if (d?.ok) setMine(d.data);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <Page>
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-[2rem] font-bold leading-tight text-ink">Get a free mock</h1>
          <p className="mt-3 text-lg text-ink-soft">
            Two ways to earn a full mock interview without paying. Both help the next student, which is why we
            give them.
          </p>

          {signedIn === false && (
            <div className="mt-6">
              <Banner tone="info" title="Sign in first">
                <Link href="/start?next=/free-mock" className="font-semibold underline underline-offset-2">
                  Sign in
                </Link>{' '}
                so the free mock lands on your account.
              </Banner>
            </div>
          )}

          {/* ---------------- 1. Refer a friend ---------------- */}
          <Card className="mt-8">
            <SectionTitle>1. Refer a friend</SectionTitle>
            <p className="mt-2 text-ink-soft">
              Send your link to a friend who is also preparing. When they buy any pack, you get a free mock.
              Nothing happens on sign-up alone; the friend has to buy.
            </p>
            {referralLink ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={referralLink} onFocus={(e) => e.currentTarget.select()} />
                <Button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(referralLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-quiet">Sign in to see your link.</p>
            )}
          </Card>

          {/* ---------------- 2. The debrief ---------------- */}
          <Card className="mt-6">
            <SectionTitle>2. Tell us what your real interview asked</SectionTitle>
            <p className="mt-2 text-ink-soft">
              Sat your real pre-CAS or credibility interview? Write down the questions you were asked, in the
              interviewer&apos;s words. A person reads every debrief. If it is real and specific, you get a free
              mock. If you have not sat the real interview yet, come back after it.
            </p>

            <div className="mt-4 rounded-control border border-line bg-surface-sunk p-4 text-sm text-ink-soft">
              <p className="font-semibold text-ink">The rules, so nobody is surprised</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>One debrief is one real interview: one university, one date.</li>
                <li>
                  At least {mine?.rules.minQuestions ?? 5} questions, each written the way the interviewer asked it.
                  &quot;Finance&quot; is a topic; &quot;How will you pay your tuition fees?&quot; is a question.
                </li>
                <li>A person checks it within two working days. Only an approved debrief earns the free mock.</li>
                <li>
                  Vague lists, lists copied from the internet, or questions we can tell were not asked are refused,
                  and we tell you why.
                </li>
                <li>One debrief waiting at a time, and at most {mine?.rules.maxApprovedPerStudent ?? 3} free mocks this way.</li>
                <li>We never show your name or your answers to anyone. Only the questions help the next student.</li>
              </ul>
            </div>

            {mine && mine.debriefs.length > 0 && (
              <div className="mt-4 text-sm">
                <p className="font-semibold text-ink">Your debriefs</p>
                <ul className="mt-1 space-y-1 text-ink-soft">
                  {mine.debriefs.map((d) => (
                    <li key={d.id}>
                      {d.universityName}, {d.interviewDate}: {d.questions} questions,{' '}
                      <strong className="text-ink">
                        {d.status === 'pending' ? 'being checked' : d.status === 'approved' ? 'approved, mock added' : 'not accepted'}
                      </strong>
                      {d.reviewNote ? ` (${d.reviewNote})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {done ? (
              <div className="mt-4">
                <Banner tone="go" title="Thank you, your debrief is with us">
                  We will check it within two working days and message you on WhatsApp when the free mock is added.
                </Banner>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
                <Field label="Which university interviewed you?" id="uni">
                  <Select id="uni" value={uniChoice} onChange={(e) => setUniChoice(e.target.value)} required>
                    <option value="">Choose one</option>
                    {CHOICES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                    <option value={OTHER}>Another university (type it)</option>
                  </Select>
                  {uniChoice === OTHER && (
                    <Input className="mt-2" value={uniOther} onChange={(e) => setUniOther(e.target.value)} placeholder="Full university name" required />
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Date of the interview" id="date">
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </Field>
                  <Field label="How was it done?" id="format">
                    <Select id="format" value={format} onChange={(e) => setFormat(e.target.value)}>
                      <option value="cas_shield_video">Recorded video (CAS Shield / Enroly)</option>
                      <option value="live_video">Live video call (Teams, Zoom)</option>
                      <option value="phone">Phone call</option>
                      <option value="in_person">In person</option>
                      <option value="other">Other</option>
                    </Select>
                  </Field>
                  <Field label="How many questions, roughly?" id="count">
                    <Input id="count" type="number" min={1} max={60} value={count} onChange={(e) => setCount(e.target.value)} placeholder="14" />
                  </Field>
                  <Field label="How long did it take, in minutes?" id="minutes">
                    <Input id="minutes" type="number" min={1} max={180} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="20" />
                  </Field>
                </div>

                <Field label="The questions, one per line, in the interviewer's words" id="q0" hint="At least five. Add more lines if you remember more.">
                  <div className="flex flex-col gap-2">
                    {questions.map((q, i) => (
                      <Input
                        key={i}
                        id={`q${i}`}
                        value={q}
                        onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? e.target.value : x)))}
                        placeholder={i === 0 ? 'Why did you choose this university?' : `Question ${i + 1}`}
                      />
                    ))}
                    {questions.length < 30 && (
                      <button type="button" onClick={() => setQuestions((qs) => [...qs, ''])} className="self-start text-sm font-semibold text-ink underline-offset-2 hover:underline">
                        Add another question
                      </button>
                    )}
                  </div>
                </Field>

                <Field label="What was the result?" id="outcome">
                  <Select id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                    <option value="waiting">Still waiting</option>
                    <option value="passed">Passed, CAS issued or coming</option>
                    <option value="resit">Asked to resit</option>
                    <option value="failed">Refused</option>
                  </Select>
                </Field>

                <Field label="Anything else worth knowing?" id="notes" hint="Optional. Follow-up questions, what surprised you, what they pushed on.">
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </Field>

                {error && <Banner tone="warn" title="Not sent yet">{error}</Banner>}

                <Button type="submit" disabled={busy || signedIn === false}>
                  {busy ? 'Sending...' : 'Send my debrief'}
                </Button>
              </form>
            )}
          </Card>

          <p className="mt-6 text-sm text-ink-quiet">
            Questions about a debrief or a referral?{' '}
            {support ? (
              <a href={`https://wa.me/${support.replace(/\D/g, '')}`} className="underline underline-offset-2">
                Message us on WhatsApp
              </a>
            ) : (
              'Message us on WhatsApp.'
            )}
          </p>
        </div>
      </Page>
      <SiteFooterView />
    </>
  );
}
