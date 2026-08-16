import type { ZodError } from 'zod';

/**
 * D-22. Turn a Zod failure into a sentence that names the field and the limit.
 *
 * Every route answered any validation failure with the same six words,
 * "Something went wrong.", carrying no field and no number. Four different
 * fields were confirmed doing it: 99 approval hours against a maximum of 72,
 * 0 hours against a minimum of 1, a 5 minute offer window against a floor of
 * 15, and a three word question against a minimum of 10 characters.
 *
 * It is not only unhelpful, it actively HID a critical defect. The QR upload
 * (D-11) failed this way every time, so the client saw "Something went wrong."
 * and had no way to discover that the real cause was a 400 KB image being
 * pushed into a field capped at 500 characters. A generic error is not a small
 * UX problem; it is a defect that conceals other defects.
 */
export function zodMessage(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return 'Please check the details you entered.';

  // "payQrImageUrl" -> "pay qr image url". Good enough to identify the field
  // without shipping a translation table that will drift from the schema.
  const field = issue.path
    .filter((p) => typeof p === 'string')
    .join(' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

  const where = field && field !== 'action' ? `"${field}"` : 'one of the fields';

  switch (issue.code) {
    case 'too_big': {
      const max = (issue as { maximum?: number | bigint }).maximum;
      const type = (issue as { type?: string }).type;
      return type === 'string'
        ? `${where} is too long. The most you can use is ${max} characters.`
        : `${where} is too high. The most you can use is ${max}.`;
    }
    case 'too_small': {
      const min = (issue as { minimum?: number | bigint }).minimum;
      const type = (issue as { type?: string }).type;
      return type === 'string'
        ? `${where} is too short. It needs at least ${min} characters.`
        : `${where} is too low. The least you can use is ${min}.`;
    }
    case 'invalid_type':
      return `${where} is missing, or is not the right kind of value.`;
    default:
      // A refine() carries its own written message, which is always better
      // than anything generated here.
      return issue.message || `Please check ${where}.`;
  }
}
