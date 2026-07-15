/**
 * Contract every payment provider implementation must satisfy so
 * services/payment.service.js and the webhook handler can stay provider-agnostic.
 *
 * createOrder({ amount, currency, receipt }) => Promise<{ providerOrderId: string }>
 *
 * verifyWebhookSignature(rawBody: Buffer, signatureHeader: string) => boolean
 *   rawBody is the *unparsed* request body — signature verification requires the
 *   exact bytes the provider signed, not a re-serialized JSON.parse(...) copy.
 *
 * parseWebhookEvent(rawBody: Buffer) => { providerOrderId, providerPaymentId, status }
 *   status is normalized to "paid" | "failed".
 */
