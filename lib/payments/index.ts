/**
 * Payment provider interface.
 *
 * DEFERRED by decision 2026-08-05. eSewa and Khalti merchant approval in Nepal
 * takes days and must not block the MVP.
 *
 * The contract is defined here so that adding eSewa later is one new file
 * implementing PaymentProvider plus one environment variable. No business logic
 * outside this folder knows which provider is in use.
 */

export interface PaymentIntent {
  id: string;
  amountNpr: number;
  planCode: string;
  redirectUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  initiate(args: { planCode: string; amountNpr: number; userId: string }): Promise<PaymentIntent>;
  /** Must be idempotent by transaction id. A replayed webhook grants nothing twice. */
  verifyWebhook(payload: unknown, signature: string | null): Promise<{
    ok: boolean;
    transactionId: string;
    amountNpr: number;
  }>;
}

class StubProvider implements PaymentProvider {
  readonly name = 'stub';

  async initiate(args: { planCode: string; amountNpr: number }): Promise<PaymentIntent> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'No payment provider configured. Set ESEWA_MERCHANT_CODE or KHALTI_SECRET_KEY.'
      );
    }
    return {
      id: `stub_${Date.now()}`,
      amountNpr: args.amountNpr,
      planCode: args.planCode,
      redirectUrl: '/account?stub_payment=success',
    };
  }

  async verifyWebhook() {
    return { ok: false, transactionId: '', amountNpr: 0 };
  }
}

export function getPaymentProvider(): PaymentProvider {
  // TODO: return an EsewaProvider when ESEWA_MERCHANT_CODE is set,
  // or a KhaltiProvider when KHALTI_SECRET_KEY is set.
  return new StubProvider();
}

export function paymentsAreLive(): boolean {
  return Boolean(process.env.ESEWA_MERCHANT_CODE || process.env.KHALTI_SECRET_KEY);
}
