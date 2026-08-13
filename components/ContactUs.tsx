/**
 * The one way we offer contact, used everywhere we offer it.
 *
 * ---------------------------------------------------------------------------
 * WHAT WENT WRONG, 14 Aug
 *
 * The client tapped "Message us on WhatsApp" after paying. WhatsApp opened —
 * good — but with no prefilled message, and nowhere on the page was the number
 * itself written down. So if WhatsApp had not opened, or had opened the wrong
 * account, or he simply wanted to RING us, there was nothing to work with. A
 * button is not a contact detail. A button is a bet that one app on one phone
 * behaves.
 *
 * (The missing prefill is very likely because he was messaging his own number:
 * wa.me does not prefill a chat with yourself in every client. That is not
 * something we can fix, and it is a good reason not to depend on the prefill.)
 *
 * On top of that, the "we are already checking your payment" screen offered no
 * way out at all — a student who has sent real money and heard nothing has one
 * question, "who do I call", and the screen did not answer it.
 * ---------------------------------------------------------------------------
 *
 * So this always shows THREE things: the WhatsApp mark, a WhatsApp button with
 * the message prewritten where we can, and **the number as readable text that
 * can be dialled or copied**. Never fewer.
 *
 * The number comes from platform settings, which the super admin edits with no
 * deploy, because it will be replaced by a sales number.
 */
export function ContactUs({
  whatsapp,
  message,
  urgent = false,
  className = '',
}: {
  /** From PlatformSettings.supportWhatsapp. Empty means unset. */
  whatsapp: string | null | undefined;
  /** Prewritten so a frightened student never composes English on a phone. */
  message?: string;
  /** Adds the "if this is urgent" framing, for money-in-flight screens. */
  urgent?: boolean;
  className?: string;
}) {
  const digits = (whatsapp ?? '').replace(/\D/g, '');
  if (!digits) return null;

  // Grouped for reading aloud over a bad line, which is the situation this is
  // for. A 13-digit run of characters is not a number a frightened person can
  // read back.
  const pretty = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ${digits.slice(-10)}` : digits;

  return (
    <div className={`rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 ${className}`}>
      <div className="mb-3 flex items-center gap-2.5">
        <WhatsAppMark />
        <p className="font-bold text-ink">
          {urgent ? 'If this is urgent, reach us now' : 'Talk to a person'}
        </p>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-emerald-900">
        {urgent
          ? 'You do not have to wait. Message or call us and we will look at your payment straight away.'
          : 'A real person answers. Message us on WhatsApp, or call the number below.'}
      </p>

      <a
        href={`https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white transition active:scale-[0.98]"
      >
        <WhatsAppMark className="h-5 w-5" light />
        Message us on WhatsApp
      </a>

      {/* The number in plain, selectable, dialable text. This is the part that
          was missing, and it is the part that works when nothing else does. */}
      <p className="text-center text-sm text-emerald-900">
        Or call{' '}
        <a href={`tel:+${digits}`} className="font-mono font-bold text-ink underline underline-offset-2">
          {pretty}
        </a>
      </p>
    </div>
  );
}

/** The WhatsApp glyph, inline so it needs no network request and no CDN. */
export function WhatsAppMark({ className = 'h-6 w-6', light = false }: { className?: string; light?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill={light ? '#ffffff' : '#25D366'}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.26.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.21-8.25 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06a6.7 6.7 0 0 1-1.97-1.22 7.4 7.4 0 0 1-1.36-1.7c-.14-.25-.02-.38.11-.5.11-.12.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.34-.75-1.83-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.41.06-.63.29-.21.23-.81.79-.81 1.93s.83 2.24.95 2.4c.12.16 1.63 2.49 3.95 3.49.55.24.98.38 1.32.49.55.17 1.06.15 1.46.09.44-.07 1.35-.55 1.54-1.09.19-.53.19-.99.13-1.09-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}
