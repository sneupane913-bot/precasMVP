'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Page, Card, Button, Field, Input, Select, Banner } from '@/components/ui';

/**
 * N-30. THE FIRST SCREEN AFTER GOOGLE SIGN-IN.
 *
 * WHY IT EXISTS
 * -------------
 * Ten free questions cost us real money. Google sign-in cannot stop one person
 * taking them again from a second Gmail, and a student with three addresses is
 * thirty questions we pay for and never sell. An email is free and unlimited.
 * A Nepali mobile number is neither.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not verify anything and it does not block anyone. Nobody is turned
 * away here. The number is RECORDED, so `/super` can show the owner three
 * accounts sharing one number and let a person decide what to do about it.
 *
 * ON THE WORDING, AND THIS WAS A DELIBERATE DEPARTURE FROM WHAT WAS ASKED
 * ----------------------------------------------------------------------
 * The request was to imply the number would be verified, without ever
 * verifying it, so students feel obliged to give a real one.
 *
 * The screen does not say that, because it would be a plain lie to a student
 * on the first screen of a product whose whole pitch is that it tells them the
 * truth when its competitor does not. It is also the kind of lie that gets
 * found out immediately: the second Gmail account proves no message ever comes.
 *
 * What it says instead is TRUE and does the same work. Support here really is
 * WhatsApp. Payment problems really are sorted out over WhatsApp. A student
 * who types a fake number really will lose their report if a payment fails.
 * Saying that plainly creates the same reason to type a real number, and it
 * survives being checked.
 */
export default function WelcomePage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/universities';

  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [level, setLevel] = useState('');
  const [targetUniversity, setTargetUniversity] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = whatsapp.replace(/\D/g, '').replace(/^0+/, '');
  const numberLooksRight = /^(?:977)?9[678]\d{8}$/.test(digits);
  const nameLooksRight = fullName.trim().length >= 2;
  const canSubmit = nameLooksRight && numberLooksRight && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/student/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          whatsappNumber: digits,
          level: level || null,
          targetUniversity: targetUniversity.trim() || null,
          city: city.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.userMessage ?? 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      router.push(next);
    } catch {
      setError('Your connection dropped. Please try again.');
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="mx-auto max-w-lg py-10">
        <p className="text-sm font-semibold text-accent">Step 1 of 1</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">
          Two details, then your 10 free questions
        </h1>
        <p className="mt-3 text-ink-soft">
          Nothing to pay and nothing to set up. We just need to know who you are and where to
          reach you.
        </p>

        <Card className="mt-6">
          <form onSubmit={submit} className="flex flex-col gap-5">
            <Field
              label="Your full name"
              id="fullName"
              hint="As it appears on your passport, so your report matches your documents."
            >
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Adhikari"
                autoComplete="name"
                required
              />
            </Field>

            <Field
              label="Your WhatsApp number"
              id="whatsapp"
              hint="This is how we reach you. Your payment confirmation and any help with your report go to this number, so please use the one you actually use on WhatsApp."
            >
              <div className="flex items-center gap-2">
                <span className="rounded-control border border-line bg-surface-sunk px-3 py-3 text-sm font-medium text-ink-soft">
                  +977
                </span>
                <Input
                  id="whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="98XXXXXXXX"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />
              </div>
              {whatsapp.length > 0 && !numberLooksRight && (
                <p className="mt-2 text-sm text-warn">
                  Nepali mobile numbers start 98, 97 or 96 and have ten digits.
                </p>
              )}
            </Field>

            <Field label="What are you applying for?"
              id="level" hint="This changes how your answers are marked.">
              <Select id="level" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Choose one</option>
                <option value="bachelor">Bachelor&apos;s degree</option>
                <option value="masters">Master&apos;s degree</option>
              </Select>
            </Field>

            <Field
              label="Which university have you applied to?"
              id="targetUniversity"
              hint="Optional. It lets us give you that university's paper instead of the general one."
            >
              <Input
                id="targetUniversity"
                value={targetUniversity}
                onChange={(e) => setTargetUniversity(e.target.value)}
                placeholder="For example, BPP University"
              />
            </Field>

            <Field label="Which city are you in?"
              id="city" hint="Optional.">
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Kathmandu"
              />
            </Field>

            {error && <Banner tone="warn" title="We could not save that">{error}</Banner>}

            <Button type="submit" disabled={!canSubmit} className="w-full">
              {busy ? 'Saving...' : 'Start my 10 free questions'}
            </Button>

            <p className="text-center text-xs text-ink-soft">
              We never share your number, and we do not send marketing messages.
            </p>
          </form>
        </Card>
      </div>
    </Page>
  );
}
