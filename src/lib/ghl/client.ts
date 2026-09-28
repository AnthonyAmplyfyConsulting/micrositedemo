// GoHighLevel API Client
// Docs: https://highlevel.stoplight.io/docs/integrations

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

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

async function ghlFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey) {
    console.warn('GHL_API_KEY not configured, skipping GHL integration');
    throw new Error('GHL_API_KEY not configured');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28',
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${GHL_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`GHL API error ${res.status}: ${body}`);
    throw new Error(`GHL API error: ${res.status}`);
  }

  return res;
}

/**
 * Create or update a contact in GoHighLevel.
 * Uses the upsert endpoint — if a contact with the same phone exists, it updates.
 */
export async function createOrUpdateContact(
  params: GHLContactParams
): Promise<string | null> {
  const locationId = process.env.GHL_LOCATION_ID;

  if (!locationId) {
    console.warn('GHL_LOCATION_ID not set, skipping contact creation');
    return null;
  }

  try {
    const res = await ghlFetch('/contacts/upsert', {
      method: 'POST',
      body: JSON.stringify({
        locationId,
        firstName: params.firstName,
        lastName: params.lastName || '',
        phone: params.phone,
        email: params.email || '',
        tags: params.tags || [],
        source: 'Amplyfy Spin-to-Win',
        customFields: params.customFields ? 
          Object.entries(params.customFields).map(([key, value]) => ({
            key,
            field_value: value,
          })) : [],
      }),
    });

    const data = await res.json() as GHLContactResponse;
    console.log(`GHL contact upserted: ${data.contact.id}`);
    return data.contact.id;
  } catch (error) {
    console.error('Failed to create/update GHL contact:', error);
    return null;
  }
}

/**
 * Add a tag to an existing contact.
 */
export async function addContactTag(
  contactId: string,
  tag: string
): Promise<boolean> {
  const locationId = process.env.GHL_LOCATION_ID;

  if (!locationId || !contactId) {
    console.warn('Missing locationId or contactId for tag addition');
    return false;
  }

  try {
    await ghlFetch(`/contacts/${contactId}/tags`, {
      method: 'POST',
      body: JSON.stringify({
        tags: [tag],
      }),
    });

    console.log(`GHL tag "${tag}" added to contact ${contactId}`);
    return true;
  } catch (error) {
    console.error(`Failed to add tag "${tag}" to contact ${contactId}:`, error);
    return false;
  }
}

/**
 * Retry wrapper with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}
