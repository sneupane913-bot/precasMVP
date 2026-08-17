'use client';

import { useEffect, useState } from 'react';
import { PasscodeInput } from '@/components/PasscodeInput';
import {
  Page,
  Card,
  SectionTitle,
  Field,
  Input,
  Textarea,
  Button,
  Banner,
  Status,
  Spinner,
} from '@/components/ui';

/**
 * Owner control. Not linked from anywhere in the product.
 *
 * This is maintenance mode, the same switch every hosted product has. What is
 * unusual here is only who holds it: OWNER_ACCESS_KEY is a separate secret from
 * SUPER_ADMIN_PASSCODE, so a super admin can run the whole business and still
 * cannot reach this page or flip this switch.
 *
 * ON THE CONVERSION TO THE KIT: layout only. Both effects, `apply()`, the
 * confirm step and the audit list are unchanged.
 *
 * One thing the kit fixes for free. The live state used to be a sentence in
 * 13px grey at the very bottom of the page — the single most important fact on
 * a screen whose only job is "is the platform up?", placed where nobody looks.
 * It is now a `Status` at the TOP, which is a dot AND a word, because a colour
 * on its own would be D-32 all over again on the highest-stakes switch we own.
 */
export default function OwnerPage() {
  const [key, setKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('This service is temporarily unavailable');
  const [message, setMessage] = useState(
    'The platform is paused while a commercial matter is resolved. Students who have paid will not lose their credits. Please contact the number below for details.'
  );
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  /**
   * D-12 and D-13. Read the REAL state, and the saved message, on load.
   *
   * The status line said "Current state in this browser: ON. Reload to confirm
   * against the server." I reloaded, with the platform genuinely OFF, and it
   * still said ON: it was a client-side default that never asked anybody. The
   * sentence next to it promised the opposite of what it did.
   *
   * D-13 was worse in consequence. The contact name and number came back EMPTY
   * on every reload even though students were being shown them, so an owner who
   * reloaded and paused again without retyping would ship an emergency screen
   * with no phone number on it, which is the one thing that screen exists to
   * carry.
   */
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/platform');
        const json = await res.json();
        if (!json?.ok) return;
        setEnabled(Boolean(json.data.maintenanceMode));
        if (json.data.maintenanceMode) {
          if (json.data.maintenanceTitle) setTitle(json.data.maintenanceTitle);
          if (json.data.maintenanceMessage) setMessage(json.data.maintenanceMessage);
          if (json.data.contactName) setContactName(json.data.contactName);
          if (json.data.contactPhone) setContactPhone(json.data.contactPhone);
        }
      } catch {
        /* Leave the defaults rather than break the one page that turns it back on. */
      }
    })();
  }, []);

  /**
   * D-13. Once the owner has typed their key, load the saved contact details.
   *
   * The public read cannot include these while the platform is up, so this is
   * the only way the fields can be filled in before a pause rather than after.
   */
  useEffect(() => {
    if (key.trim().length < 4) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch('/api/platform', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getMaintenance', ownerKey: key }),
          });
          const json = await res.json();
          if (!json?.ok) return;
          setEnabled(Boolean(json.data.maintenanceMode));
          if (json.data.maintenanceTitle) setTitle(json.data.maintenanceTitle);
          if (json.data.maintenanceMessage) setMessage(json.data.maintenanceMessage);
          if (json.data.contactName) setContactName(json.data.contactName);
          if (json.data.contactPhone) setContactPhone(json.data.contactPhone);
        } catch {
          /* never block the page that turns the platform back on */
        }
      })();
      // Debounced, so typing a key does not spend the brute-force budget on
      // every keystroke.
    }, 800);
    return () => clearTimeout(t);
  }, [key]);
  // QA H3: the switch had no history. Every toggle is now recorded and shown.
  const [audit, setAudit] = useState<
    { at: string; action: string; ip: string; userAgent: string }[]
  >([]);

  async function apply(turnOn: boolean) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setMaintenance',
          ownerKey: key,
          enabled: turnOn,
          title,
          message,
          contactName,
          contactPhone,
        }),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            data: {
              maintenanceMode: boolean;
              ownerAudit?: { at: string; action: string; ip: string; userAgent: string }[];
            };
          }
        | { ok: false; error: { userMessage: string } };

      if (!json.ok) {
        setError(json.error.userMessage || 'That key was not accepted.');
      } else {
        setEnabled(json.data.maintenanceMode);
        setAudit(json.data.ownerAudit ?? []);
        setResult(
          json.data.maintenanceMode
            ? 'The platform is now OFF. Every student sees your message.'
            : 'The platform is back ON. Everything works normally.'
        );
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Page>
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
            Owner control
          </h1>
          <p className="text-ink-soft">
            This page is not linked from anywhere. Only your owner key opens it.
          </p>
          {/* The live state, first and stated in words. Read from the server,
              not from this browser — which is the whole of D-12. */}
          <Card tone={enabled ? 'stop' : 'go'} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <Status tone={enabled ? 'stop' : 'go'}>
              {enabled ? 'Platform is OFF for everyone' : 'Platform is ON and working normally'}
            </Status>
            <span className="text-micro text-ink-quiet">read from the server</span>
          </Card>
        </header>

        <Field label="Owner key" id="owner-key">
          <PasscodeInput
            value={key}
            onChange={setKey}
            placeholder="Your owner key"
            name="owner-key"
          />
        </Field>

        <Card className="flex flex-col gap-4">
          <div>
            <SectionTitle>Message students will see</SectionTitle>
            <p className="mt-3 text-sm text-ink-soft">
              Shown on every page while the platform is off.
            </p>
          </div>

          <Field label="Heading" id="maintenance-title">
            <Input
              id="maintenance-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label="Message" id="maintenance-message">
            <Textarea
              id="maintenance-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact name" id="contact-name">
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your name"
              />
            </Field>
            <Field label="Contact number" id="contact-phone">
              <Input
                id="contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="98XXXXXXXX"
              />
            </Field>
          </div>
        </Card>

        {error && <Banner tone="stop" title={error} />}
        {result && <Banner tone="go" title={result} />}

        {!confirming ? (
          <div className="flex flex-col gap-3">
            <Button variant="danger" onClick={() => setConfirming(true)} disabled={!key || busy} full>
              Turn the platform OFF
            </Button>
            <Button variant="tertiary" onClick={() => apply(false)} disabled={!key || busy} full>
              Turn the platform back ON
            </Button>
          </div>
        ) : (
          /* Not a modal. The client rejected dismissible popups outright, and a
             confirmation that appears in place is one a thumb is already near. */
          <Card tone="stop" className="flex flex-col gap-4">
            <div>
              <p className="font-serif text-lg font-bold text-stop">Turn the whole platform off?</p>
              <p className="mt-1 text-ink-soft">
                Every student, every consultancy, everyone. They will see your message and your
                phone number. You can turn it back on from this page at any time. Nothing is
                deleted.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="danger" onClick={() => apply(true)} disabled={busy} className="flex-1">
                {busy ? (
                  <>
                    <Spinner />
                    Working...
                  </>
                ) : (
                  'Yes, turn it off now'
                )}
              </Button>
              <Button variant="tertiary" onClick={() => setConfirming(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* QA H3: a switch whose stated purpose is a commercial dispute needs a
            record, because later somebody will ask who paused it and when. */}
        {audit.length > 0 && (
          <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <header className="border-b border-line p-5">
              <h2 className="font-serif text-title font-semibold text-ink">History of this switch</h2>
              <p className="text-sm text-ink-soft">Newest first. Kept as a record.</p>
            </header>
            <ul className="divide-y divide-line">
              {audit.map((a, i) => (
                <li key={`${a.at}-${i}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <Status tone={a.action === 'paused' ? 'stop' : 'go'}>
                    {a.action === 'paused' ? 'Platform paused' : 'Platform resumed'}
                  </Status>
                  <span className="text-sm text-ink-quiet">
                    {new Date(a.at).toLocaleString()} · {a.ip || 'unknown source'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Page>
  );
}
