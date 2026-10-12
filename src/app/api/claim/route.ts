import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { generatePassSerial } from '@/lib/crypto';
import { createOrUpdateContact, withRetry } from '@/lib/ghl/client';
import {
  cleanName,
  isCrossSite,
  isUuid,
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
    const limited = limitByIp(req, 'claim', 5, TEN_MINUTES);
    if (limited) return limited;

    const body = await readJsonBody(req);
    if (!body) return jsonError('Invalid request', 400);

    const { spinId, smsConsent } = body;
    if (!isUuid(spinId) || typeof smsConsent !== 'boolean') {
      return jsonError('Missing or invalid fields', 400);
    }
    const name = cleanName(body.name);
    if (!name) return jsonError('Please enter your name.', 400);
    const phone = normalizePhone(body.phone, { usOnly: true });
    if (!phone) return jsonError('Please enter a valid 10-digit US phone number.', 400);

    const supabase = createServerClient();

    // Atomically mark the spin as claimed. Only one request can flip
    // claimed=false -> true, which prevents double-claiming via parallel requests.
    const { data: spin, error: claimError } = await supabase
      .from('spins')
      .update({ claimed: true })
      .eq('id', spinId)
      .eq('claimed', false)
      .select('id, restaurant_id, prize_percent')
      .maybeSingle();

    if (claimError) {
      console.error('Spin claim error:', claimError.message);
      return jsonError('Failed to claim reward', 500);
    }
    if (!spin) {
      const { data: existing } = await supabase.from('spins').select('id').eq('id', spinId).maybeSingle();
      return existing ? jsonError('Spin already claimed', 409) : jsonError('Spin not found', 404);
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('coupon_expiry_days')
      .eq('id', spin.restaurant_id)
      .maybeSingle();

    const expiryDays = restaurant?.coupon_expiry_days || 14;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    const nowIso = new Date().toISOString();

    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .insert({
        spin_id: spin.id,
        restaurant_id: spin.restaurant_id,
        guest_name: name,
        guest_phone: phone,
        sms_consent: smsConsent,
        consent_timestamp: smsConsent ? nowIso : null,
        consent_wording_version: CONSENT_WORDING_VERSION,
        prize_percent: spin.prize_percent,
        expires_at: expiresAt.toISOString(),
        pass_serial: generatePassSerial(),
      })
      .select('id, pass_serial, expires_at, prize_percent')
      .single();

    if (couponError || !coupon) {
      console.error('Coupon creation error:', couponError?.message);
      // Release the spin so the guest can retry.
      await supabase.from('spins').update({ claimed: false }).eq('id', spin.id);
      return jsonError('Failed to create coupon', 500);
    }

    // GHL integration — create/update contact (never blocks the claim).
    try {
      const ghlContactId = await withRetry(() =>
        createOrUpdateContact({
          firstName: name,
          phone,
          tags: smsConsent ? ['Spin-Win-Lead', 'SMS-Consent'] : ['Spin-Win-Lead'],
          customFields: {
            prize_won: `${spin.prize_percent}%`,
            spin_date: nowIso,
          },
        })
      );
      if (ghlContactId) {
        await supabase.from('coupons').update({ ghl_contact_id: ghlContactId }).eq('id', coupon.id);
      }
    } catch (ghlError) {
      console.error('GHL sync failed (non-blocking):', ghlError instanceof Error ? ghlError.message : ghlError);
    }

    return jsonOk({
      couponId: coupon.id,
      passSerial: coupon.pass_serial,
      expiresAt: coupon.expires_at,
      prize: coupon.prize_percent,
    });
  } catch (error) {
    console.error('Claim API error:', error instanceof Error ? error.message : error);
    return jsonError('Internal server error', 500);
  }
}
