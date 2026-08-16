'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooterView } from '@/components/SiteFooter';
import { useSupportNumber } from '@/lib/useSupportNumber';
import { publicInstitutions } from '@/lib/data/institutions';
import { CATEGORY_LABEL, type QuestionCategory } from '@/lib/types';

/**
 * D18 practice mode: one question at a time.
 *
 * A full mock is the exam and it is long. Practice is the drill you do in
 * between, and it exists because the fastest useful loop in this product is:
 * answer one question, hear what you actually said, say it better. A student
 * who has ten minutes will do this. They will not start a 30 minute mock.
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
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
        <h1 className="mb-2 text-center font-serif text-3xl font-bold text-ink sm:text-4xl">
          Practise one question
        </h1>
        <p className="mx-auto mb-10 max-w-lg text-center leading-relaxed text-slate-600">
          One question, answered out loud, with feedback on what you actually said. It takes about
          two minutes, so you can do it while you wait for a bus.
        </p>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-1 font-serif text-lg font-bold text-ink">
            What do you want to practise?
          </h2>
          <p className="mb-5 text-sm text-slate-600">
            Pick the one that worries you most, or let us choose.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('any')}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                category === 'any'
                  ? 'bg-emerald-400 text-ink'
                  : 'border border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              Anything
            </button>
            {DRILLABLE.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  category === c
                    ? 'bg-emerald-400 text-ink'
                    : 'border border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
            {error}
          </p>
        )}

        <button
          onClick={start}
          disabled={starting}
          className="w-full rounded-xl bg-ink px-6 py-4 text-lg font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {starting ? 'Starting...' : 'Start practising'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          This uses one practice question from your pack, not a full mock interview.
        </p>
      </main>
      <SiteFooterView whatsappDigits={supportNumber} />
    </>
  );
}
