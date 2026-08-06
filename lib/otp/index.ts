/**
 * OTP provider interface.
 *
 * DEFERRED by decision 2026-08-05. Nepali SMS gateway merchant verification
 * takes days and must not block the MVP.
 *
 * Note the decision that stands regardless: the trial gate is keyed on a
 * verified PHONE NUMBER, not on an email address. Gmail is free and infinite.
 * A Nepali SIM is not. See docs/MVP_SPEC.md section 2.
 */

export interface OtpProvider {
  readonly name: string;
  send(phoneE164: string): Promise<{ ok: boolean; userMessage: string }>;
  verify(phoneE164: string, code: string): Promise<{ ok: boolean; userMessage: string }>;
}

class StubOtpProvider implements OtpProvider {
  readonly name = 'stub';

  async send(): Promise<{ ok: boolean; userMessage: string }> {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, userMessage: 'Sign in is not available yet. Please try again later.' };
    }
    return { ok: true, userMessage: 'Development mode: use code 000000.' };
  }

  async verify(_phone: string, code: string): Promise<{ ok: boolean; userMessage: string }> {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, userMessage: 'Sign in is not available yet.' };
    }
    return code === '000000'
      ? { ok: true, userMessage: '' }
      : { ok: false, userMessage: 'That code is not correct. In development the code is 000000.' };
  }
}

export function getOtpProvider(): OtpProvider {
  // TODO: return a SparrowSmsProvider when SMS_GATEWAY_TOKEN is set.
  return new StubOtpProvider();
}

/** Nepali mobile numbers: 10 digits beginning 97 or 98. */
export function isValidNepaliMobile(input: string): boolean {
  const digits = input.replace(/\D/g, '').replace(/^977/, '');
  return /^9[678]\d{8}$/.test(digits);
}

export function nepaliMobileError(input: string): string | null {
  const digits = input.replace(/\D/g, '').replace(/^977/, '');
  if (digits.length === 0) return 'Enter your mobile number.';
  if (digits.length < 10) return `Too short. A Nepali mobile number has 10 digits, you have ${digits.length}.`;
  if (digits.length > 10) return `Too long. A Nepali mobile number has 10 digits, you have ${digits.length}.`;
  if (!/^9[678]/.test(digits)) return 'A Nepali mobile number starts with 98, 97 or 96.';
  return null;
}
