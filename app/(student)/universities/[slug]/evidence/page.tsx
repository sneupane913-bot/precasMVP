import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { headerSession } from '@/lib/auth/header-session';
import { Page, Card, Chip, ButtonLink, Eyebrow } from '@/components/ui';
import { getInstitution } from '@/lib/data/institutions';
import { eligiblePool, eligiblePoolFor, publicQuestion, primeExtraQuestions } from '@/lib/data/questions';
import { maintenanceFor, pounds, profileFor, UKVI_MAINTENANCE } from '@/lib/data/institution-facts';
import {
  evidenceFor,
  evidenceSummary,
  likelihoodFor,
  usesCasShield,
  LIKELIHOOD_LABEL,
  type Likelihood,
} from '@/lib/data/university-evidence';
import { CATEGORY_LABEL } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * THE EVIDENCE PAGE (Q-14).
 *
 * One page per university that shows exactly what its paper rests on: every
 * source we hold with its URL and date, the UKVI figure for that campus, and
 * every question in the bank with its likelihood level and reason for THIS
 * university. It exists so the client, a counsellor or a student can check
 * the claim "these questions are linked to your university" against the
 * research, line by line, instead of taking our word for it.
 *
 * A university we found nothing for says so at the top. It does not borrow
 * another university's evidence, and the general UK sources are labelled as
 * general.
 */
