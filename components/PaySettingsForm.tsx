'use client';

import { useEffect, useState } from 'react';

export interface PaySettings {
  payQrImageUrl: string;
  payWalletName: string;
  payWalletNumber: string;
  payAccountName: string;
  supportWhatsapp: string;
}

/**
 * The super admin's control over the QR, the wallet and the support number.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHY IT DID NOT
 *
 * `setPaymentSettings` has worked in `/api/super` since the day it was written,
 * and `PlatformSettings` has held every one of these fields. **There was no
 * form anywhere that called it.** So the QR, the wallet number and the support
 * number could only be changed by editing env vars and redeploying — which is
 * precisely what N-10 and N-11 exist to prevent, and the client asked for it
 * twice before this got built.
 *
 * That is the third time in one night the pattern has appeared: the server did
 * the work and no screen ever used it. It is worth naming, because a green
 * suite will happily prove the endpoint works while the feature does not exist
 * to the only person who needs it.
 *
 * A wallet number that needs a code release is a number that will be wrong on
 * the day it matters most, while a student who has just sent real money is
 * trying to reach us.
 * ---------------------------------------------------------------------------
 *
 * The QR accepts a pasted URL **or** a file. A file is read in the browser and
 * stored as a data URL, so it needs no bucket, no upload endpoint and no
 * credentials — and it works identically on this Mac, on Netlify, and on the
 * VPS later. A QR PNG is tens of kilobytes, which a settings record carries
 * comfortably. Anything larger is refused rather than silently truncated.
 */
const MAX_QR_BYTES = 400 * 1024;

export function PaySettingsForm({
  initial,
  onSave,
  busy,
}: {
  initial: PaySettings;
  onSave: (next: PaySettings) => Promise<boolean>;
  busy: boolean;
}) {
  const [v, setV] = useState<PaySettings>(initial);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-seed when the dashboard reloads, so this never shows stale values.
  useEffect(() => setV(initial), [initial]);

  const set = (k: keyof PaySettings) => (e: { target: { value: string } }) => {
    setSaved(false);
    setV((p) => ({ ...p, [k]: e.target.value }));
  };

  async function pickFile(file: File | null) {
    setFileError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFileError('That is not an image. A QR is normally a PNG or a JPG.');
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      setFileError(
        `That image is ${Math.round(file.size / 1024)} KB, and the limit is ${MAX_QR_BYTES / 1024} KB. Take a screenshot of just the QR rather than the whole screen.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSaved(false);
      setV((p) => ({ ...p, payQrImageUrl: String(reader.result ?? '') }));
    };
    reader.onerror = () => setFileError('Could not read that file. Try a different one.');
    reader.readAsDataURL(file);
  }

  const field = 'w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink';
  const label = 'mb-1 block text-sm font-semibold text-ink';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 font-serif text-xl font-bold text-ink">Payment and support details</h2>
      <p className="mb-6 text-sm leading-relaxed text-slate-600">
        These appear on the checkout page. Changing them here takes effect immediately, with no
        deploy. A wallet number that needs a code release is a number that will be wrong on the day
        it matters most.
      </p>

      <div className="mb-6">
        <label className={label}>Payment QR</label>
        <p className="mb-3 text-sm text-slate-500">
          Upload the QR from your wallet app, or paste a link to it. Students see this first, before
          any of the fields asking what they paid.
        </p>

        {v.payQrImageUrl ? (
          <div className="mb-3 flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={v.payQrImageUrl}
              alt="Payment QR as students will see it"
              className="h-40 w-40 rounded-xl border-2 border-slate-200 bg-white object-contain p-2"
            />
            <div>
              {/* Shown, not hidden behind a save. An admin must be able to see
                  the QR is the RIGHT one before students are pointed at it. */}
              <p className="mb-2 text-sm font-semibold text-emerald-700">
                This is exactly what a student will see.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSaved(false);
                  setV((p) => ({ ...p, payQrImageUrl: '' }));
                }}
                className="rounded-lg border-2 border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700"
              >
                Remove it
              </button>
            </div>
          </div>
        ) : (
          <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            No QR is set, so checkout currently tells students to contact you on WhatsApp to pay.
            That works, but it costs you every sale where nobody replies quickly.
          </p>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => void pickFile(e.target.files?.[0] ?? null)}
          className="mb-2 block w-full text-sm text-slate-600"
        />
        {fileError && <p className="mb-2 text-sm font-medium text-red-600">{fileError}</p>}
        <input
          value={v.payQrImageUrl.startsWith('data:') ? '' : v.payQrImageUrl}
          onChange={set('payQrImageUrl')}
          placeholder="or paste a link, e.g. https://..."
          className={field}
        />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Wallet name</label>
          <input value={v.payWalletName} onChange={set('payWalletName')} placeholder="eSewa" className={field} />
        </div>
        <div>
          <label className={label}>Wallet number</label>
          <input value={v.payWalletNumber} onChange={set('payWalletNumber')} placeholder="98XXXXXXXX" className={field} />
        </div>
        <div>
          <label className={label}>Account name on the wallet</label>
          <input value={v.payAccountName} onChange={set('payAccountName')} placeholder="Umanga Niroula" className={field} />
        </div>
        <div>
          <label className={label}>Support WhatsApp number</label>
          <input value={v.supportWhatsapp} onChange={set('supportWhatsapp')} placeholder="9779843805222" className={field} />
          {/* The client will move this to a sales number. Say so, so nobody
              assumes it is hard-wired to one person. */}
          <p className="mt-1 text-xs text-slate-500">
            Every WhatsApp link and every &ldquo;call us&rdquo; number in the product uses this.
            Change it here when the sales number takes over.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const ok = await onSave(v);
            setSaved(ok);
          }}
          className="rounded-xl bg-ink px-6 py-3 font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Save these details'}
        </button>
        {saved && <span className="font-semibold text-emerald-700">Saved. Students see this now.</span>}
      </div>
    </div>
  );
}
