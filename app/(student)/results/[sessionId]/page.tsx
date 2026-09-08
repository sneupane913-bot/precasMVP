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
import { BAND, Card, Chip, ButtonLink, Eyebrow, type Band } from '@/components/ui';

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
            <p className="text-sm text-ink-quiet">
              {institution.name}
              {session.completedAt
                ? ` · ${new Date(session.completedAt).toLocaleDateString()}`
                : ''}
            </p>
            <h1 className="font-serif text-display font-bold text-ink sm:text-4xl">
              Interview results
            </h1>
          </div>
          <Link
            href="/practice"
            className="rounded-control bg-ink px-5 py-3 text-sm font-bold text-white"
          >
            Practise your weakest answer
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
        {/* ---------- Verdict. Label first, number second. ---------- */}
        {/* ------------------------------------------------------------------
            THE BAND. The client asked for the report to be colour coded by
            section, and this is the anchor: the whole card takes the colour of
            the result, so the verdict is legible before a single word is read.

            The colour NEVER travels alone (D-9). The band word sits inside it
            at full size, so the card reads identically in greyscale and to a
            colour-blind student — which, for a report about their future, is
            not a detail.
            ------------------------------------------------------------------ */}
        <section
          className={`rounded-card border-2 p-6 text-center shadow-card ${
            summary.band ? BAND[summary.band as Band]?.shell ?? 'border-line bg-surface' : 'border-line bg-surface'
          }`}
        >
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
              <p className="mx-auto max-w-md leading-relaxed text-ink-soft">
                The answers shown below are <strong>sample text, not your voice</strong>, so there is
                no score and no judgement of your English anywhere on this page. Everything else here
                is real: the questions you were asked, how long you took, and how you behaved on
                camera.
              </p>
              <p className="mt-3 text-sm text-ink-quiet">
                You answered {summary.answeredCount} of {summary.totalCount} questions
              </p>
            </>
          ) : scored.length === 0 ? (
            <>
              <p className="mb-2 text-2xl font-bold text-ink">We could not score this attempt</p>
              <p className="mx-auto max-w-md leading-relaxed text-ink-soft">
                We did not hear enough of your answers to give you honest feedback. We will not give
                you a score for answers we could not hear. Please check your microphone and try
                again.
              </p>
            </>
          ) : (
            <>
              <p
                className={`font-serif text-[2.5rem] font-bold leading-none ${
                  BAND[summary.band as Band]?.text ?? 'text-ink'
                }`}
              >
                {BAND_LABEL[summary.band]}
              </p>
              <p className="mt-4 font-serif text-title leading-snug text-ink">
                {summary.headline}
              </p>
              <p className="mt-6 font-serif text-[3rem] font-bold leading-none text-ink">
                {summary.overallScore}%
              </p>
              {/* ------------------------------------------------------------
                  D-34. THE GAUGE, WITH A MARKER ON IT.

                  The comment that used to sit here said the gauge "shows which
                  band the score sits in, so 62% reads as a position rather than
                  as a mark out of a hundred". It did not. It drew four coloured
                  zones and four labels and NOTHING that said where this
                  student's score fell, so the reader had to estimate their own
                  position by comparing a number above the bar with the widths
                  of four blocks below it.

                  That is the same shape as F-5 one layer down: the INTENT was
                  written into the file and mistaken for the thing being done.
                  The marker is what the comment was describing.

                  It carries its meaning three ways over, because this is the
                  single sentence a frightened student takes away: a position on
                  the bar, the band's name written under it, and an aria-label
                  that says the whole thing in one breath for anyone who cannot
                  see the bar at all. Colour is the fourth carrier, never the
                  first (D-9).
                  ------------------------------------------------------------ */}
              <div className="mx-auto mt-4 max-w-sm">
                <div
                  role="img"
                  aria-label={`Your score is ${summary.overallScore} per cent${
                    summary.band ? `, which is in the ${BAND_LABEL[summary.band]} band` : ''
                  }. The scale runs from At risk through Needs practice and Almost to Ready.`}
                >
                  <div className="relative">
                    <div className="flex h-2 overflow-hidden rounded-full">
                      <span className="w-1/4 bg-stop/40" />
                      <span className="w-1/4 bg-warn/40" />
                      <span className="w-1/4 bg-line-strong" />
                      <span className="w-1/4 bg-go/50" />
                    </div>
                    {/* Clamped so a 0 or a 100 still sits ON the bar rather than
                        half off the end of it. */}
                    <span
                      className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-ink ring-2 ring-surface"
                      style={{
                        left: `${Math.max(2, Math.min(98, summary.overallScore))}%`,
                      }}
                      aria-hidden
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-micro text-ink-quiet">
                    <span>At risk</span>
                    <span>Needs practice</span>
                    <span>Almost</span>
                    <span>Ready</span>
                  </div>
                  {/* The marker in words, directly under it, so the position is
                      never something the student has to measure. */}
                  {summary.band && (
                    <p className="mt-2 text-sm font-semibold text-ink">
                      That puts you in {BAND_LABEL[summary.band]}.
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm text-ink-quiet">
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
            <section className="rounded-card bg-ink p-6 text-white shadow-card md:p-8">
              <p className="text-micro font-bold uppercase tracking-[0.08em] text-go">
                Do this before your next interview
              </p>
              <h2 className="mb-2 mt-2 font-serif text-title font-bold">{weakest.label}</h2>
              <p className="mb-6 leading-relaxed text-white/80">{weakest.advice}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/practice" className="flex-1">
                  Practise this now
                </ButtonLink>
                <Link
                  href="/universities"
                  className="inline-flex min-h-tap flex-1 items-center justify-center rounded-control border border-white/25 px-5 py-3 text-base font-bold text-white transition-colors duration-tap ease-move hover:bg-surface/10"
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
            /* Each sub-score is banded on its OWN value, so a student can see
               at a glance WHICH part let them down rather than only the total.
               A null shows an em dash and the words "Not assessed" — never a
               zero, because zero is a judgement and null is the truth that we
               could not tell (G-1). */
            <div
              key={label}
              className={`overflow-hidden rounded-card border border-line bg-surface p-4 shadow-card border-l-4 ${
                value === null
                  ? 'border-l-line-strong'
                  : value >= 75
                    ? 'border-l-go'
                    : value >= 60
                      ? 'border-l-line-strong'
                      : value >= 45
                        ? 'border-l-warn'
                        : 'border-l-stop'
              }`}
            >
              {value === null ? (
                <p className="font-serif text-title font-bold leading-none text-ink-quiet">&mdash;</p>
              ) : (
                <p className="font-serif text-title font-bold leading-none text-ink">{value}%</p>
              )}
              <p className="mt-2 text-sm font-semibold text-ink">{label}</p>
              <p className="mt-0.5 text-micro leading-snug text-ink-quiet">
                {value === null ? 'Not assessed — we could not hear enough to judge this' : hint}
              </p>
            </div>
          ))}
        </section>

        {/* ---------- Behaviour table ---------- */}
        <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="border-b border-line p-5">
            <h2 className="font-bold text-ink">How you behaved in the interview</h2>
            <p className="text-sm text-ink-soft">These are the same things a real interviewer watches.</p>
          </div>
          {/* B27: at 360px this table pushed the whole page wider than the
              screen. Scrolling the table beats scrolling the page sideways. */}
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunk text-micro font-bold uppercase tracking-[0.08em] text-ink-quiet">
              <tr>
                <th className="px-5 py-2.5 font-semibold">What we checked</th>
                <th className="px-3 py-2.5 font-semibold">Result</th>
                <th className="px-5 py-2.5 font-semibold">What this means</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="px-5 py-3 font-semibold text-ink">Questions answered</td>
                <td className="px-3 py-3 font-bold tabular-nums">
                  {summary.answeredCount}/{summary.totalCount}
                </td>
                <td className="px-5 py-3 text-ink-soft">
                  {summary.answeredCount === summary.totalCount
                    ? 'You answered everything. Well done.'
                    : 'Try to answer every question next time, even if you are unsure.'}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-semibold text-ink">Rule problems</td>
                <td className="px-3 py-3 font-bold tabular-nums">{summary.violationCount}</td>
                <td className="px-5 py-3 text-ink-soft">
                  {summary.violationCount === 0
                    ? 'No problems at all. Exactly right.'
                    : summary.violationCount < 5
                      ? 'A few small problems. Read them below.'
                      : 'Too many problems. A real interviewer would notice this.'}
                </td>
              </tr>
              {[...flagCounts.entries()].map(([type, count]) => (
                <tr key={type}>
                  <td className="px-5 py-3 text-ink-soft">{FLAG_META[type].label}</td>
                  <td className="px-3 py-3 font-bold tabular-nums">{count}</td>
                  <td className="px-5 py-3 text-ink-soft">{FLAG_META[type].studentMessage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        {/* ---------- What went well ---------- */}
        <section className="rounded-card border border-go/30 bg-go-tint p-5">
          <h2 className="mb-2 font-bold text-go-dark">What you did well</h2>
          <ul className="space-y-1.5">
            {summary.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-go-dark">
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
                className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
              >
                <div className="border-b border-line p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-surface-sunk px-2.5 py-1 text-micro font-bold uppercase tracking-wide text-ink-soft">
                      Question {a.orderIndex + 1}
                    </span>
                    <span className="rounded-md bg-surface-sunk px-2.5 py-1 text-micro font-semibold text-ink-quiet">
                      {CATEGORY_LABEL[q.category]}
                    </span>
                    {/* D-27. A per-question "Almost ready · 75%" badge is the same
                        claim as the headline, made twelve more times. Withheld
                        for sample answers. */}
                    {ev && isDemoTranscript(a.transcript) ? (
                      <span className="rounded-md bg-violet-100 px-2.5 py-1 text-micro font-bold text-violet-800">
                        Sample answer, not scored
                      </span>
                    ) : ev ? (
                      <span
                        className={`rounded-md px-2.5 py-1 text-micro font-bold ${
                          ev.score >= 65
                            ? 'bg-go-tint text-go-dark'
                            : ev.score >= 40
                              ? 'bg-warn-tint text-warn'
                              : 'bg-stop-tint text-stop'
                        }`}
                      >
                        {BAND_LABEL[ev.band]} · {ev.score}%
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-serif text-lg leading-snug text-ink">{q.text}</h3>
                </div>

                <div className="p-5">
                  <p className="mb-1.5 text-micro font-bold uppercase tracking-wide text-ink-quiet">
                    What you said
                  </p>

                  {a.transcriptStatus === 'ok' ? (
                    <blockquote className="mb-5 rounded-control bg-surface-sunk p-4 leading-relaxed text-ink">
                      {a.transcript}
                    </blockquote>
                  ) : (
                    /* No transcript, so no score. This is the whole product. */
                    <div className="mb-5 rounded-control border-2 border-warn/40 bg-warn-tint p-4">
                      <p className="font-semibold text-warn">
                        We could not hear this answer, so we did not score it
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-warn/90">
                        Giving you a number for an answer we never heard would be dishonest. Practise
                        this question again with your microphone closer to you.
                      </p>
                    </div>
                  )}

                  {/* PEE plus wrap-up, the same four steps shown while answering */}
                  {ev && (
                    <div className="mb-5 rounded-control border border-line p-4">
                      <p className="mb-3 text-micro font-bold uppercase tracking-wide text-ink-quiet">
                        Did your answer have all four parts?
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {PEE_STEPS.map((s) => {
                          const done = ev.pee?.[s.key] ?? false;
                          return (
                            <div
                              key={s.label}
                              className={`rounded-control px-3 py-2.5 text-center ${
                                done ? 'bg-go-tint' : 'bg-stop-tint'
                              }`}
                            >
                              <span
                                className={`mx-auto mb-1 grid h-7 w-7 place-items-center rounded-md text-sm font-black text-white ${
                                  done ? 'bg-go' : 'bg-stop'
                                }`}
                              >
                                {s.letter}
                              </span>
                              <p
                                className={`text-sm font-bold ${
                                  done ? 'text-go-dark' : 'text-stop'
                                }`}
                              >
                                {s.label}
                              </p>
                              <p
                                className={`text-micro ${
                                  done ? 'text-go-dark' : 'text-stop'
                                }`}
                              >
                                {done ? 'Yes' : 'Missing'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      {ev.pee && !ev.pee.explanation && (
                        <p className="mt-3 rounded-control bg-warn-tint px-3 py-2 text-sm leading-relaxed text-warn">
                          Explanation is the step most students miss. Saying a fact is not enough.
                          You must say why that fact matters to you.
                        </p>
                      )}
                    </div>
                  )}

                  {ev && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-micro font-bold uppercase tracking-wide text-ink-quiet">
                          What the interviewer noticed
                        </p>
                        {ev.quotedBack && (
                          <p className="mb-2 rounded-control bg-surface-sunk px-3 py-2 text-sm text-brand-light">
                            You said: “{ev.quotedBack}”
                          </p>
                        )}
                        {ev.whatWentWell && (
                          <p className="mb-2 text-sm leading-relaxed text-go-dark">
                            {ev.whatWentWell}
                          </p>
                        )}
                        {ev.soundsMemorised && (
                          <p className="mb-2 rounded-control bg-warn-tint px-3 py-2 text-sm font-medium text-warn">
                            This sounded learned by heart. A real interviewer will change the words
                            of the question to test you.
                          </p>
                        )}
                        <ul className="space-y-1.5">
                          {ev.fixes.map((f) => (
                            <li key={f} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                              <span className="font-bold text-ink-quiet">→</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-2 text-micro font-bold uppercase tracking-wide text-ink-quiet">
                          A better way to say it
                        </p>
                        <div className="rounded-control border border-line p-4">
                          <p className="text-sm italic leading-relaxed text-ink-soft">
                            {ev.modelAnswer}
                          </p>
                        </div>
                        <p className="mt-2 text-micro leading-relaxed text-ink-quiet">
                          This is a shape to follow with your own true details. Do not memorise it
                          word for word, because that is exactly what the interviewer is trained to
                          spot.
                        </p>
                        {ev.nepaliHint && (
                          <p className="mt-3 rounded-control bg-ink px-4 py-3 text-sm leading-relaxed text-white">
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
        <section className="rounded-card border-2 border-ink bg-surface p-6">
          <h2 className="mb-3 font-bold text-ink">What to do next</h2>
          <ul className="mb-5 space-y-2">
            {summary.nextSteps.map((s) => (
              <li key={s} className="flex gap-2 leading-relaxed text-ink-soft">
                <span className="font-bold text-ink-quiet">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>

          {summary.weakestCategories.length > 0 && (
            <>
              <p className="mb-2 text-sm font-semibold text-ink-soft">Your weakest areas</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {summary.weakestCategories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-warn-tint px-3.5 py-1.5 text-sm font-semibold text-warn"
                  >
                    {CATEGORY_LABEL[c]}
                  </span>
                ))}
              </div>
            </>
          )}

          <Link
            href="/universities"
            className="flex w-full items-center justify-center rounded-control bg-ink px-6 py-4 text-lg font-bold text-white"
          >
            Practise again
          </Link>
        </section>

        {/* Asked only after the student has seen their results, never on arrival. */}
        <InstallPrompt show />

        <p className="px-2 text-center text-micro leading-relaxed text-ink-quiet">
          This is practice feedback only. It is not immigration advice and it does not predict your
          real result. Always check official facts with your university and a licensed adviser.
        </p>
        {/* LIVE-004: a whole audit round was spent on a stale deployment
            because nothing proved which revision was live. */}
        <p className="px-2 text-center text-micro text-ink-quiet">build {BUILD_INFO.shortSha}</p>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
