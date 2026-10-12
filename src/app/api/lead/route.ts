import { NextRequest } from 'next/server';
import { createOrUpdateContact, withRetry } from '@/lib/ghl/client';
import { createServerClient } from '@/lib/supabase/client';
import { generatePassSerial } from '@/lib/crypto';
import {
  cleanName,
  isCrossSite,
  isPrize,
  jsonError,
  jsonOk,
  limitByIp,
  normalizePhone,
  readJsonBody,
} from '@/lib/security/request';
import { CONSENT_WORDING_VERSION } from '@/lib/legal';

export const runtime = 'nodejs';

const TEN_MINUTES = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    if (isCrossSite(req)) return jsonError('Forbidden', 403);
    const limited = limitByIp(req, 'lead', 5, TEN_MINUTES);
    if (limited) return limited;

    const body = await readJsonBody(req);
    if (!body) return jsonError('Invalid request', 400);

    // Honeypot: real visitors never see or fill this field. Pretend success for bots.
    if (typeof body.company === 'string' && body.company.trim() !== '') {
      return jsonOk({ success: true });
    }

    const name = cleanName(body.name);
    if (!name) return jsonError('Please enter your first name.', 400);

    const phone = normalizePhone(body.phone);
    if (!phone) return jsonError('Enter a valid phone number with 10–15 digits.', 400);

    // The client reports which reward the game revealed. Only the three
    // advertised rewards are accepted; anything else is rejected outright.
    const prize = Number(body.prize);
    if (!isPrize(prize)) return jsonError('Invalid reward', 400);

    const smsConsent = body.smsConsent === true;
    const nowIso = new Date().toISOString();

    // 1. Sync contact into GoHighLevel CRM (non-blocking for the guest).
    let ghlContactId: string | null = null;
    try {
      ghlContactId = await withRetry(() =>
        createOrUpdateContact({
          firstName: name,
          phone,
          tags: [
            'Amplyfy-Rewards',
            'Amplyfy-Microsite-Lead',
            `${prize}%-Off-First-Month`,
            ...(smsConsent ? ['SMS-Consent'] : []),
          ],
          customFields: {
            prize_won: `${prize}%`,
            offer: `${prize}% off your first month with us`,
            claim_timestamp: nowIso,
            source: 'Amplyfy Luxury Microsite',
          },
        })
      );
    } catch (err) {
      console.error('[API/Lead] GoHighLevel CRM sync failed:', err instanceof Error ? err.message : err);
    }

    // 2. Record the lead in Supabase (non-blocking for the guest).
    try {
      const supabase = createServerClient();
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', 'amplyfy')
        .maybeSingle();

      if (restaurant) {
        const { data: spin } = await supabase
          .from('spins')
          .insert({
            restaurant_id: restaurant.id,
            session_token: `lead-${crypto.randomUUID()}`,
            prize_percent: prize,
            claimed: true,
          })
          .select('id')
          .single();

        if (spin) {
          await supabase.from('coupons').insert({
            spin_id: spin.id,
            restaurant_id: restaurant.id,
            guest_name: name,
            guest_phone: phone,
            sms_consent: smsConsent,
            consent_timestamp: smsConsent ? nowIso : null,
            consent_wording_version: CONSENT_WORDING_VERSION,
            prize_percent: prize,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            ghl_contact_id: ghlContactId,
            pass_serial: generatePassSerial(),
          });
        }
      }
    } catch (err) {
      console.warn('[API/Lead] Supabase record skipped (non-blocking):', err instanceof Error ? err.message : err);
    }

    // Internal IDs and integration errors are intentionally not returned to the browser.
    return jsonOk({ success: true });
  } catch (err) {
    console.error('[API/Lead] Lead submission error:', err instanceof Error ? err.message : err);
    return jsonError('Internal server error', 500);
  }
}
