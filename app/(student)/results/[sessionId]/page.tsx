import Link from 'next/link';
import { notFound } from 'next/navigation';
import { store } from '@/lib/store';
import { ownsSession } from '@/lib/owner-session';
import { InstallPrompt } from '@/components/InstallPrompt';
import { SiteHeader } from '@/components/SiteHeader';
import { headerSession } from '@/lib/auth/header-session';
import { SiteFooter } from '@/components/SiteFooter';
import { BUILD_INFO } from '@/lib/build-info';
import { weakestOf } from '@/lib/advice';
import { buildSummary } from '@/lib/summary';
import { isDemoTranscript } from '@/lib/ai/stt';
import { getInstitution } from '@/lib/data/institutions';
import { getQuestion, resolvedQuestion , primeExtraQuestions} from '@/lib/data/questions';
import { BAND_LABEL, CATEGORY_LABEL, FLAG_META, PEE_STEPS, type FlagType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  // Resolved on the server so the header never shows 'Sign in' to somebody
  // who is already signed in. See components/HeaderSession.tsx.
  // Named headerState, not `session`: this file already has a `session`, which
  // is the INTERVIEW session. Two different things called the same word in one
  // file is how the wrong one gets rendered.
  // D-24. Extra questions must resolve here too, or a report shows a blank.
  await primeExtraQuestions();
  const headerState = await headerSession();
  const { sessionId } = await params;
  const session = await store.get(sessionId);

  // QA finding LIVE-002: this page was fully public. A results page carries the
  // student's own words about their family's income, their visa refusals and
  // their finances. It is now bound to the anonymous owner cookie, and a
  // non-owner gets an ordinary 404 rather than a hint that the session exists.
  if (!session || !(await ownsSession(session.ownerId))) notFound();

  const institution = getInstitution(session.institutionId);
  if (!institution) notFound();

  const summary = session.summary ?? buildSummary(session);
  const scored = session.answers.filter((a) => a.evaluation !== null);
  // D-27. Every scored answer is sample text, so nothing on this page may be
  // presented as a judgement of the student.
  const demoOnly = scored.length > 0 && scored.every((a) => isDemoTranscript(a.transcript));

  const flagCounts = new Map<FlagType, number>();
  for (const f of session.flags) flagCounts.set(f.type, (flagCounts.get(f.type) ?? 0) + 1);

  return (
    <>
      <SiteHeader session={headerState} />
      <main className="min-h-screen pb-16">
      {/* B23: header bar per docs/design-reference/results_report. The date and
          the university sit above the title, and the two things a student
          actually wants to do next sit beside it. */}
      <header className="px-4 pt-8 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              {institution.name}
              {session.completedAt
                ? ` · ${new Date(session.completedAt).toLocaleDateString()}`
                : ''}
            </p>
            <h1 className="font-serif text-3xl font-bold text-ink sm:text-4xl">
              Interview results
            </h1>
          </div>
          <Link
            href="/practice"
            className="rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white"
          >
            Practise your weakest answer
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
        {/* ---------- Verdict. Label first, number second. ---------- */}
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center">
          {demoOnly ? (
            /* D-27. With no speech key set the transcripts are a sample, not the
               student's words. The interview room says so loudly; this page,
               which is the artefact a student keeps and shows people, used to
               print "Almost ready" and "75%" over the top of it. No score, no
               band, no percentage. Everything genuinely observed still shows
               below: the questions, the timings and the behaviour table. */
            <>
              <p className="mb-1 inline-block rounded-full bg-violet-100 px-4 py-1.5 text-sm font-bold text-violet-800">
                Practice mode
              </p>
              <p className="mb-2 mt-2 font-serif text-2xl leading-snug text-ink">
                We were not listening yet, so this attempt has not been scored
              </p>
              <p className="mx-auto max-w-md leading-relaxed text-slate-600">
                The answers shown below are <strong>sample text, not your voice</strong>, so there is
                no score and no judgement of your English anywhere on this page. Everything else here
                is real: the questions you were asked, how long you took, and how you behaved on
                camera.
              </p>
              <p className="mt-3 text-sm text-slate-500">
                You answered {summary.answeredCount} of {summary.totalCount} questions
              </p>
            </>
          ) : scored.length === 0 ? (
            <>
              <p className="mb-2 text-2xl font-bold text-ink">We could not score this attempt</p>
              <p className="mx-auto max-w-md leading-relaxed text-slate-600">
                We did not hear enough of your answers to give you honest feedback. We will not give
                you a score for answers we could not hear. Please check your microphone and try
                again.
              </p>
            </>
          ) : (
            <>
              <p
                className={`mb-1 inline-block rounded-full px-4 py-1.5 text-sm font-bold ${
                  summary.band === 'ready'
                    ? 'bg-emerald-100 text-emerald-800'
                    : summary.band === 'almost_ready'
                      ? 'bg-sky-100 text-sky-800'
                      : summary.band === 'needs_practice'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                }`}
              >
                {BAND_LABEL[summary.band]}
              </p>
              <p className="mb-2 mt-2 font-serif text-2xl leading-snug text-ink">
                {summary.headline}
              </p>
              <p className="text-5xl font-black text-ink">{summary.overallScore}%</p>
              <p className="mt-2 text-sm text-slate-500">
                You answered {summary.answeredCount} of {summary.totalCount} questions
              </p>
            </>
          )}
        </section>

        {/* ---------- S-37. The one thing to do before the next attempt. ----------
            Placed immediately under the verdict, above the detail, because a
            student who has just read a low score is looking for what to DO and
            will not scroll past four sub-scores to find it. "Keep practising"
            is not advice; this names one concrete change. */}
        {(() => {
          const weakest = scored.length > 0 ? weakestOf(summary.subScores) : null;
          if (!weakest) return null;
          return (
            <section className="rounded-2xl border-2 border-ink bg-white p-6">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Do this before your next interview
              </p>
              <h2 className="mb-2 font-serif text-xl font-bold text-ink">{weakest.label}</h2>
              <p className="mb-5 leading-relaxed text-slate-700">{weakest.advice}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/practice"
                  className="flex-1 rounded-xl bg-ink px-5 py-3.5 text-center font-bold text-white"
                >
                  Practise this now
                </Link>
                <Link
                  href="/universities"
                  className="flex-1 rounded-xl border-2 border-slate-300 px-5 py-3.5 text-center font-semibold text-slate-700"
                >
                  Take another full interview
                </Link>
              </div>
            </section>
          );
        })()}

        {/* ---------- Sub-scores. null means not assessed, never zero. ---------- */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['English clarity', summary.subScores.englishClarity, 'How clearly you spoke'],
              ['Real detail', summary.subScores.specificity, 'Names, numbers and examples'],
              ['Genuine student', summary.subScores.genuineIntent, 'How real your answers sounded'],
              ['Behaviour', summary.subScores.interviewBehaviour, 'How you followed the rules'],
            ] as [string, number | null, string][]
          ).map(([label, value, hint]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              {value === null ? (
                <p className="text-base font-bold leading-tight text-slate-400">Not assessed</p>
              ) : (
                <p className="text-2xl font-black text-ink">{value}%</p>
              )}
              <p className="text-sm font-semibold text-ink">{label}</p>
              <p className="mt-0.5 text-xs leading-snug text-slate-500">
                {value === null ? 'We could not hear you' : hint}
              </p>
            </div>
          ))}
        </section>

        {/* ---------- Behaviour table ---------- */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-bold text-ink">How you behaved in the interview</h2>
            <p className="text-sm text-slate-600">These are the same things a real interviewer watches.</p>
          </div>
          {/* B27: at 360px this table pushed the whole page wider than the
              screen. Scrolling the table beats scrolling the page sideways. */}
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-semibold">What we checked</th>
                <th className="px-3 py-2.5 font-semibold">Result</th>
                <th className="px-5 py-2.5 font-semibold">What this means</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-5 py-3 font-semibold text-ink">Questions answered</td>
                <td className="px-3 py-3 font-bold tabular-nums">
                  {summary.answeredCount}/{summary.totalCount}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {summary.answeredCount === summary.totalCount
                    ? 'You answered everything. Well done.'
                    : 'Try to answer every question next time, even if you are unsure.'}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-semibold text-ink">Rule problems</td>
                <td className="px-3 py-3 font-bold tabular-nums">{summary.violationCount}</td>
                <td className="px-5 py-3 text-slate-600">
                  {summary.violationCount === 0
                    ? 'No problems at all. Exactly right.'
                    : summary.violationCount < 5
                      ? 'A few small problems. Read them below.'
                      : 'Too many problems. A real interviewer would notice this.'}
                </td>
              </tr>
              {[...flagCounts.entries()].map(([type, count]) => (
                <tr key={type}>
                  <td className="px-5 py-3 text-slate-700">{FLAG_META[type].label}</td>
                  <td className="px-3 py-3 font-bold tabular-nums">{count}</td>
                  <td className="px-5 py-3 text-slate-600">{FLAG_META[type].studentMessage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        {/* ---------- What went well ---------- */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="mb-2 font-bold text-emerald-900">What you did well</h2>
          <ul className="space-y-1.5">
            {summary.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-emerald-900">
                <span className="font-bold">✓</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Per question ---------- */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl text-ink">Every question, one by one</h2>

          {session.answers.map((a) => {
            const base = getQuestion(a.questionId);
            if (!base) return null;
            const q = resolvedQuestion(base, institution);
            const ev = a.evaluation;

            return (
              <article
                key={`${a.questionId}-${a.attemptNumber}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="border-b border-slate-100 p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Question {a.orderIndex + 1}
                    </span>
                    <span className="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                      {CATEGORY_LABEL[q.category]}
                    </span>
                    {/* D-27. A per-question "Almost ready · 75%" badge is the same
                        claim as the headline, made twelve more times. Withheld
                        for sample answers. */}
                    {ev && isDemoTranscript(a.transcript) ? (
                      <span className="rounded-md bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">
                        Sample answer, not scored
                      </span>
                    ) : ev ? (
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                          ev.score >= 65
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.score >= 40
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {BAND_LABEL[ev.band]} · {ev.score}%
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-serif text-lg leading-snug text-ink">{q.text}</h3>
                </div>

                <div className="p-5">
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    What you said
                  </p>

                  {a.transcriptStatus === 'ok' ? (
                    <blockquote className="mb-5 rounded-xl bg-slate-50 p-4 leading-relaxed text-slate-800">
                      {a.transcript}
                    </blockquote>
                  ) : (
                    /* No transcript, so no score. This is the whole product. */
                    <div className="mb-5 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                      <p className="font-semibold text-amber-900">
                        We could not hear this answer, so we did not score it
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                        Giving you a number for an answer we never heard would be dishonest. Practise
                        this question again with your microphone closer to you.
                      </p>
                    </div>
                  )}

                  {/* PEE plus wrap-up, the same four steps shown while answering */}
                  {ev && (
                    <div className="mb-5 rounded-xl border border-slate-200 p-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Did your answer have all four parts?
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {PEE_STEPS.map((s) => {
                          const done = ev.pee?.[s.key] ?? false;
                          return (
                            <div
                              key={s.label}
                              className={`rounded-lg px-3 py-2.5 text-center ${
                                done ? 'bg-emerald-50' : 'bg-red-50'
                              }`}
                            >
                              <span
                                className={`mx-auto mb-1 grid h-7 w-7 place-items-center rounded-md text-sm font-black text-white ${
                                  done ? 'bg-emerald-600' : 'bg-red-400'
                                }`}
                              >
                                {s.letter}
                              </span>
                              <p
                                className={`text-sm font-bold ${
                                  done ? 'text-emerald-800' : 'text-red-800'
                                }`}
                              >
                                {s.label}
                              </p>
                              <p
                                className={`text-[11px] ${
                                  done ? 'text-emerald-700' : 'text-red-700'
                                }`}
                              >
                                {done ? 'Yes' : 'Missing'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      {ev.pee && !ev.pee.explanation && (
                        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                          Explanation is the step most students miss. Saying a fact is not enough.
                          You must say why that fact matters to you.
                        </p>
                      )}
                    </div>
                  )}

                  {ev && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          What the interviewer noticed
                        </p>
                        {ev.quotedBack && (
                          <p className="mb-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
                            You said: “{ev.quotedBack}”
                          </p>
                        )}
                        {ev.whatWentWell && (
                          <p className="mb-2 text-sm leading-relaxed text-emerald-800">
                            {ev.whatWentWell}
                          </p>
                        )}
                        {ev.soundsMemorised && (
                          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                            This sounded learned by heart. A real interviewer will change the words
                            of the question to test you.
                          </p>
                        )}
                        <ul className="space-y-1.5">
                          {ev.fixes.map((f) => (
                            <li key={f} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                              <span className="font-bold text-slate-400">→</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          A better way to say it
                        </p>
                        <div className="rounded-xl border border-slate-200 p-4">
                          <p className="text-sm italic leading-relaxed text-slate-700">
                            {ev.modelAnswer}
                          </p>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          This is a shape to follow with your own true details. Do not memorise it
                          word for word, because that is exactly what the interviewer is trained to
                          spot.
                        </p>
                        {ev.nepaliHint && (
                          <p className="mt-3 rounded-lg bg-ink px-4 py-3 text-sm leading-relaxed text-white">
                            {ev.nepaliHint}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {/* ---------- Next steps ---------- */}
        <section className="rounded-2xl border-2 border-ink bg-white p-6">
          <h2 className="mb-3 font-bold text-ink">What to do next</h2>
          <ul className="mb-5 space-y-2">
            {summary.nextSteps.map((s) => (
              <li key={s} className="flex gap-2 leading-relaxed text-slate-700">
                <span className="font-bold text-slate-400">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>

          {summary.weakestCategories.length > 0 && (
            <>
              <p className="mb-2 text-sm font-semibold text-slate-600">Your weakest areas</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {summary.weakestCategories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-amber-50 px-3.5 py-1.5 text-sm font-semibold text-amber-800"
                  >
                    {CATEGORY_LABEL[c]}
                  </span>
                ))}
              </div>
            </>
          )}

          <Link
            href="/universities"
            className="flex w-full items-center justify-center rounded-xl bg-ink px-6 py-4 text-lg font-bold text-white"
          >
            Practise again
          </Link>
        </section>

        {/* Asked only after the student has seen their results, never on arrival. */}
        <InstallPrompt show />

        <p className="px-2 text-center text-xs leading-relaxed text-slate-400">
          This is practice feedback only. It is not immigration advice and it does not predict your
          real result. Always check official facts with your university and a licensed adviser.
        </p>
        {/* LIVE-004: a whole audit round was spent on a stale deployment
            because nothing proved which revision was live. */}
        <p className="px-2 text-center text-[10px] text-slate-300">build {BUILD_INFO.shortSha}</p>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
