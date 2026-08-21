'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooterView } from '@/components/SiteFooter';
import { useSupportNumber } from '@/lib/useSupportNumber';
import { publicInstitutions } from '@/lib/data/institutions';
import { CATEGORY_LABEL, type QuestionCategory } from '@/lib/types';
import { Page, Card, SectionTitle, Pill, Button, Banner, Spinner } from '@/components/ui';

/**
 * D18 practice mode: one question at a time.
 *
 * A full mock is the exam and it is long. Practice is the drill you do in
 * between, and it exists because the fastest useful loop in this product is:
 * answer one question, hear what you actually said, say it better. A student
 * who has ten minutes will do this. They will not start a 30 minute mock.
 *
 * ON THE CONVERSION TO THE KIT: layout only. `start()` is untouched, including
 * the 401 branch that carries the student to sign-in and back again.
 */

// The themes worth drilling. Ordered by how often students actually struggle,
// not alphabetically.
const DRILLABLE: QuestionCategory[] = [
  'why_university',
  'why_course',
  'finance',
  'future_plans',
  'study_gap',
  'immigration',
  'education',
  'why_uk',
  'identity',
];

export default function PracticePage() {
  // D-1/D-2/D-4. The footer is sync now; the number comes from here.
  const supportNumber = useSupportNumber();
  const router = useRouter();
  const [category, setCategory] = useState<QuestionCategory | 'any'>('any');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Practice questions are the generic themes, so any institution works. We use
  // the first public one purely to satisfy the session's institution field.
  const institutionSlug = publicInstitutions()[0]?.slug ?? 'bpp-university';

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution: institutionSlug,
          mode: 'practice',
          ...(category === 'any' ? {} : { category }),
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        if (res.status === 401) {
          router.push('/start?next=/practice');
          return;
        }
        // N-30. No name or number on file: one short form, then back here.
        if (json.error.code === 'PROFILE_REQUIRED') {
          router.push(`/welcome?next=${encodeURIComponent('/practice')}`);
          return;
        }
        setError(json.error.userMessage);
        setStarting(false);
        return;
      }
      router.push(`/interview/${json.data.sessionId}`);
    } catch {
      setError('We could not start your practice. Check your connection and try again.');
      setStarting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <Page>
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-8">
          <header className="text-center">
            <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
              Practise one question
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-ink-soft">
              One question, answered out loud, with feedback on what you actually said. It takes
              about two minutes, so you can do it while you wait for a bus.
            </p>
          </header>

          <Card className="flex flex-col gap-4">
            <div>
              <SectionTitle>What do you want to practise?</SectionTitle>
              <p className="mt-3 text-sm text-ink-soft">
                Pick the one that worries you most, or let us choose.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill selected={category === 'any'} onClick={() => setCategory('any')}>
                Anything
              </Pill>
              {DRILLABLE.map((c) => (
                <Pill key={c} selected={category === c} onClick={() => setCategory(c)}>
                  {CATEGORY_LABEL[c]}
                </Pill>
              ))}
            </div>
          </Card>

          {error && <Banner tone="stop" title={error} />}

          {/* D-6. The primary action is the last thing on the page, so on a
              phone it lands in the thumb band rather than above the fold where
              a thumb has to stretch for it. */}
          <div className="flex flex-col gap-3">
            <Button onClick={start} disabled={starting} full>
              {starting ? (
                <>
                  <Spinner />
                  Starting...
                </>
              ) : (
                'Start practising'
              )}
            </Button>
            <p className="text-center text-sm text-ink-quiet">
              This uses one practice question from your pack, not a full mock interview.
            </p>
          </div>
        </div>
      </Page>
      <SiteFooterView whatsappDigits={supportNumber} />
    </>
  );
}