export default async function EvidencePage({ params }: { params: Promise<{ slug: string }> }) {
  await primeExtraQuestions();
  const { slug } = await params;
  const inst = getInstitution(slug);
  if (!inst) notFound();
  const headerState = await headerSession();

  const sources = evidenceFor(inst.id);
  const summary = evidenceSummary(inst);
  const band = maintenanceFor(inst);
  const shield = usesCasShield(inst.id);
  const profile = profileFor(inst.id);

  const inPaper = new Set(eligiblePoolFor(inst.id).map((q) => q.id));
  const rows = eligiblePool()
    .map((q) => ({ q: publicQuestion(q, inst), lk: likelihoodFor(q, inst), inPaper: inPaper.has(q.id) }))
    .sort((a, b) => order(a.lk.level) - order(b.lk.level));

  const counts: Record<Likelihood, number> = { very_likely: 0, likely: 0, possible: 0, general: 0 };
  for (const r of rows) counts[r.lk.level] += 1;

  return (
    <>
      <SiteHeader session={headerState} />
      <Page>
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Evidence</Eyebrow>
          <h1 className="mt-2 font-serif text-[2rem] font-bold leading-tight text-ink">
            What the {inst.shortName || inst.name} paper rests on
          </h1>
          <p className="mt-3 text-lg text-ink-soft">{summary.line}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Very likely" value={counts.very_likely} sub="on the university's own page" />
            <Stat label="Likely" value={counts.likely} sub="reported by its students" />
            <Stat label="Possible" value={counts.possible} sub="the university names the theme" />
          </div>

          <Card className="mt-6">
            <h2 className="font-serif text-xl text-ink">Facts every answer is checked against</h2>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li>
                Campus city: <strong className="text-ink">{inst.city}</strong>. For UKVI this counts as{' '}
                <strong className="text-ink">{band.band}</strong>.
              </li>
              <li>
                Living costs to show: <strong className="text-ink">{pounds(band.monthly)}</strong> a month for{' '}
                {band.months} months, {pounds(band.total)} in total.{' '}
                <a href={UKVI_MAINTENANCE.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  GOV.UK
                </a>
                , checked {UKVI_MAINTENANCE.checkedOn}.
              </li>
              {profile.map((f) => (
                <li key={f.text}>
                  {f.text[0]!.toUpperCase() + f.text.slice(1)}.{' '}
                  <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    source
                  </a>
                  , checked {f.checkedOn}.
                </li>
              ))}
              {profile.length === 0 && (
                <li>
                  We hold no verified facts about {inst.shortName || inst.name} beyond its city and band yet, so its
                  model answers keep an honest prompt where a fact would go.
                </li>
              )}
              {shield === true && (
                <li>
                  {inst.shortName || inst.name} runs its interview through Enroly CAS Shield: a recorded video
                  interview with questions drawn at random from themed banks, marked by the university's own
                  staff.
                </li>
              )}
            </ul>
          </Card>

          <section className="mt-8">
            <h2 className="font-serif text-xl text-ink">Sources</h2>
            {sources.length === 0 ? (
              <Card className="mt-3">
                <p className="text-ink-soft">
                  We searched for {inst.name}'s own interview guidance and for reports from its students on{' '}
                  {new Date().getFullYear() >= 2026 ? '7 September 2026' : 'the last sweep'} and found nothing that
                  names it. The paper uses the questions UK universities publish for the same interview, and each
                  question below links to the page it comes from.
                </p>
              </Card>
            ) : (
              <ul className="mt-3 space-y-3">
                {sources.map((s) => (
                  <Card key={s.url} as="li">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={s.tier === 'official' ? 'go' : 'info'}>
                        {s.tier === 'official' ? 'University page' : s.tier === 'student_report' ? 'Student report' : 'Consultancy'}
                      </Chip>
                      <span className="text-sm text-ink-quiet">checked {s.checkedOn}</span>
                      {!s.fetched && <span className="text-sm text-ink-quiet">(search snippet only)</span>}
                    </div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block font-semibold text-ink underline-offset-2 hover:underline"
                    >
                      {s.title}
                    </a>
                    <p className="mt-1 break-all text-sm text-ink-quiet">{s.url}</p>
                    {s.topics.length > 0 && (
                      <p className="mt-2 text-sm text-ink-soft">Covers: {s.topics.join('; ')}.</p>
                    )}
                    <p className="mt-2 text-sm text-ink-soft">
                      {s.questionIds.length} question{s.questionIds.length === 1 ? '' : 's'} in our bank
                      {s.unmapped && s.unmapped.length > 0
                        ? `, ${s.unmapped.length} more found that we have not added yet`
                        : ''}
                      .
                    </p>
                    {s.notes && <p className="mt-2 text-sm text-ink-quiet">{s.notes}</p>}
                  </Card>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="font-serif text-xl text-ink">Every question, with its likelihood here</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {counts.general > 0
                ? `${counts.general} questions rest on general UK evidence only. They are asked at ${inst.shortName || inst.name} only after a student has heard every question with evidence naming it.`
                : `Every question in the bank has evidence naming ${inst.shortName || inst.name}.`}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-micro uppercase tracking-wide text-ink-quiet">
                    <th className="py-2 pr-3">Likelihood</th>
                    <th className="py-2 pr-3">Question</th>
                    <th className="py-2">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ q, lk, inPaper: inThisPaper }) => (
                    <tr key={q.id} className={`border-b border-line align-top ${inThisPaper ? '' : 'opacity-60'}`}>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <Chip tone={lk.level === 'very_likely' ? 'go' : lk.level === 'likely' ? 'info' : lk.level === 'possible' ? 'neutral' : 'warn'}>
                          {LIKELIHOOD_LABEL[lk.level]}
                        </Chip>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="text-ink">{q.text}</span>
                        <span className="ml-2 text-ink-quiet">{CATEGORY_LABEL[q.category]}{q.isProbe ? ', follow-up' : ''}</span>
                      </td>
                      <td className="py-2 text-ink-soft">
                        {lk.reason}{' '}
                        <a href={lk.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          source
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/universities" variant="secondary">
              Back to universities
            </ButtonLink>
            <Link href="/universities" className="self-center text-sm text-ink-quiet underline-offset-2 hover:underline">
              Start the {inst.shortName || inst.name} interview from the list
            </Link>
          </div>
        </div>
      </Page>
      <SiteFooter />
    </>
  );
}

function order(level: Likelihood): number {
  return level === 'very_likely' ? 0 : level === 'likely' ? 1 : level === 'possible' ? 2 : 3;
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-control border border-line bg-surface-sunk px-4 py-3">
      <p className="text-micro uppercase tracking-wide text-ink-quiet">{label}</p>
      <p className="mt-0.5 font-serif text-2xl font-bold text-ink">{value}</p>
      <p className="text-sm text-ink-soft">{sub}</p>
    </div>
  );
}
