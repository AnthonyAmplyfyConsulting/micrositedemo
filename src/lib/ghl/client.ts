import 'server-only'

// GoHighLevel API Client
// Docs: https://highlevel.stoplight.io/docs/integrations

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const REQUEST_TIMEOUT_MS = 6000;

export interface GHLContactParams {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

interface GHLContactResponse {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    tags: string[];
  };
}

export class GHLError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'GHLError';
  }
  /** Network failures, timeouts, rate limits and 5xx responses are worth retrying. */
  get retryable() {
    return this.status === undefined || this.status === 429 || this.status >= 500;
  }
}

export const isGhlConfigured = () => Boolean(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);

async function ghlFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) throw new GHLError('GHL_API_KEY not configured', 0);

  let res: Response;
  try {
    res = await fetch(`${GHL_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
        ...((options.headers as Record<string, string>) || {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    throw new GHLError(`GHL request failed: ${err instanceof Error ? err.name : 'unknown'}`);
  }

  if (!res.ok) {
    // Log status only: GHL error bodies can echo back guest PII.
    console.error(`GHL API error ${res.status} on ${endpoint}`);
    throw new GHLError(`GHL API error: ${res.status}`, res.status);
  }
  return res;
}

/**
 * Create or update a contact in GoHighLevel.
 * Uses the upsert endpoint — if a contact with the same phone exists, it updates.
 * Returns null when GHL isn't configured; throws GHLError on failure.
 */
export async function createOrUpdateContact(params: GHLContactParams): Promise<string | null> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!isGhlConfigured() || !locationId) {
    console.warn('GoHighLevel not configured, skipping contact sync');
    return null;
  }

  const res = await ghlFetch('/contacts/upsert', {
    method: 'POST',
    body: JSON.stringify({
      locationId,
      firstName: params.firstName,
      ...(params.lastName ? { lastName: params.lastName } : {}),
      phone: params.phone,
      ...(params.email ? { email: params.email } : {}),
      tags: params.tags || [],
      source: 'Amplyfy Spin-to-Win',
      customFields: params.customFields
        ? Object.entries(params.customFields).map(([key, value]) => ({ key, field_value: value }))
        : [],
    }),
  });

  const data = (await res.json()) as GHLContactResponse;
  return data?.contact?.id ?? null;
}

/**
 * Retry wrapper with exponential backoff. Only retries errors that can succeed
 * on a second attempt (timeouts, 429, 5xx) — never bad requests or auth errors.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 500): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const retryable = error instanceof GHLError ? error.retryable : true;
      if (!retryable || attempt >= maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelay * 2 ** attempt));
    }
  }
}
